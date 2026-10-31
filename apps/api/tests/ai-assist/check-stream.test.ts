import { describe, expect, test } from "bun:test";
import type { AiCheck, AiCheckItem } from "@repo/shared";
import { CheckHub } from "../../src/modules/ai-assist/review/application/check-hub";
import { parseLastEventId, runCheckStream, type SseFrame } from "../../src/modules/ai-assist/review/application/check-stream";

const CHECK_ID = "00000000-0000-4000-8000-000000000001";

function item(seq: number): AiCheckItem {
  return { id: `00000000-0000-4000-8000-00000000010${seq}`, checkId: CHECK_ID, seq, blockRef: "b0", blockHash: "h", blockPrevHash: "", blockDup: 1, kind: "FACT_DOUBT", severity: "LOW", basis: "NOT_FOUND", evidence: [], message: `m${seq}`, suggestion: null, status: "OPEN", appliedAt: null, createdAt: new Date(), updatedAt: new Date() };
}

function makeStore() {
  const state = { check: { id: CHECK_ID, status: "RUNNING", processedBlocks: 0, totalBlocks: 3, failedBlocks: 0 } as AiCheck, items: [] as AiCheckItem[] };
  const hub = new CheckHub();
  const repo = { findCheckById: async () => ({ ...state.check }), listItems: async () => [...state.items] };
  const add = (seq: number) => {
    state.items.push(item(seq));
    hub.publish(CHECK_ID, { type: "item", data: item(seq) });
  };
  const finish = (status: AiCheck["status"]) => {
    state.check = { ...state.check, status };
    hub.publish(CHECK_ID, { type: "done", data: state.check });
  };
  return { state, hub, repo, add, finish };
}

function open(store: ReturnType<typeof makeStore>, lastEventId = 0) {
  const frames: SseFrame[] = [];
  let pings = 0;
  const abort = new AbortController();
  const done = runCheckStream({ repo: store.repo, hub: store.hub, heartbeatMs: 20 }, CHECK_ID, lastEventId, {
    signal: abort.signal,
    send: async (f) => void frames.push(f),
    ping: async () => void pings++,
  });
  return { frames, done, abort, pings: () => pings };
}

const seqs = (frames: SseFrame[]) => frames.filter((f) => f.event === "item").map((f) => f.id);

describe("runCheckStream", () => {
  test("a finished check replays every item then closes with done", async () => {
    const s = makeStore();
    s.state.items.push(item(1), item(2));
    s.state.check.status = "SUCCEEDED";
    const c = open(s);
    await c.done;
    expect(seqs(c.frames)).toEqual(["1", "2"]);
    expect(c.frames.at(-1)?.event).toBe("done");
  });

  test("reconnect with Last-Event-ID sends only newer items, no duplicates", async () => {
    const s = makeStore();
    s.state.items.push(item(1), item(2), item(3));
    s.state.check.status = "FAILED";
    const c = open(s, 2);
    await c.done;
    expect(seqs(c.frames)).toEqual(["3"]);
    expect(c.frames.at(-1)?.event).toBe("failed");
  });

  test("live items arrive as the writer inserts them, each exactly once, and the stream ends on done", async () => {
    const s = makeStore();
    const c = open(s);
    await Bun.sleep(10);
    s.add(1);
    s.add(2);
    await Bun.sleep(10);
    s.add(3);
    s.finish("SUCCEEDED");
    await c.done;
    expect(seqs(c.frames)).toEqual(["1", "2", "3"]);
    expect(c.frames.at(-1)?.event).toBe("done");
  });

  test("an item inserted without a hub event is still found by the heartbeat re-read", async () => {
    const s = makeStore();
    const c = open(s);
    s.state.items.push(item(1));
    s.state.check.status = "FAILED"; // e.g. the reaper closed it in another process
    await c.done;
    expect(seqs(c.frames)).toEqual(["1"]);
    expect(c.frames.at(-1)?.event).toBe("failed");
  });

  test("an idle stream sends pings, and abort stops it and releases the hub listener", async () => {
    const s = makeStore();
    const c = open(s);
    await Bun.sleep(70);
    expect(c.pings()).toBeGreaterThan(0);
    c.abort.abort();
    await c.done;
    const before = c.frames.length;
    s.add(1);
    await Bun.sleep(10);
    expect(c.frames.length).toBe(before);
  });
});

describe("parseLastEventId", () => {
  test("starts before seq 0 and preserves an explicit cursor at 0", () => {
    expect(parseLastEventId("7")).toBe(7);
    expect(parseLastEventId("0")).toBe(0);
    for (const bad of [undefined, "", "abc", "-3", "1.5"]) expect(parseLastEventId(bad)).toBe(-1);
  });
});
