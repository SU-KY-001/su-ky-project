import type { AiCheck } from "@repo/shared";
import type { AiCheckRepository } from "../domain/ai-check.repository";
import type { CheckHub } from "./check-hub";

export interface SseFrame {
  id?: string;
  event: "item" | "progress" | "done" | "failed";
  data: string;
}

export interface CheckStreamDeps {
  repo: Pick<AiCheckRepository, "findCheckById" | "listItems">;
  hub: CheckHub;
  heartbeatMs: number;
}

export interface CheckStreamIo {
  send: (frame: SseFrame) => Promise<void>;
  ping: () => Promise<void>;
  signal: AbortSignal;
}

/**
 * Why: the DB is the source of truth and the hub only wakes this loop up. Each pass reads the check first, then its
 * items: the writer inserts items before it closes the check, so once the status is terminal no item is missing.
 * `seq` is gap-free, so "seq > lastSent" is enough to avoid duplicates after a reconnect with Last-Event-ID.
 */
export async function runCheckStream(deps: CheckStreamDeps, checkId: string, lastEventId: number, io: CheckStreamIo): Promise<void> {
  const { repo, hub, heartbeatMs } = deps;
  let wake: (() => void) | null = null;
  let woken = false;
  const unsubscribe = hub.subscribe(checkId, () => {
    woken = true;
    wake?.();
  });
  const onAbort = () => wake?.();
  io.signal.addEventListener("abort", onAbort);

  const waitForWake = (): Promise<boolean> =>
    new Promise((resolve) => {
      if (woken || io.signal.aborted) return resolve(woken);
      const timer = setTimeout(() => {
        wake = null;
        resolve(false);
      }, heartbeatMs);
      wake = () => {
        clearTimeout(timer);
        wake = null;
        resolve(woken);
      };
    });

  let sentSeq = lastEventId;
  let lastProgress = "";
  try {
    while (!io.signal.aborted) {
      woken = false;
      const check = await repo.findCheckById(checkId);
      if (!check) return;
      const items = (await repo.listItems(checkId)).filter((item) => item.seq > sentSeq);
      for (const item of items) {
        await io.send({ id: String(item.seq), event: "item", data: JSON.stringify(item) });
        sentSeq = item.seq;
      }
      const progress = JSON.stringify({ processedBlocks: check.processedBlocks, totalBlocks: check.totalBlocks, failedBlocks: check.failedBlocks });
      if (progress !== lastProgress) {
        lastProgress = progress;
        await io.send({ event: "progress", data: progress });
      }
      if (check.status !== "RUNNING") {
        await io.send({ event: terminalEvent(check), data: JSON.stringify(check) });
        return;
      }
      if (!(await waitForWake()) && !io.signal.aborted) await io.ping();
    }
  } finally {
    io.signal.removeEventListener("abort", onAbort);
    unsubscribe();
  }
}

function terminalEvent(check: AiCheck): "done" | "failed" {
  return check.status === "SUCCEEDED" ? "done" : "failed";
}

/** `Last-Event-ID` is client-supplied: anything that is not a non-negative integer means "from the start". */
export function parseLastEventId(raw: string | undefined): number {
  const value = Number(raw);
  return Number.isSafeInteger(value) && value > 0 ? value : 0;
}
