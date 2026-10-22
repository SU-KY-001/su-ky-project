import type { AiCheckEvent } from "@repo/shared";

type Listener = (event: AiCheckEvent, seq: number | null) => void;

/**
 * Why: the writer publishes only after the row is in the DB, so a subscriber that also reads the DB never misses
 * an item. In-process only (one API instance); phase 3 builds the SSE endpoint on top of this.
 */
export class CheckHub {
  private readonly listeners = new Map<string, Set<Listener>>();

  subscribe(checkId: string, listener: Listener): () => void {
    const set = this.listeners.get(checkId) ?? new Set<Listener>();
    set.add(listener);
    this.listeners.set(checkId, set);
    return () => {
      set.delete(listener);
      if (set.size === 0) this.listeners.delete(checkId);
    };
  }

  publish(checkId: string, event: AiCheckEvent): void {
    const seq = event.type === "item" ? event.data.seq : null;
    for (const listener of this.listeners.get(checkId) ?? []) listener(event, seq);
  }
}
