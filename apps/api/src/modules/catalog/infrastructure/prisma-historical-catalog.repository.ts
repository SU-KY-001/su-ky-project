import {
  prisma,
  Prisma,
  type HistoricalPeriod,
  type HistoricalPhase,
  type HistoricalEntity,
} from "@repo/db";
import { HistoricalTimeSchema, toLegacyYearRange } from "@repo/shared";
import type {
  HistoricalCatalogRepository,
  HistoricalNodeKind,
  HistoricalNodeRecord,
  HistoricalNodeWrite,
  HistoricalNodeQuery,
  HistoricalNodeCounts,
} from "../domain/historical-catalog.repository";
import { DomainError } from "../../../core/errors/domain-error";
import { toSlug, randomSlugSuffix } from "../../../core/slug";
import { writeAudit } from "../../../core/audit";
import type {
  CitationOwner,
  HistoricalEvidenceRepository,
} from "../domain/historical-catalog.repository";
import { toSource } from "./prisma-catalog.repository";

export function jsonSnapshot(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(
    JSON.stringify(value, (_key, item: unknown) =>
      typeof item === "bigint" ? item.toString() : item,
    ),
  ) as Prisma.InputJsonValue;
}
export const PUBLIC_EVENT_FROM = Prisma.sql`FROM historical_entities e JOIN historical_phases ph ON ph.id=e.historical_phase_id JOIN historical_periods hp ON hp.id=ph.period_id`;
export const PUBLIC_EVENT_READY = Prisma.sql`e.entity_type='EVENT' AND e.deleted_at IS NULL AND ph.deleted_at IS NULL AND hp.deleted_at IS NULL AND ph.is_active AND hp.is_active AND e.review_status='APPROVED' AND e.reviewed_version=e.version AND trim(e.name)<>'' AND trim(COALESCE(e.summary,''))<>'' AND e.time->>'kind'<>'UNKNOWN' AND (e.time->>'kind'='POINT' OR e.time->'start'<>'null'::jsonb OR e.time->'end'<>'null'::jsonb) AND (NOT (COALESCE(e.time#>>'{at,approximate}','false')='true' OR COALESCE(e.time#>>'{start,approximate}','false')='true' OR COALESCE(e.time#>>'{end,approximate}','false')='true') OR trim(COALESCE(e.time->>'note',''))<>'') AND EXISTS(SELECT 1 FROM historical_citations c WHERE c.entity_id=e.id) AND NOT EXISTS(SELECT 1 FROM historical_citations c JOIN sources s ON s.id=c.source_id JOIN source_revisions r ON r.id=c.source_revision_id WHERE c.entity_id=e.id AND (trim(c.locator)='' OR s.archived_at IS NOT NULL OR s.verification_status<>'VERIFIED' OR s.version<>r.version OR s.verified_version IS DISTINCT FROM r.version))`;
export function nodeRecord(
  row: HistoricalPeriod | HistoricalPhase | HistoricalEntity,
): HistoricalNodeRecord {
  const entity = "entityType" in row ? row : null;
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    summary: row.summary,
    time: HistoricalTimeSchema.parse(row.time),
    startYear: row.startYear,
    endYear: row.endYear,
    version: row.version,
    createdById: row.createdById,
    updatedAt: row.updatedAt,
    deletedAt: row.deletedAt,
    isActive: "isActive" in row ? row.isActive : true,
    sortOrder: "sortOrder" in row ? row.sortOrder : 0,
    periodId: "periodId" in row ? row.periodId : null,
    historicalPhaseId: entity?.historicalPhaseId ?? null,
    entityType: entity?.entityType ?? null,
    aliases: entity?.aliases ?? [],
    reviewStatus: entity?.reviewStatus ?? "DRAFT",
    reviewedVersion: entity?.reviewedVersion ?? null,
    reviewedAt: entity?.reviewedAt ?? null,
    reviewNote: entity?.reviewNote ?? null,
  };
}
export async function saveEntityRevision(
  tx: Prisma.TransactionClient,
  id: string,
  actorId: string | null,
): Promise<void> {
  const entity = await tx.historicalEntity.findUniqueOrThrow({
    where: { id },
    include: { citations: { include: { sourceRevision: true } } },
  });
  await tx.historicalEntityRevision.create({
    data: {
      entityId: id,
      version: entity.version,
      snapshot: jsonSnapshot(entity),
      createdById: actorId,
    },
  });
}
export async function lockNode(
  tx: Prisma.TransactionClient,
  kind: HistoricalNodeKind,
  id: string,
): Promise<void> {
  const table =
    kind === "period"
      ? "historical_periods"
      : kind === "phase"
        ? "historical_phases"
        : "historical_entities";
  await tx.$queryRaw(
    Prisma.sql`SELECT id FROM ${Prisma.raw(table)} WHERE id=${id}::uuid FOR UPDATE`,
  );
}
export async function requireLiveParent(
  tx: Prisma.TransactionClient,
  kind: "period" | "phase",
  id: string,
  code: "VALIDATION_ERROR" | "PARENT_IN_TRASH" = "VALIDATION_ERROR",
): Promise<void> {
  await lockNode(tx, kind, id);
  if (kind === "period") {
    const p = await tx.historicalPeriod.findUnique({ where: { id } });
    if (!p || p.deletedAt || !p.isActive)
      throw new DomainError(
        code === "PARENT_IN_TRASH" ? 409 : 422,
        code,
        "Thời kỳ cha không hoạt động",
      );
  } else {
    const p = await tx.historicalPhase.findUnique({
      where: { id },
      include: { period: true },
    });
    if (p) await requireLiveParent(tx, "period", p.periodId, code);
    if (
      !p ||
      p.deletedAt ||
      !p.isActive ||
      p.period.deletedAt ||
      !p.period.isActive
    )
      throw new DomainError(
        code === "PARENT_IN_TRASH" ? 409 : 422,
        code,
        "Giai đoạn cha không hoạt động",
      );
  }
}
export class PrismaHistoricalCatalogRepository
  implements HistoricalEvidenceRepository
{
  async summary() {
    const [periods, phases, events, missingSources, ready] = await Promise.all([
      prisma.historicalPeriod.count({ where: { deletedAt: null } }),
      prisma.historicalPhase.count({ where: { deletedAt: null } }),
      prisma.historicalEntity.count({
        where: { entityType: "EVENT", deletedAt: null },
      }),
      prisma.historicalEntity.count({
        where: {
          entityType: "EVENT",
          deletedAt: null,
          citations: { none: {} },
        },
      }),
      prisma.$queryRaw<Array<{ count: bigint }>>(
        Prisma.sql`SELECT count(*) ${PUBLIC_EVENT_FROM} WHERE ${PUBLIC_EVENT_READY}`,
      ),
    ]);
    return {
      periods,
      phases,
      events,
      missingSources,
      readyForPodcast: Number(ready[0]!.count),
    };
  }
  async listPublicEvents(q: HistoricalNodeQuery & { slug?: string }) {
    const filter = Prisma.sql`${PUBLIC_EVENT_READY} ${q.slug ? Prisma.sql`AND e.slug=${q.slug}` : Prisma.empty} ${q.periodId ? Prisma.sql`AND hp.id=${q.periodId}::uuid` : Prisma.empty} ${q.historicalPhaseId ? Prisma.sql`AND e.historical_phase_id=${q.historicalPhaseId}::uuid` : Prisma.empty} ${q.q ? Prisma.sql`AND e.name ILIKE ${"%" + q.q + "%"}` : Prisma.empty}`;
    const [rows, count] = await Promise.all([
      prisma.$queryRaw<Array<{ id: string }>>(
        Prisma.sql`SELECT e.id ${PUBLIC_EVENT_FROM} WHERE ${filter} ORDER BY COALESCE(e.start_year, -999999) ASC, e.name ASC, e.id ASC LIMIT ${q.limit} OFFSET ${(q.page - 1) * q.limit}`,
      ),
      prisma.$queryRaw<Array<{ count: bigint }>>(
        Prisma.sql`SELECT count(*) ${PUBLIC_EVENT_FROM} WHERE ${filter}`,
      ),
    ]);
    return { ids: rows.map((r) => r.id), total: Number(count[0]!.count) };
  }
  async get(kind: HistoricalNodeKind, id: string) {
    const row =
      kind === "period"
        ? await prisma.historicalPeriod.findUnique({ where: { id } })
        : kind === "phase"
          ? await prisma.historicalPhase.findUnique({ where: { id } })
          : await prisma.historicalEntity.findUnique({ where: { id } });
    return row ? nodeRecord(row) : null;
  }
  async list(kind: HistoricalNodeKind, q: HistoricalNodeQuery) {
    const text = q.q
      ? { contains: q.q, mode: "insensitive" as const }
      : undefined;
    const common = { deletedAt: q.includeDeleted ? undefined : null };
    const skip = (q.page - 1) * q.limit;
    const take = q.limit;
    if (kind === "period") {
      const where = {
        ...common,
        ...(text
          ? {
              OR: [
                { name: text },
                {
                  phases: {
                    some: {
                      deletedAt: null,
                      OR: [
                        { name: text },
                        { entities: { some: { deletedAt: null, name: text } } },
                      ],
                    },
                  },
                },
              ],
            }
          : {}),
      };
      const [items, total] = await Promise.all([
        prisma.historicalPeriod.findMany({
          where,
          skip,
          take,
          orderBy: [
            { startYear: { sort: "asc", nulls: "last" } },
            { endYear: { sort: "asc", nulls: "last" } },
            { name: "asc" },
            { id: "asc" },
          ],
        }),
        prisma.historicalPeriod.count({ where }),
      ]);
      return { items: items.map(nodeRecord), total };
    }
    if (kind === "phase") {
      const where = {
        ...common,
        periodId: q.periodId,
        ...(text
          ? {
              OR: [
                { name: text },
                { entities: { some: { deletedAt: null, name: text } } },
              ],
            }
          : {}),
      };
      const [items, total] = await Promise.all([
        prisma.historicalPhase.findMany({
          where,
          skip,
          take,
          orderBy: [
            { startYear: { sort: "asc", nulls: "last" } },
            { endYear: { sort: "asc", nulls: "last" } },
            { name: "asc" },
            { id: "asc" },
          ],
        }),
        prisma.historicalPhase.count({ where }),
      ]);
      return { items: items.map(nodeRecord), total };
    }
    const where = {
      ...common,
      ...(text ? { name: text } : {}),
      historicalPhaseId: q.historicalPhaseId,
      entityType: q.type,
      reviewStatus: q.reviewStatus,
    };
    const [items, total] = await Promise.all([
      prisma.historicalEntity.findMany({
        where,
        skip,
        take,
        orderBy: [
          { startYear: { sort: "asc", nulls: "last" } },
          { endYear: { sort: "asc", nulls: "last" } },
          { name: "asc" },
          { id: "asc" },
        ],
      }),
      prisma.historicalEntity.count({ where }),
    ]);
    return { items: items.map(nodeRecord), total };
  }
  async create(
    kind: HistoricalNodeKind,
    actorId: string,
    input: HistoricalNodeWrite & {
      name: string;
      time: HistoricalNodeRecord["time"];
    },
  ) {
    return prisma
      .$transaction(async (tx) => {
        if (kind === "phase")
          await requireLiveParent(tx, "period", input.periodId!);
        if (kind === "entity" && input.historicalPhaseId)
          await requireLiveParent(tx, "phase", input.historicalPhaseId);
        const common = {
          name: input.name,
          slug: `${toSlug(input.name, 70)}-${randomSlugSuffix()}`,
          summary: input.summary,
          time: jsonSnapshot(input.time),
          ...toLegacyYearRange(
            input.time,
            kind === "entity" ? "CLOSED" : "HALF_OPEN",
          ),
          createdById: actorId,
        };
        const row =
          kind === "period"
            ? await tx.historicalPeriod.create({
                data: {
                  ...common,
                  isActive: input.isActive,
                  sortOrder: input.sortOrder,
                },
              })
            : kind === "phase"
              ? await tx.historicalPhase.create({
                  data: {
                    ...common,
                    periodId: input.periodId!,
                    isActive: input.isActive,
                    sortOrder: input.sortOrder,
                  },
                })
              : await tx.historicalEntity.create({
                  data: {
                    ...common,
                    entityType: input.entityType!,
                    historicalPhaseId: input.historicalPhaseId,
                    aliases: input.aliases,
                  },
                });
        if (kind === "entity") await saveEntityRevision(tx, row.id, actorId);
        await writeAudit(tx, {
          actorId,
          action: `historical.${kind}.created`,
          resourceType: kind,
          resourceId: row.id,
          changes: { after: jsonSnapshot(row) },
          ipAddress: null,
        });
        return nodeRecord(row);
      })
      .catch(catalogConflict);
  }
  async patch(
    kind: HistoricalNodeKind,
    id: string,
    actorId: string,
    baseVersion: number,
    input: HistoricalNodeWrite,
  ) {
    return prisma
      .$transaction(async (tx) => {
        await lockNode(tx, kind, id);
        if (kind === "phase" && input.periodId)
          await requireLiveParent(tx, "period", input.periodId);
        if (kind === "entity" && input.historicalPhaseId)
          await requireLiveParent(tx, "phase", input.historicalPhaseId);
        const common = {
          name: input.name,
          summary: input.summary,
          ...(input.time
            ? {
                time: jsonSnapshot(input.time),
                ...toLegacyYearRange(
                  input.time,
                  kind === "entity" ? "CLOSED" : "HALF_OPEN",
                ),
              }
            : {}),
          version: { increment: 1 },
        };
        const where = { id, version: baseVersion, deletedAt: null };
        const before =
          kind === "period"
            ? await tx.historicalPeriod.findUnique({ where: { id } })
            : kind === "phase"
              ? await tx.historicalPhase.findUnique({ where: { id } })
              : await tx.historicalEntity.findUnique({ where: { id } });
        if (before) {
          const current = nodeRecord(before);
          if (kind === "phase")
            await requireLiveParent(
              tx,
              "period",
              input.periodId ?? current.periodId!,
            );
          if (
            kind === "entity" &&
            (input.historicalPhaseId ?? current.historicalPhaseId)
          )
            await requireLiveParent(
              tx,
              "phase",
              input.historicalPhaseId ?? current.historicalPhaseId!,
            );
        }
        const updated =
          kind === "period"
            ? await tx.historicalPeriod.updateMany({
                where,
                data: {
                  ...common,
                  isActive: input.isActive,
                  sortOrder: input.sortOrder,
                },
              })
            : kind === "phase"
              ? await tx.historicalPhase.updateMany({
                  where,
                  data: {
                    ...common,
                    periodId: input.periodId,
                    isActive: input.isActive,
                    sortOrder: input.sortOrder,
                  },
                })
              : await tx.historicalEntity.updateMany({
                  where,
                  data: {
                    ...common,
                    aliases: input.aliases,
                    historicalPhaseId: input.historicalPhaseId,
                    reviewStatus: "DRAFT",
                    reviewedVersion: null,
                    reviewedAt: null,
                    reviewedById: null,
                    reviewNote: null,
                  },
                });
        if (updated.count !== 1)
          throw new DomainError(
            409,
            "STALE_WRITE",
            "Nội dung đã thay đổi; vui lòng tải lại",
          );
        const after =
          kind === "period"
            ? await tx.historicalPeriod.findUniqueOrThrow({ where: { id } })
            : kind === "phase"
              ? await tx.historicalPhase.findUniqueOrThrow({ where: { id } })
              : await tx.historicalEntity.findUniqueOrThrow({ where: { id } });
        if (kind === "entity") await saveEntityRevision(tx, id, actorId);
        await writeAudit(tx, {
          actorId,
          action: `historical.${kind}.updated`,
          resourceType: kind,
          resourceId: id,
          changes: { before: jsonSnapshot(before), after: jsonSnapshot(after) },
          ipAddress: null,
        });
        return nodeRecord(after);
      })
      .catch(catalogConflict);
  }
  async setDeleted(
    kind: HistoricalNodeKind,
    id: string,
    actorId: string,
    baseVersion: number,
    deleted: boolean,
  ) {
    return prisma.$transaction(async (tx) => {
      await lockNode(tx, kind, id);
      const before =
        kind === "period"
          ? await tx.historicalPeriod.findUnique({ where: { id } })
          : kind === "phase"
            ? await tx.historicalPhase.findUnique({ where: { id } })
            : await tx.historicalEntity.findUnique({ where: { id } });
      if (!before || before.version !== baseVersion)
        throw new DomainError(409, "STALE_WRITE", "Nội dung đã thay đổi");
      if (deleted) {
        const count =
          kind === "period"
            ? await tx.historicalPhase.count({
                where: { periodId: id, deletedAt: null },
              })
            : kind === "phase"
              ? (await tx.historicalEntity.count({
                  where: { historicalPhaseId: id, deletedAt: null },
                })) +
                (await tx.series.count({ where: { historicalPhaseId: id } }))
              : (await tx.episodeEntityTag.count({ where: { entityId: id } })) +
                (await tx.series.count({
                  where: { primaryHistoricalEventId: id },
                })) +
                (await tx.episodeNarration.count({
                  where: { narratorEntityId: id },
                }));
        if (count)
          throw new DomainError(
            409,
            "HAS_DEPENDENCIES",
            `Nội dung đang có ${count} mục phụ thuộc`,
          );
      } else {
        const node = nodeRecord(before);
        if (node.periodId)
          await requireLiveParent(
            tx,
            "period",
            node.periodId,
            "PARENT_IN_TRASH",
          );
        if (node.historicalPhaseId)
          await requireLiveParent(
            tx,
            "phase",
            node.historicalPhaseId,
            "PARENT_IN_TRASH",
          );
      }
      const data = {
        deletedAt: deleted ? new Date() : null,
        version: { increment: 1 },
      };
      const row =
        kind === "period"
          ? await tx.historicalPeriod.update({ where: { id }, data })
          : kind === "phase"
            ? await tx.historicalPhase.update({ where: { id }, data })
            : await tx.historicalEntity.update({
                where: { id },
                data: { ...data, reviewStatus: "DRAFT", reviewedVersion: null },
              });
      if (kind === "entity") await saveEntityRevision(tx, id, actorId);
      await writeAudit(tx, {
        actorId,
        action: `historical.${kind}.${deleted ? "deleted" : "restored"}`,
        resourceType: kind,
        resourceId: id,
        changes: { before: jsonSnapshot(before), after: jsonSnapshot(row) },
        ipAddress: null,
      });
      return nodeRecord(row);
    });
  }
  async counts(
    kind: HistoricalNodeKind,
    ids: string[],
  ): Promise<Map<string, HistoricalNodeCounts>> {
    if (!ids.length) return new Map();
    const table =
      kind === "period"
        ? "historical_periods"
        : kind === "phase"
          ? "historical_phases"
          : "historical_entities";
    const phases =
      kind === "period"
        ? Prisma.sql`SELECT id FROM historical_phases WHERE period_id=n.id AND deleted_at IS NULL`
        : Prisma.sql`SELECT n.id`;
    const entities =
      kind === "entity"
        ? Prisma.sql`SELECT n.id`
        : Prisma.sql`SELECT id FROM historical_entities WHERE historical_phase_id IN (${phases}) AND deleted_at IS NULL`;
    const scope =
      kind === "period"
        ? Prisma.sql`c.period_id=n.id OR c.phase_id IN (${phases}) OR c.entity_id IN (${entities})`
        : kind === "phase"
          ? Prisma.sql`c.phase_id=n.id OR c.entity_id IN (${entities})`
          : Prisma.sql`c.entity_id=n.id`;
    const children =
      kind === "period"
        ? phases
        : kind === "phase"
          ? entities
          : Prisma.sql`SELECT id FROM historical_entities WHERE false`;
    const rows = await prisma.$queryRaw<
      Array<{
        id: string;
        children: bigint;
        sources: bigint;
        citations: bigint;
        podcasts: bigint;
      }>
    >(
      Prisma.sql`SELECT n.id,(SELECT count(*) FROM (${children}) child) children,(SELECT count(DISTINCT c.source_id) FROM historical_citations c WHERE ${scope}) sources,(SELECT count(*) FROM historical_citations c WHERE ${scope}) citations,(SELECT count(DISTINCT t.episode_id) FROM episode_entity_tags t JOIN episodes e ON e.id=t.episode_id WHERE t.entity_id IN (${entities}) AND t.status='CONFIRMED' AND e.deleted_at IS NULL) podcasts FROM ${Prisma.raw(table)} n WHERE n.id IN (${Prisma.join(ids.map((id) => Prisma.sql`${id}::uuid`))})`,
    );
    return new Map(
      rows.map((r) => [
        r.id,
        {
          childCount: Number(r.children),
          sourceCount: Number(r.sources),
          citationCount: Number(r.citations),
          podcastCount: Number(r.podcasts),
        },
      ]),
    );
  }
  async getSource(id: string) {
    const row = await prisma.source.findUnique({
      where: { id },
      include: { fileAsset: true },
    });
    return row ? toSource(row) : null;
  }
  async citations(owner: CitationOwner) {
    const where =
      owner.kind === "period"
        ? { periodId: owner.id }
        : owner.kind === "phase"
          ? { phaseId: owner.id }
          : { entityId: owner.id };
    const rows = await prisma.historicalCitation.findMany({
      where,
      orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
      include: {
        source: { include: { fileAsset: true } },
        sourceRevision: { include: { fileAsset: true } },
      },
    });
    return rows.map((row) => ({
      id: row.id,
      sourceId: row.sourceId,
      sourceRevisionId: row.sourceRevisionId,
      sourceVersion: row.sourceRevision.version,
      locator: row.locator,
      excerpt: row.excerpt,
      note: row.note,
      sortOrder: row.sortOrder,
      source: toSource(row.source),
      snapshot: row.sourceRevision.snapshot,
      revisionFile: row.sourceRevision.fileAsset,
    }));
  }
  async changeCitation(
    actorId: string,
    owner: CitationOwner,
    baseVersion: number,
    operation: "create" | "patch" | "delete",
    input: {
      id?: string;
      sourceId?: string;
      locator?: string;
      excerpt?: string | null;
      note?: string | null;
    },
  ) {
    try {
      return await prisma.$transaction(async (tx) => {
        await lockNode(tx, owner.kind, owner.id);
        const where = { id: owner.id, version: baseVersion, deletedAt: null };
        const bump =
          owner.kind === "period"
            ? await tx.historicalPeriod.updateMany({
                where,
                data: { version: { increment: 1 } },
              })
            : owner.kind === "phase"
              ? await tx.historicalPhase.updateMany({
                  where,
                  data: { version: { increment: 1 } },
                })
              : await tx.historicalEntity.updateMany({
                  where,
                  data: {
                    version: { increment: 1 },
                    reviewStatus: "DRAFT",
                    reviewedVersion: null,
                    reviewedAt: null,
                    reviewedById: null,
                    reviewNote: null,
                  },
                });
        if (bump.count !== 1)
          throw new DomainError(409, "STALE_WRITE", "Nội dung đã thay đổi");
        const ownerWhere =
          owner.kind === "period"
            ? { periodId: owner.id }
            : owner.kind === "phase"
              ? { phaseId: owner.id }
              : { entityId: owner.id };
        const old = input.id
          ? await tx.historicalCitation.findFirst({
              where: { id: input.id, ...ownerWhere },
            })
          : null;
        if (operation !== "create" && !old)
          throw new DomainError(
            404,
            "NOT_FOUND",
            "Không tìm thấy trích dẫn trong nội dung",
          );
        let id: string | null = input.id ?? null;
        if (operation === "delete") {
          if (
            await tx.seriesSource.count({
              where: { historicalCitationId: input.id },
            })
          )
            throw new DomainError(
              409,
              "HAS_DEPENDENCIES",
              "Trích dẫn đang dùng trong podcast",
            );
          await tx.historicalCitation.delete({ where: { id: input.id } });
        } else {
          const sourceId = input.sourceId ?? old!.sourceId;
          await tx.$queryRaw`SELECT id FROM sources WHERE id=${sourceId}::uuid FOR UPDATE`;
          const source = await tx.source.findUnique({
            where: { id: sourceId },
          });
          if (!source || source.archivedAt)
            throw new DomainError(
              422,
              "VALIDATION_ERROR",
              "Nguồn không tồn tại hoặc đã lưu trữ",
            );
          const revision = await tx.sourceRevision.upsert({
            where: { sourceId_version: { sourceId, version: source.version } },
            create: {
              sourceId,
              version: source.version,
              snapshot: jsonSnapshot(source),
              fileAssetId: source.fileAssetId,
              createdById: source.createdById,
            },
            update: {},
          });
          const data = {
            sourceId,
            sourceRevisionId: revision.id,
            locator: input.locator ?? old?.locator ?? "",
            excerpt: input.excerpt,
            note: input.note,
          };
          if (operation === "create") {
            const max = await tx.historicalCitation.aggregate({
              where: ownerWhere,
              _max: { sortOrder: true },
            });
            const created = await tx.historicalCitation.create({
              data: {
                ...data,
                ...ownerWhere,
                createdById: actorId,
                sortOrder: (max._max.sortOrder ?? 0) + 1,
              },
            });
            id = created.id;
          } else
            await tx.historicalCitation.update({
              where: { id: input.id },
              data,
            });
        }
        if (owner.kind === "entity")
          await saveEntityRevision(tx, owner.id, actorId);
        await writeAudit(tx, {
          actorId,
          action: `citation.${operation}`,
          resourceType: owner.kind,
          resourceId: owner.id,
          changes: {
            before: jsonSnapshot(old),
            after: jsonSnapshot({ id, ...input }),
          },
          ipAddress: null,
        });
        return id;
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new DomainError(
          409,
          "CONFLICT",
          "Nguồn đã gắn ở vị trí trích này",
        );
      throw error;
    }
  }
  async reviewEntity(
    actorId: string,
    id: string,
    baseVersion: number,
    expectedStatus: HistoricalNodeRecord["reviewStatus"],
    status: HistoricalNodeRecord["reviewStatus"],
    note: string,
  ) {
    await prisma.$transaction(async (tx) => {
      await lockNode(tx, "entity", id);
      const entity = await tx.historicalEntity.findUniqueOrThrow({
        where: { id },
      });
      const sourceIds = (
        await tx.historicalCitation.findMany({
          where: { entityId: id },
          select: { sourceId: true },
        })
      )
        .map((c) => c.sourceId)
        .sort();
      for (const sid of new Set(sourceIds))
        await tx.$queryRaw`SELECT id FROM sources WHERE id=${sid}::uuid FOR UPDATE`;
      if (status === "APPROVED" || status === "IN_REVIEW") {
        if (!entity.historicalPhaseId)
          throw new DomainError(
            422,
            "CONTENT_NOT_READY",
            "Sự kiện thiếu cấp cha",
          );
        await requireLiveParent(tx, "phase", entity.historicalPhaseId);
        const citations = await tx.historicalCitation.findMany({
          where: { entityId: id },
          include: { source: true, sourceRevision: true },
        });
        if (
          !citations.length ||
          citations.some(
            (c) =>
              !c.locator.trim() ||
              c.source.archivedAt ||
              c.source.verificationStatus !== "VERIFIED" ||
              c.source.verifiedVersion !== c.sourceRevision.version ||
              c.source.version !== c.sourceRevision.version,
          )
        )
          throw new DomainError(
            422,
            "CONTENT_NOT_READY",
            "Trích dẫn chưa được xác minh đúng phiên bản",
          );
      }
      const updated = await tx.historicalEntity.updateMany({
        where: {
          id,
          version: baseVersion,
          reviewStatus: expectedStatus,
          deletedAt: null,
        },
        data: {
          reviewStatus: status,
          reviewedVersion: status === "APPROVED" ? baseVersion : null,
          reviewedById: status === "IN_REVIEW" ? null : actorId,
          reviewedAt: status === "IN_REVIEW" ? null : new Date(),
          reviewNote: note,
        },
      });
      if (updated.count !== 1)
        throw new DomainError(
          409,
          "STALE_WRITE",
          "Phiên bản hoặc trạng thái duyệt đã thay đổi",
        );
      await writeAudit(tx, {
        actorId,
        action: `entity.review.${status}`,
        resourceType: "entity",
        resourceId: id,
        changes: {
          version: baseVersion,
          before: expectedStatus,
          after: status,
          note,
        },
        ipAddress: null,
      });
    });
  }
  async reviewSource(
    actorId: string,
    id: string,
    baseVersion: number,
    expectedStatus: "PENDING" | "VERIFIED" | "REJECTED",
    status: "PENDING" | "VERIFIED" | "REJECTED",
    note: string,
  ) {
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw`SELECT id FROM sources WHERE id=${id}::uuid FOR UPDATE`;
      const updated = await tx.source.updateMany({
        where: {
          id,
          version: baseVersion,
          verificationStatus: expectedStatus,
          archivedAt: null,
        },
        data: {
          verificationStatus: status,
          verifiedVersion: status === "VERIFIED" ? baseVersion : null,
          verifiedById: actorId,
          verifiedAt: new Date(),
          verificationNote: note,
        },
      });
      if (updated.count !== 1)
        throw new DomainError(
          409,
          "STALE_WRITE",
          "Phiên bản hoặc trạng thái nguồn đã thay đổi",
        );
      await writeAudit(tx, {
        actorId,
        action: `source.review.${status}`,
        resourceType: "source",
        resourceId: id,
        changes: {
          version: baseVersion,
          before: expectedStatus,
          after: status,
          note,
        },
        ipAddress: null,
      });
      return toSource(
        await tx.source.findUniqueOrThrow({
          where: { id },
          include: { fileAsset: true },
        }),
      );
    });
  }
  async revisions(kind: "entity" | "source", id: string) {
    return kind === "entity"
      ? prisma.historicalEntityRevision.findMany({
          where: { entityId: id },
          orderBy: { version: "desc" },
        })
      : prisma.sourceRevision.findMany({
          where: { sourceId: id },
          orderBy: { version: "desc" },
        });
  }
}

function catalogConflict(error: unknown): never {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === "P2002"
  )
    throw new DomainError(
      409,
      "CONFLICT",
      "Tên nội dung đã tồn tại; hãy đổi tên hoặc khôi phục mục đã xóa.",
    );
  throw error;
}
