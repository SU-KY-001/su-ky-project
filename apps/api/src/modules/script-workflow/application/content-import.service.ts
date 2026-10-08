import { Prisma, prisma, type DbClient } from "@repo/db";
import { ImportResultSchema, STEP_OUTPUT_SCHEMAS, type ImportRequest, type ImportResult, type StepPayloadMap } from "@repo/shared";
import { writeAudit } from "../../../core/audit";
import { DomainError } from "../../../core/errors/domain-error";
import { insertWithUniqueSlug } from "../../../core/slug";
import { appendEpisodes, createSeriesDraft, loadSeriesForRead, assertWritable } from "../../content";
import type { Session } from "../../auth";
import type { WorkflowCommandService } from "./workflow-command.service";

interface ImportBasis {
  nodeId: number;
  version: number;
  researcher: StepPayloadMap["RESEARCHER"];
  factExtractor: StepPayloadMap["FACT_EXTRACTOR"];
  storyPlanner: StepPayloadMap["STORY_PLANNER"];
  oralizer: StepPayloadMap["ORALIZER"];
  factChecker: StepPayloadMap["FACT_CHECKER"];
}

export class ContentImportService {
  constructor(private readonly commands: WorkflowCommandService) {}

  private async run(runId: number, userId: string) {
    const run = await prisma.workflowRun.findFirst({ where: { id: runId, createdById: userId } });
    if (!run) throw new DomainError(404, "NOT_FOUND", "Workflow not found");
    return run;
  }

  private async basis(runId: number): Promise<ImportBasis> {
    const step = await prisma.workflowStep.findUnique({ where: { workflowRunId_stepType: { workflowRunId: runId, stepType: "FACT_CHECKER" } } });
    const selectedVersion = step?.status === "WAITING_FOR_HUMAN" ? step.currentVersion : step?.approvedVersion;
    if (!step || !selectedVersion) throw new DomainError(409, "IMPORT_NOT_AVAILABLE", "Fact-check output is not ready for import");
    const selectedNode = await prisma.stepVersion.findUnique({ where: { workflowStepId_version: { workflowStepId: step.id, version: selectedVersion } } });
    if (!selectedNode) throw new DomainError(409, "IMPORT_NOT_AVAILABLE", "Fact-check output is not available");
    const nodeId = selectedNode.id;
    const outputs = new Map<string, unknown>();
    let currentId: number | null = nodeId;
    let factVersion = 0;
    while (currentId) {
      const node: Prisma.StepVersionGetPayload<{ include: { workflowStep: true } }> | null =
        await prisma.stepVersion.findUnique({ where: { id: currentId }, include: { workflowStep: true } });
      if (!node) break;
      outputs.set(node.workflowStep.stepType, node.outputJson);
      if (node.id === nodeId) factVersion = node.version;
      currentId = node.parentVersionId;
    }
    try {
      return {
        nodeId, version: factVersion,
        researcher: STEP_OUTPUT_SCHEMAS.RESEARCHER.parse(outputs.get("RESEARCHER")),
        factExtractor: STEP_OUTPUT_SCHEMAS.FACT_EXTRACTOR.parse(outputs.get("FACT_EXTRACTOR")),
        storyPlanner: STEP_OUTPUT_SCHEMAS.STORY_PLANNER.parse(outputs.get("STORY_PLANNER")),
        oralizer: STEP_OUTPUT_SCHEMAS.ORALIZER.parse(outputs.get("ORALIZER")),
        factChecker: STEP_OUTPUT_SCHEMAS.FACT_CHECKER.parse(outputs.get("FACT_CHECKER")),
      };
    } catch {
      throw new DomainError(409, "IMPORT_NOT_AVAILABLE", "Workflow lineage is incomplete");
    }
  }

  async preview(runId: number, session: Session) {
    const run = await this.run(runId, session.user.id);
    const basis = await this.basis(runId);
    const target = run.seriesId
      ? await (async () => { const series = await loadSeriesForRead(prisma, session, run.seriesId!); assertWritable(session, series); const max = await prisma.episode.aggregate({ where: { seriesId: series.id, deletedAt: null }, _max: { sortOrder: true } }); return { kind: "EXISTING_SERIES", seriesId: series.id, seriesTitle: series.title, nextSortOrder: (max._max.sortOrder ?? 0) + 1 }; })()
      : { kind: "NEW_SERIES", seriesTitle: basis.storyPlanner.seriesTitle };
    const candidateLimit = 5;
    const sources = await Promise.all(basis.researcher.sourcesCatalogue.map(async (item) => ({
      itemId: item.id, item, origin: item.id.startsWith("custom-src-") ? "MODERATOR" : "AI", catalogSourceId: item.catalogSourceId ?? null,
      candidates: (await prisma.source.findMany({ where: { archivedAt: null, title: { contains: item.name, mode: "insensitive" } }, take: candidateLimit, select: { id: true, title: true } })).map((source) => ({ sourceId: source.id, title: source.title, similarity: source.title.toLowerCase() === item.name.toLowerCase() ? 1 : 0.5 })),
    })));
    const entities = await Promise.all(basis.factExtractor.keyEntities.map(async (item) => ({ itemKey: item.name, entityType: "FIGURE", candidates: (await prisma.historicalEntity.findMany({ where: { OR: [{ name: { contains: item.name, mode: "insensitive" } }, { aliases: { has: item.name } }] }, take: candidateLimit, select: { id: true, name: true } })).map((entity) => ({ entityId: entity.id, name: entity.name, similarity: entity.name.toLowerCase() === item.name.toLowerCase() ? 1 : 0.5 })) })));
    return { target, factCheck: { passed: basis.factChecker.claimVerification.every((claim) => claim.status === "VERIFIED"), issueCount: basis.factChecker.claimVerification.filter((claim) => claim.status !== "VERIFIED").length }, basis: { factCheckerVersionId: basis.nodeId }, episodes: basis.oralizer.episodes.map((episode, index) => ({ episodeNo: index + 1, title: basis.storyPlanner.episodes[index].episodeTitle, wordCount: episode.spokenNarration.trim().split(/\s+/).length })), sources, entities };
  }

  async imported(runId: number, userId: string): Promise<ImportResult | null> {
    await this.run(runId, userId);
    const audit = await prisma.auditLog.findFirst({ where: { action: "ai_import", resourceType: "workflow_run", resourceId: String(runId) }, orderBy: { createdAt: "desc" } });
    return audit ? ImportResultSchema.parse(audit.changes) : null;
  }

  async import(runId: number, session: Session, request: ImportRequest): Promise<{ result: ImportResult; created: boolean }> {
    await this.run(runId, session.user.id);
    const existing = await this.imported(runId, session.user.id);
    if (existing) return { result: existing, created: false };
    const basis = await this.basis(runId);
    if (request.basis.factCheckerVersionId !== basis.nodeId) throw new DomainError(409, "STALE_WRITE", "Import basis changed");
    const undecided = basis.researcher.sourcesCatalogue.filter((item) => !item.catalogSourceId && !request.sourceDecisions.some((decision) => decision.itemId === item.id));
    if (undecided.length) throw new DomainError(422, "IMPORT_DECISIONS_INCOMPLETE", `Missing source decisions: ${undecided.map((item) => item.id).join(", ")}`);
    const publication = await prisma.scriptPublication.findUnique({ where: { approvedVersionId: basis.nodeId } }) ?? await (async () => {
      const transition = await this.commands.continueStep({ workflowRunId: runId, stepType: "FACT_CHECKER", version: basis.version, userId: session.user.id, incomingGuidance: request.approvalNote });
      if (!transition.success) throw new DomainError(transition.status, transition.status === 404 ? "NOT_FOUND" : "STALE_WRITE", transition.error);
      return prisma.scriptPublication.findUniqueOrThrow({ where: { approvedVersionId: basis.nodeId } });
    })();
    return prisma.$transaction(async (tx) => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM workflow_runs WHERE id = ${runId} FOR UPDATE`);
      const completed = await tx.auditLog.findFirst({ where: { action: "ai_import", resourceType: "workflow_run", resourceId: String(runId) }, orderBy: { createdAt: "desc" } });
      if (completed) return { result: ImportResultSchema.parse(completed.changes), created: false };
      return { result: await this.persist(tx, runId, session, basis, publication.id, request), created: true };
    }, { timeout: 30_000 });
  }

  private async persist(db: DbClient, runId: number, session: Session, basis: ImportBasis, publicationId: number, request: ImportRequest): Promise<ImportResult> {
    const run = await db.workflowRun.findUniqueOrThrow({ where: { id: runId } });
    let createdSeries = false;
    let seriesId = run.seriesId;
    if (seriesId) { const series = await loadSeriesForRead(db, session, seriesId); assertWritable(session, series); }
    else { const series = await createSeriesDraft(db, { ownerId: session.user.id, title: basis.storyPlanner.seriesTitle }); seriesId = series.id; createdSeries = true; }
    const episodes = await appendEpisodes(db, seriesId, basis.oralizer.episodes.map((episode, index) => ({ title: basis.storyPlanner.episodes[index].episodeTitle, thirdPersonScript: { content: episode.spokenNarration, scriptPublicationId: publicationId, episodeNo: index + 1 } })));
    const createdSourceIds: string[] = [];
    for (const item of basis.researcher.sourcesCatalogue) {
      const decision = request.sourceDecisions.find((candidate) => candidate.itemId === item.id);
      if (decision?.action === "DROP") continue;
      let sourceId = item.catalogSourceId ?? (decision?.action === "USE_EXISTING" ? decision.sourceId : undefined);
      if (!sourceId && decision?.action === "CREATE") {
        const source = await db.source.create({ data: { tier: item.tier, title: decision.overrides?.title ?? item.name, author: decision.overrides?.author ?? item.authorOrOrigin, url: decision.overrides?.url ?? (item.url?.startsWith("http") ? item.url : null), createdById: session.user.id } }); sourceId = source.id; createdSourceIds.push(source.id);
      }
      if (sourceId) await db.episodeSource.createMany({ data: episodes.map((episode, index) => ({ episodeId: episode.episodeId, sourceId: sourceId!, locator: (item.locationInSource ?? "").slice(0, 255), excerpt: null, origin: item.id.startsWith("custom-src-") ? "MODERATOR" : "AI", sortOrder: basis.researcher.sourcesCatalogue.indexOf(item) + 1 })), skipDuplicates: true });
    }
    const createdEntityIds: string[] = [];
    for (const item of basis.factExtractor.keyEntities) {
      const decision = request.entityDecisions.find((candidate) => candidate.itemKey === item.name); if (!decision || decision.action === "DROP") continue;
      let entityId = decision.action === "USE_EXISTING" ? decision.entityId : "";
      if (decision.action === "CREATE") { await insertWithUniqueSlug(item.name, async (slug) => { const rows = await db.historicalEntity.createMany({ data: [{ entityType: "FIGURE", name: item.name, slug, aliases: [], summary: item.role, createdById: session.user.id }], skipDuplicates: true }); if (!rows.count) return false; entityId = (await db.historicalEntity.findUniqueOrThrow({ where: { slug }, select: { id: true } })).id; return true; }); createdEntityIds.push(entityId); }
      await db.episodeEntityTag.createMany({ data: episodes.map((episode) => ({ episodeId: episode.episodeId, entityId, status: decision.confirm ? "CONFIRMED" : "SUGGESTED", origin: "AI", confirmedById: decision.confirm ? session.user.id : null, confirmedAt: decision.confirm ? new Date() : null })), skipDuplicates: true });
    }
    await db.workflowRun.update({ where: { id: runId }, data: { seriesId } });
    const result: ImportResult = { seriesId, createdSeries, episodes: episodes.map((episode, index) => ({ episodeNo: index + 1, ...episode })), createdSourceIds, createdEntityIds, importedAt: new Date().toISOString() };
    await writeAudit(db, { actorId: session.user.id, action: "ai_import", resourceType: "workflow_run", resourceId: String(runId), changes: result as unknown as Prisma.InputJsonValue, ipAddress: null });
    return result;
  }
}
