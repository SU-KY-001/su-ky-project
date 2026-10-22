import { Prisma, prisma } from "@repo/db";
import type { AiCheck, AiCheckItem } from "@repo/shared";
import type { ValidatedItem } from "../ai-assist.types";
import type { AiCheckRepository, CreateRunningCheckInput, CreateRunningCheckResult } from "../domain/ai-check.repository";

type CheckRow = Prisma.AiCheckGetPayload<{ include: { items: { select: { status: true } } } }>;
type ItemRow = Prisma.AiCheckItemGetPayload<object>;

const WITH_COUNTS = { items: { select: { status: true } } } as const;
const INTERRUPTED = "INTERRUPTED";
const LOCK_NAMESPACE = 7301;

function toCheck(row: CheckRow): AiCheck {
  return {
    id: row.id,
    episodeId: row.episodeId,
    kind: row.kind,
    status: row.status,
    processedBlocks: row.processedBlocks,
    totalBlocks: row.totalBlocks,
    failedBlocks: row.failedBlocks,
    toolCalls: row.toolCalls,
    inputTokens: row.inputTokens,
    outputTokens: row.outputTokens,
    errorCode: row.errorCode,
    itemCounts: {
      open: row.items.filter((i) => i.status === "OPEN").length,
      reviewed: row.items.filter((i) => i.status === "REVIEWED").length,
    },
    startedAt: row.startedAt,
    finishedAt: row.finishedAt,
  };
}

function toItem(row: ItemRow): AiCheckItem {
  return {
    id: row.id,
    checkId: row.checkId,
    seq: row.seq,
    blockRef: row.blockRef,
    blockHash: row.blockHash,
    blockPrevHash: row.blockPrevHash,
    blockDup: row.blockDup,
    kind: row.kind,
    severity: row.severity,
    basis: row.basis,
    evidence: Array.isArray(row.evidence) ? (row.evidence as AiCheckItem["evidence"]) : [],
    message: row.message,
    suggestion: row.suggestion,
    status: row.status,
    appliedAt: row.appliedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export class PrismaAiCheckRepository implements AiCheckRepository {
  async createRunning(input: CreateRunningCheckInput): Promise<CreateRunningCheckResult> {
    return prisma.$transaction(async (tx) => {
      // Serialises concurrent POSTs of one user so the two counts below cannot both pass.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(${LOCK_NAMESPACE}::int, hashtext(${input.userId}))`;
      const live = { status: "RUNNING" as const, heartbeatAt: { gte: new Date(Date.now() - input.staleAfterMs) } };
      if ((await tx.aiCheck.count({ where: { userId: input.userId, ...live } })) >= input.maxConcurrentPerUser) {
        return { ok: false as const, reason: "USER_LIMIT" as const };
      }
      if ((await tx.aiCheck.count({ where: { episodeId: input.episodeId, kind: "SCRIPT_REVIEW", ...live } })) > 0) {
        return { ok: false as const, reason: "EPISODE_RUNNING" as const };
      }
      const created = await tx.aiCheck.create({
        data: {
          userId: input.userId,
          episodeId: input.episodeId,
          kind: "SCRIPT_REVIEW",
          status: "RUNNING",
          config: { scope: input.scope, note: input.note },
          totalBlocks: input.totalBlocks,
          model: input.model,
          promptVersion: input.promptVersion,
          heartbeatAt: new Date(),
        },
        select: { id: true },
      });
      return { ok: true as const, id: created.id };
    });
  }

  async findCheck(episodeId: string, checkId: string): Promise<AiCheck | null> {
    const row = await prisma.aiCheck.findFirst({ where: { id: checkId, episodeId }, include: WITH_COUNTS });
    return row ? toCheck(row) : null;
  }

  async findCheckById(checkId: string): Promise<AiCheck | null> {
    const row = await prisma.aiCheck.findUnique({ where: { id: checkId }, include: WITH_COUNTS });
    return row ? toCheck(row) : null;
  }

  async listChecks(episodeId: string, limit: number): Promise<AiCheck[]> {
    const rows = await prisma.aiCheck.findMany({ where: { episodeId }, orderBy: { createdAt: "desc" }, take: limit, include: WITH_COUNTS });
    return rows.map(toCheck);
  }

  async listItems(checkId: string): Promise<AiCheckItem[]> {
    return (await prisma.aiCheckItem.findMany({ where: { checkId }, orderBy: { seq: "asc" } })).map(toItem);
  }

  async insertItem(checkId: string, seq: number, item: ValidatedItem): Promise<AiCheckItem> {
    return toItem(
      await prisma.aiCheckItem.create({
        data: { checkId, seq, ...item, evidence: item.evidence as unknown as Prisma.InputJsonValue },
      }),
    );
  }

  async addProgress(checkId: string, delta: Parameters<AiCheckRepository["addProgress"]>[1]): Promise<AiCheck | null> {
    const row = await prisma.aiCheck.update({
      where: { id: checkId },
      data: {
        processedBlocks: { increment: delta.processedBlocks },
        failedBlocks: { increment: delta.failedBlocks },
        toolCalls: { increment: delta.toolCalls },
        inputTokens: { increment: delta.inputTokens },
        outputTokens: { increment: delta.outputTokens },
        heartbeatAt: new Date(),
      },
      include: WITH_COUNTS,
    });
    return toCheck(row);
  }

  async touchHeartbeat(checkId: string): Promise<void> {
    await prisma.aiCheck.updateMany({ where: { id: checkId, status: "RUNNING" }, data: { heartbeatAt: new Date() } });
  }

  async finish(checkId: string, status: "SUCCEEDED" | "FAILED" | "CANCELLED", errorCode: string | null, sourcesUsed: string[]): Promise<boolean> {
    const { count } = await prisma.aiCheck.updateMany({
      where: { id: checkId, status: "RUNNING" },
      data: { status, errorCode, sourcesUsed, finishedAt: new Date() },
    });
    return count === 1;
  }

  async patchItem(episodeId: string, checkId: string, itemId: string, patch: { status?: "REVIEWED"; applied?: true }): Promise<AiCheckItem | null> {
    const item = await prisma.aiCheckItem.findFirst({ where: { id: itemId, checkId, check: { episodeId } } });
    if (!item) return null;
    const data: Prisma.AiCheckItemUpdateInput = {};
    if (patch.status === "REVIEWED") data.status = "REVIEWED";
    if (patch.applied && !item.appliedAt) data.appliedAt = new Date();
    if (Object.keys(data).length === 0) return toItem(item);
    return toItem(await prisma.aiCheckItem.update({ where: { id: itemId }, data }));
  }

  async reapStale(cutoff: Date): Promise<number> {
    const { count } = await prisma.aiCheck.updateMany({
      where: { status: "RUNNING", OR: [{ heartbeatAt: { lt: cutoff } }, { heartbeatAt: null, startedAt: { lt: cutoff } }] },
      data: { status: "FAILED", errorCode: INTERRUPTED, finishedAt: new Date() },
    });
    return count;
  }
}
