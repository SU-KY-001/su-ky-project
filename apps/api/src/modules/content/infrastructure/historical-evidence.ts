import { prisma, Prisma } from "@repo/db";
import {
  HistoricalTimeSchema,
  PublicationEvidenceSchema,
  type PublicationApproval,
  type PublicationEvidenceDto,
} from "@repo/shared";
import {
  assertAssessmentGate,
  currentPublicationApproval,
  hasAiVoiceAudio,
  parseAdminException,
  type EpisodePublishGate,
} from "../application/publication-gate";
import { DomainError } from "../../../core/errors/domain-error";
import { writeAudit } from "../../../core/audit";
import {
  PUBLIC_EVENT_FROM,
  PUBLIC_EVENT_READY,
  lockNode,
  requireLiveParent,
  jsonSnapshot,
} from "../../catalog/infrastructure/prisma-historical-catalog.repository";

export async function primaryEventFields(
  tx: Prisma.TransactionClient,
  eventId: string | null | undefined,
) {
  if (eventId === undefined) return {};
  if (eventId === null)
    return { primaryHistoricalEventId: null, historicalEntityRevisionId: null };
  await lockNode(tx, "entity", eventId);
  const event = await tx.historicalEntity.findUnique({
    where: { id: eventId },
  });
  if (
    !event ||
    event.entityType !== "EVENT" ||
    event.deletedAt ||
    !event.historicalPhaseId
  )
    throw new DomainError(
      422,
      "VALIDATION_ERROR",
      "Sự kiện chính cần giai đoạn đang hoạt động",
    );
  await requireLiveParent(tx, "phase", event.historicalPhaseId);
  const revision = await tx.historicalEntityRevision.upsert({
    where: { entityId_version: { entityId: eventId, version: event.version } },
    create: {
      entityId: eventId,
      version: event.version,
      snapshot: jsonSnapshot(event),
      createdById: event.createdById,
    },
    update: {},
  });
  return {
    primaryHistoricalEventId: eventId,
    historicalPhaseId: event.historicalPhaseId,
    historicalEntityRevisionId: revision.id,
    startYear: event.startYear,
    endYear: event.endYear,
  };
}
export async function collectHistoricalEvidence(
  tx: Prisma.TransactionClient,
  seriesId: string,
): Promise<PublicationEvidenceDto> {
  const series = await tx.series.findUniqueOrThrow({ where: { id: seriesId } });
  if (!series.primaryHistoricalEventId)
    throw new DomainError(
      422,
      "CONTENT_NOT_READY",
      "Chọn sự kiện chính đã duyệt trước khi phát hành",
    );
  await lockNode(tx, "entity", series.primaryHistoricalEventId);
  const event = await tx.historicalEntity.findUniqueOrThrow({
    where: { id: series.primaryHistoricalEventId },
    include: {
      revisions: {
        where: {
          id:
            series.historicalEntityRevisionId ??
            "00000000-0000-0000-0000-000000000000",
        },
      },
    },
  });
  if (!event.historicalPhaseId)
    throw new DomainError(422, "CONTENT_NOT_READY", "Sự kiện thiếu giai đoạn");
  const sourceRows = await tx.seriesSource.findMany({
    where: { seriesId },
    orderBy: { sortOrder: "asc" },
    include: {
      source: true,
      sourceRevision: { include: { fileAsset: true } },
      historicalCitation: true,
    },
  });
  const eventSourceIds = (
    await tx.historicalCitation.findMany({
      where: { entityId: event.id },
      select: { sourceId: true },
    })
  ).map((c) => c.sourceId);
  for (const id of [
    ...new Set([...sourceRows.map((c) => c.sourceId), ...eventSourceIds]),
  ].sort())
    await tx.$queryRaw`SELECT id FROM sources WHERE id=${id}::uuid FOR UPDATE`;
  await requireLiveParent(tx, "phase", event.historicalPhaseId);
  const ready = await tx.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT e.id ${PUBLIC_EVENT_FROM} WHERE ${PUBLIC_EVENT_READY} AND e.id=${event.id}::uuid`,
  );
  if (
    !ready.length ||
    event.revisions[0]?.version !== event.version ||
    series.historicalPhaseId !== event.historicalPhaseId
  )
    throw new DomainError(
      422,
      "CONTENT_NOT_READY",
      "Sự kiện hoặc phiên bản đã chọn chưa sẵn sàng; hãy chọn lại sự kiện hiện tại",
    );
  const rows = await tx.seriesSource.findMany({
    where: { seriesId },
    orderBy: { sortOrder: "asc" },
    include: {
      source: true,
      sourceRevision: { include: { fileAsset: true } },
      historicalCitation: true,
    },
  });
  const sources: PublicationEvidenceDto["sources"] = [];
  for (const row of rows) {
    const s = row.source,
      r = row.sourceRevision,
      c = row.historicalCitation;
    if (
      !r ||
      s.archivedAt ||
      s.verificationStatus !== "VERIFIED" ||
      s.verifiedVersion !== r.version ||
      s.version !== r.version ||
      !row.locator.trim() ||
      (c &&
        (c.entityId !== event.id ||
          c.sourceRevisionId !== r.id ||
          c.sourceId !== s.id ||
          c.locator !== row.locator ||
          c.excerpt !== row.excerpt))
    )
      throw new DomainError(
        422,
        "CONTENT_NOT_READY",
        "Nguồn podcast chưa được xác minh đúng phiên bản hoặc trích dẫn đã thay đổi",
      );
    // Current version equality was checked under locks; this metadata is the exact pinned revision.
    sources.push({
      id: s.id,
      sourceRevisionId: r.id,
      sourceVersion: r.version,
      locator: row.locator,
      excerpt: row.excerpt,
      verifiedAt: s.verifiedAt?.toISOString() ?? null,
      source: {
        title: s.title,
        tier: s.tier,
        author: s.author,
        publisher: s.publisher,
        publicationYear: s.publicationYear,
        edition: s.edition,
        isbn: s.isbn,
        url: s.url,
      },
      file: r.fileAsset
        ? {
            assetId: r.fileAsset.id,
            publicId: r.fileAsset.publicId,
            kind: "DOCUMENT",
            version: r.fileAsset.version?.toString() ?? null,
            format: r.fileAsset.format,
          }
        : null,
    });
  }
  return {
    asOf: new Date().toISOString(),
    event: {
      id: event.id,
      version: event.version,
      name: event.name,
      slug: event.slug,
      time: HistoricalTimeSchema.parse(event.time),
    },
    sources,
  };
}
/**
 * Publishes a series (`gate` null) or an episode inside one transaction. For an episode `gate` decides what authorises it:
 * the current approval, or an Admin exception whose actor role is re-read from the DB here. Every check and the write
 * share the lock, so evidence validity, approval and revision cannot drift between check and publish.
 */
export async function publishWithHistoricalEvidence(
  actorId: string | null,
  id: string,
  baseUpdatedAt: Date,
  kind: "series" | "episode",
  gate: EpisodePublishGate | null = null,
) {
  if (kind === "episode" && !gate) throw new Error("Episode publication requires a gate");
  await prisma.$transaction(async (tx) => {
    const reference =
      kind === "episode"
        ? await tx.episode.findUnique({ where: { id } })
        : null;
    const seriesId = reference?.seriesId ?? id;
    await tx.$queryRaw`SELECT id FROM series WHERE id=${seriesId}::uuid FOR UPDATE`;
    if (kind === "episode")
      await tx.$queryRaw`SELECT id FROM episodes WHERE id=${id}::uuid FOR UPDATE`;
    const series = await tx.series.findUniqueOrThrow({
      where: { id: seriesId },
      include: {
        episodes: { where: { deletedAt: null } },
        coverImageAsset: { select: { status: true } },
        coverLandscapeAsset: { select: { status: true } },
      },
    });
    const episode =
      kind === "episode"
        ? await tx.episode.findUniqueOrThrow({
            where: { id },
            include: { narrations: { include: { audioAsset: true } } },
          })
        : null;
    const current = episode ?? series;
    if (current.updatedAt.getTime() !== baseUpdatedAt.getTime())
      throw new DomainError(
        409,
        "STALE_WRITE",
        "Podcast đã thay đổi; tải lại trước khi phát hành",
      );
    const actor = actorId
      ? await tx.user.findUnique({
          where: { id: actorId },
          select: { role: true, banned: true },
        })
      : null;
    if (
      series.deletedAt ||
      episode?.deletedAt ||
      (actor?.role !== "admin" &&
        (series.adminLockedAt || episode?.adminLockedAt))
    )
      throw new DomainError(
        409,
        "CONTENT_IN_TRASH",
        "Podcast đã xóa hoặc bị khóa",
      );
    let exception: PublicationApproval | null = null;
    if (episode && gate) {
      const third = episode.narrations.find(
        (n) => n.narrationType === "THIRD_PERSON",
      );
      if (!third?.scriptContent?.trim() || third.audioAsset?.status !== "READY")
        throw new DomainError(
          422,
          "EPISODE_NOT_PUBLISHABLE",
          "Cần kịch bản và âm thanh hợp lệ",
        );
      const facts = {
        hasAiVoice: hasAiVoiceAudio(episode.narrations.filter((n) => n.audioAssetId)),
        hasWarnings: gate.hasWarnings,
        now: new Date(),
      };
      if (gate.mode === "ADMIN_EXCEPTION") {
        if (actor?.role !== "admin" || actor.banned)
          throw new DomainError(403, "FORBIDDEN", "Chỉ Admin được phát hành ngoại lệ");
        const parsed = parseAdminException(gate);
        assertAssessmentGate(parsed.assessment, facts);
        exception = {
          contentRevision: episode.contentRevision,
          assessment: parsed.assessment,
          approvedById: actorId!,
          approvedAt: facts.now,
          exceptionReason: parsed.exceptionReason,
        };
      } else {
        const approval = currentPublicationApproval(
          episode.publicationApproval,
          episode.contentRevision,
        );
        if (!approval)
          throw new DomainError(
            409,
            "APPROVAL_REQUIRED",
            "Phiên bản hiện tại chưa có phê duyệt phát hành; gửi duyệt và duyệt lại trước khi phát hành",
          );
        assertAssessmentGate(approval.assessment, facts);
      }
    } else if (
      !series.topicId ||
      series.startYear == null ||
      series.endYear == null ||
      !series.episodes.some((e) => e.status === "PUBLISHED") ||
      !series.description?.trim() ||
      !series.language.trim() ||
      !(
        series.coverImageAsset?.status === "READY" ||
        series.coverLandscapeAsset?.status === "READY"
      )
    )
      throw new DomainError(
        422,
        "SERIES_NOT_PUBLISHABLE",
        "Series chưa đủ thông tin phát hành (chủ đề, khoảng năm, mô tả, ảnh bìa, ngôn ngữ và ít nhất một tập đã phát hành)",
      );
    const evidence = await collectHistoricalEvidence(tx, seriesId);
    const preservePublished =
      kind === "episode" && series.status === "PUBLISHED";
    if (preservePublished) {
      const previous = PublicationEvidenceSchema.safeParse(
        series.publicationEvidence,
      );
      const signature = (value: PublicationEvidenceDto) =>
        JSON.stringify({
          event: { id: value.event.id, version: value.event.version },
          sources: value.sources
            .map((s) => ({
              id: s.id,
              sourceRevisionId: s.sourceRevisionId,
              locator: s.locator,
              excerpt: s.excerpt,
            }))
            .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b))),
        });
      if (!previous.success || signature(previous.data) !== signature(evidence))
        throw new DomainError(
          422,
          "CONTENT_NOT_READY",
          "Bằng chứng của series đã thay đổi. Phát hành lại series trước khi phát hành tập với bằng chứng mới.",
        );
    }
    await tx.series.update({
      where: { id: seriesId },
      data: {
        ...(preservePublished
          ? { updatedAt: new Date() }
          : { publicationEvidence: jsonSnapshot(evidence) }),
        ...(kind === "series"
          ? {
              status: "PUBLISHED",
              publishedAt: series.publishedAt ?? new Date(),
            }
          : {}),
      },
    });
    if (episode)
      await tx.episode.update({
        where: { id },
        data: {
          status: "PUBLISHED",
          publishedAt: episode.publishedAt ?? new Date(),
          ...(exception ? { publicationApproval: jsonSnapshot(exception) } : {}),
        },
      });
    await writeAudit(tx, {
      actorId,
      actorType: actorId ? "USER" : "SYSTEM",
      action: exception ? "episode.published_exception" : `${kind}.published`,
      resourceType: kind,
      resourceId: id,
      changes: {
        evidence: jsonSnapshot(evidence),
        ...(episode
          ? { contentRevision: episode.contentRevision }
          : {}),
        ...(exception
          ? {
              exceptionReason: exception.exceptionReason,
              assessment: jsonSnapshot(exception.assessment),
            }
          : {}),
      },
      ipAddress: null,
    });
  });
}
