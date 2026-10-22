import type { AiCheck, AiCheckItem, PatchAiCheckItemInput } from "@repo/shared";
import type { ValidatedItem } from "../ai-assist.types";

export type AiCheckFinalStatus = "SUCCEEDED" | "FAILED" | "CANCELLED";

export interface CreateRunningCheckInput {
  userId: string;
  episodeId: string;
  scope: "ALL" | "SELECTION";
  note: string | null;
  totalBlocks: number;
  model: string | null;
  promptVersion: string;
  maxConcurrentPerUser: number;
  /** RUNNING checks with an older heartbeat do not count: the reaper will close them. */
  staleAfterMs: number;
}

export type CreateRunningCheckResult =
  | { ok: true; id: string }
  | { ok: false; reason: "USER_LIMIT" | "EPISODE_RUNNING" };

export interface ProgressDelta {
  processedBlocks: number;
  failedBlocks: number;
  toolCalls: number;
  inputTokens: number;
  outputTokens: number;
}

export interface AiCheckRepository {
  createRunning(input: CreateRunningCheckInput): Promise<CreateRunningCheckResult>;
  /** Check of this episode, or null (also when it belongs to another episode). */
  findCheck(episodeId: string, checkId: string): Promise<AiCheck | null>;
  listChecks(episodeId: string, limit: number): Promise<AiCheck[]>;
  listItems(checkId: string): Promise<AiCheckItem[]>;
  findCheckById(checkId: string): Promise<AiCheck | null>;
  insertItem(checkId: string, seq: number, item: ValidatedItem): Promise<AiCheckItem>;
  addProgress(checkId: string, delta: ProgressDelta): Promise<AiCheck | null>;
  touchHeartbeat(checkId: string): Promise<void>;
  /** CAS on `status = RUNNING`; false when another writer (cancel, reaper) already closed it. */
  finish(checkId: string, status: AiCheckFinalStatus, errorCode: string | null, sourcesUsed: string[]): Promise<boolean>;
  /** Idempotent. Null when the item is not in that check of that episode. */
  patchItem(episodeId: string, checkId: string, itemId: string, patch: PatchAiCheckItemInput): Promise<AiCheckItem | null>;
  /** Closes RUNNING checks whose heartbeat is older than `cutoff`; returns how many. */
  reapStale(cutoff: Date): Promise<number>;
}
