import { useCallback, useEffect, useRef, useState } from "react";
import { AiCheckItemSchema, AiCheckSchema, type AiCheck, type AiCheckItem, type CreateAiCheckInput, type PatchAiCheckItemInput } from "@repo/shared";
import { newIdempotencyKey } from "@/lib/idempotency";
import { aiCheckService as api } from "./aiCheckService";

const SSE_EVENTS = ["item", "progress", "done", "failed"] as const;

export interface AiCheckState {
  check: AiCheck | null;
  items: AiCheckItem[];
  starting: boolean;
  /** When the newest finished (not cancelled) check ended; null when there is none. */
  lastRunAt: Date | null;
  start: (episodeId: string, input: CreateAiCheckInput) => Promise<void>;
  cancel: () => Promise<void>;
  patchItem: (itemId: string, patch: PatchAiCheckItemInput) => Promise<AiCheckItem>;
}

/** Keeps the newest check of an episode in state and follows it over SSE; survives F5 (the DB is the source). */
export function useAiCheck(episodeId: string | null): AiCheckState {
  const [check, setCheck] = useState<AiCheck | null>(null);
  const [items, setItems] = useState<AiCheckItem[]>([]);
  const [starting, setStarting] = useState(false);
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null);
  const stream = useRef<EventSource | null>(null);
  const active = useRef<{ episodeId: string; checkId: string } | null>(null);

  const closeStream = useCallback(() => {
    stream.current?.close();
    stream.current = null;
  }, []);

  const follow = useCallback(
    (id: string, current: AiCheck) => {
      closeStream();
      active.current = { episodeId: id, checkId: current.id };
      if (current.status !== "RUNNING") return;
      const source = new EventSource(api.eventsUrl(id, current.id), { withCredentials: true });
      stream.current = source;
      const settle = (next: AiCheck) => {
        setCheck(next);
        if (next.finishedAt) setLastRunAt(next.finishedAt);
        source.close();
        if (stream.current === source) stream.current = null;
      };
      source.addEventListener("item", (event) => {
        const item = AiCheckItemSchema.parse(JSON.parse((event as MessageEvent<string>).data));
        // A replay after reconnect must not overwrite what the user already changed locally (REVIEWED, appliedAt).
        setItems((old) => (old.some((entry) => entry.id === item.id) ? old : [...old, item].sort((a, b) => a.seq - b.seq)));
      });
      source.addEventListener("progress", (event) => {
        const progress = JSON.parse((event as MessageEvent<string>).data) as Pick<AiCheck, "processedBlocks" | "totalBlocks" | "failedBlocks">;
        setCheck((old) => (old ? { ...old, ...progress } : old));
      });
      for (const type of ["done", "failed"] as const) {
        source.addEventListener(type, (event) => settle(AiCheckSchema.parse(JSON.parse((event as MessageEvent<string>).data))));
      }
      // EventSource retries by itself while CONNECTING; CLOSED means the server refused (404/429): read the DB instead.
      source.onerror = () => {
        if (source.readyState !== EventSource.CLOSED) return;
        void api.get(id, current.id).then((detail) => {
          setItems(detail.items);
          settle(detail.check);
        });
      };
    },
    [closeStream],
  );

  useEffect(() => {
    closeStream();
    setCheck(null);
    setItems([]);
    if (!episodeId) return;
    let cancelled = false;
    void (async () => {
      const recent = (await api.recent(episodeId)).items;
      if (cancelled) return;
      setLastRunAt(recent.find((entry) => entry.status !== "CANCELLED")?.finishedAt ?? null);
      const latest = recent[0];
      if (!latest || latest.status === "CANCELLED") return;
      const detail = await api.get(episodeId, latest.id);
      if (cancelled) return;
      setItems(detail.items);
      setCheck(detail.check);
      follow(episodeId, detail.check);
    })().catch(() => undefined);
    return () => {
      cancelled = true;
      closeStream();
    };
  }, [episodeId, follow, closeStream]);

  const start = useCallback(
    async (id: string, input: CreateAiCheckInput) => {
      setStarting(true);
      try {
        const { id: checkId } = await api.create(id, input, newIdempotencyKey());
        const detail = await api.get(id, checkId);
        setItems(detail.items);
        setCheck(detail.check);
        follow(id, detail.check);
      } finally {
        setStarting(false);
      }
    },
    [follow],
  );

  /** Cancel means "throw this run away": the server stops it, the panel returns to idle with no results. */
  const cancel = useCallback(async () => {
    if (!active.current) return;
    await api.cancel(active.current.episodeId, active.current.checkId);
    closeStream();
    active.current = null;
    setCheck(null);
    setItems([]);
  }, [closeStream]);

  const patchItem = useCallback(async (itemId: string, patch: PatchAiCheckItemInput) => {
    if (!active.current) throw new Error("Chưa có lượt rà");
    const updated = await api.patchItem(active.current.episodeId, active.current.checkId, itemId, patch);
    setItems((old) => old.map((entry) => (entry.id === itemId ? updated : entry)));
    return updated;
  }, []);

  return { check, items, starting, lastRunAt, start, cancel, patchItem };
}
