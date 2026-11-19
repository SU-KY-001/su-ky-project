import { useCallback, useEffect, useRef, useState } from "react";
import type { AiCheck, AiCheckItem } from "@repo/shared";
import { blockNumber } from "../aiCheck/presentation";
import { AI_RUN_TEXT } from "./aiRunMessages";

/** Same vocabulary as the Pi agent event stream: a step began, something was found, a tool/job finished, a warning, an error. */
export type AiLogKind = "step" | "found" | "done" | "warn" | "error";

export interface AiLogEntry {
  id: string;
  kind: AiLogKind;
  text: string;
  /** Epoch ms; the view shows it as an offset from the run start. */
  at: number;
}

const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const ELAPSED_TICK_MS = 1000;
const PAD = 2;
const MESSAGE_PREVIEW_CHARS = 70;

export const formatOffset = (ms: number): string => {
  const total = Math.max(0, Math.floor(ms / MS_PER_SECOND));
  return `${String(Math.floor(total / SECONDS_PER_MINUTE)).padStart(PAD, "0")}:${String(total % SECONDS_PER_MINUTE).padStart(PAD, "0")}`;
};

/** Ticks once a second while `active`, so the elapsed clock moves even when no event arrives. */
export function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), ELAPSED_TICK_MS);
    return () => window.clearInterval(timer);
  }, [active]);
  return now;
}

/** Remembers when `running` last turned on (client clock; used by jobs the server does not timestamp). */
export function useRunStart(running: boolean): number {
  const startedAt = useRef(Date.now());
  const was = useRef(running);
  if (running && !was.current) startedAt.current = Date.now();
  was.current = running;
  return startedAt.current;
}

/** Log lines for one local request (outline, rewrite): `begin` resets it, `push` appends. */
export function useAiRunLog(): { entries: AiLogEntry[]; startedAt: number; begin: (text: string) => void; push: (kind: AiLogKind, text: string) => void } {
  const [entries, setEntries] = useState<AiLogEntry[]>([]);
  const [startedAt, setStartedAt] = useState(() => Date.now());
  const counter = useRef(0);
  const entry = useCallback((kind: AiLogKind, text: string): AiLogEntry => ({ id: `log-${(counter.current += 1)}`, kind, text, at: Date.now() }), []);
  const begin = useCallback((text: string) => {
    setStartedAt(Date.now());
    setEntries([entry("step", text)]);
  }, [entry]);
  const push = useCallback((kind: AiLogKind, text: string) => setEntries((old) => [...old, entry(kind, text)]), [entry]);
  return { entries, startedAt, begin, push };
}

interface Seen {
  checkId: string;
  processed: number;
  failed: number;
  items: Set<string>;
  settled: boolean;
}

const EMPTY_SEEN = (): Seen => ({ checkId: "", processed: -1, failed: 0, items: new Set(), settled: false });

/** Derives the log of one check from the progress / item / done events the SSE stream already delivers. */
export function useAiCheckLog(check: AiCheck | null, items: AiCheckItem[]): AiLogEntry[] {
  const [entries, setEntries] = useState<AiLogEntry[]>([]);
  const seen = useRef<Seen>(EMPTY_SEEN());
  const counter = useRef(0);

  useEffect(() => {
    if (!check) {
      seen.current = EMPTY_SEEN();
      setEntries([]);
      return;
    }
    const next: AiLogEntry[] = [];
    const push = (kind: AiLogKind, text: string): void => {
      next.push({ id: `check-${(counter.current += 1)}`, kind, text, at: Date.now() });
    };
    const fresh = seen.current.checkId !== check.id;
    if (fresh) {
      seen.current = { ...EMPTY_SEEN(), checkId: check.id };
      push("step", AI_RUN_TEXT.checkStart(check.totalBlocks));
    }
    const state = seen.current;
    if (check.processedBlocks !== state.processed && check.processedBlocks > 0) push("step", AI_RUN_TEXT.checkProgress(check.processedBlocks, check.totalBlocks));
    state.processed = check.processedBlocks;
    for (const item of items) {
      if (state.items.has(item.id)) continue;
      state.items.add(item.id);
      const preview = item.message.length > MESSAGE_PREVIEW_CHARS ? `${item.message.slice(0, MESSAGE_PREVIEW_CHARS)}…` : item.message;
      push("found", AI_RUN_TEXT.checkFound(blockNumber(item.blockRef), preview));
    }
    if (check.failedBlocks > state.failed) push("warn", AI_RUN_TEXT.checkFailedBlocks(check.failedBlocks));
    state.failed = check.failedBlocks;
    if (!state.settled && check.status !== "RUNNING") {
      state.settled = true;
      if (check.status === "SUCCEEDED") push("done", AI_RUN_TEXT.checkDone(check.toolCalls, check.inputTokens + check.outputTokens));
      else if (check.status === "FAILED") push("error", AI_RUN_TEXT.checkFailed);
    }
    if (fresh) setEntries(next);
    else if (next.length > 0) setEntries((old) => [...old, ...next]);
  }, [check, items]);

  return entries;
}
