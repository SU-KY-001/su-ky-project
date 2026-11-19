import { describe, expect, it } from "bun:test";
import type { PageHit, ReviewSource, SourcePageStore } from "../../src/modules/ai-assist/review/domain/review.types";
import { buildSourceToolkit, MAX_PAGES_PER_READ } from "../../src/modules/ai-assist/review/sources/source-tools";
import { createToolResultListener, selectSessionTools, WEB_TOOL_NAMES } from "../../src/modules/ai-engine/tool-hooks";

/** In-memory stand-in for the Postgres store: pages keyed by "sourceId:page". */
function memoryStore(pages: Record<string, string>): SourcePageStore {
  const entries = Object.entries(pages).map(([key, text]) => {
    const [sourceId, page] = key.split(":");
    return { sourceId: sourceId!, page: Number(page), text };
  });
  return {
    hasPages: async (sourceId) => entries.some((e) => e.sourceId === sourceId),
    search: async (sources, query, limit): Promise<PageHit[]> =>
      entries
        .filter((e) => sources.some((s) => s.sourceId === e.sourceId) && e.text.includes(query))
        .slice(0, limit)
        .map((e) => ({ sourceId: e.sourceId, page: e.page, excerpt: e.text })),
    readPages: async (sourceId, _version, from, to) => entries.filter((e) => e.sourceId === sourceId && e.page >= from && e.page <= to).map((e) => ({ page: e.page, text: e.text })),
  };
}

const pdf = (label: string, sourceId: string): ReviewSource => ({ sourceId, version: 1, label, title: `Sách ${label}`, kind: "PDF", url: null });
const web = (label: string, sourceId: string, url: string): ReviewSource => ({ sourceId, version: 1, label, title: `Web ${label}`, kind: "URL", url });

interface Executable {
  name: string;
  execute: (id: string, params: unknown) => Promise<{ content: Array<{ text: string }> }>;
}
const tool = (kit: ReturnType<typeof buildSourceToolkit>, name: string) => kit.customTools.find((t) => t.name === name) as unknown as Executable;
const text = async (call: Promise<{ content: Array<{ text: string }> }>) => (await call).content[0]!.text;

describe("source toolkit", () => {
  it("labels results by source and records only the (source, page) pairs actually read", async () => {
    const kit = buildSourceToolkit({
      store: memoryStore({ "a:1": "trang một của sách A", "a:2": "trang hai của sách A", "b:1": "trang một của sách B" }),
      sources: [pdf("S1", "a"), pdf("S2", "b")],
      maxToolCalls: 10,
    });
    expect(await text(tool(kit, "search_source").execute("1", { query: "trang một" }))).toMatch(/\[S1\] p\.1.*\n\[S2\] p\.1/);

    await tool(kit, "read_pages").execute("2", { source: "S1", from: 1, to: 1 });
    expect(kit.openedText("a", 1)).toBe("trang một của sách A");
    expect(kit.openedText("b", 1)).toBeUndefined();
    expect(kit.openedText("a", 2)).toBeUndefined();
  });

  it("caps pages per read, rejects unknown labels and bad ranges, and never reads outside the allowlist", async () => {
    const pages = Object.fromEntries([1, 2, 3, 4, 5].map((p) => [`a:${p}`, `p${p}`]));
    const kit = buildSourceToolkit({ store: memoryStore({ ...pages, "z:1": "sách ngoài danh sách" }), sources: [pdf("S1", "a")], maxToolCalls: 10 });
    const read = tool(kit, "read_pages");

    const out = await text(read.execute("1", { source: "s1", from: 1, to: 5 }));
    expect((out.match(/--- S1 p\./g) ?? []).length).toBe(MAX_PAGES_PER_READ);
    expect(await text(read.execute("2", { source: "S9", from: 1, to: 1 }))).toContain("Unknown source");
    expect(await text(read.execute("3", { source: "S1", from: 4, to: 2 }))).toContain("invalid");
    expect(kit.openedText("z", 1)).toBeUndefined();
  });

  it("stops serving tools once the call budget is spent", async () => {
    const kit = buildSourceToolkit({ store: memoryStore({ "a:1": "x" }), sources: [pdf("S1", "a")], maxToolCalls: 2 });
    const search = tool(kit, "search_source");
    await search.execute("1", { query: "x" });
    await search.execute("2", { query: "x" });
    expect(await text(search.execute("3", { query: "x" }))).toContain("budget exhausted");
  });

  it("offers no tools when no source is a PDF", () => {
    expect(buildSourceToolkit({ store: memoryStore({}), sources: [web("S1", "u", "https://example.org/a")], maxToolCalls: 5 }).customTools).toEqual([]);
  });

  it("captures fetched text per URL source, ignoring errors, other URLs, and URL spelling differences", () => {
    const kit = buildSourceToolkit({
      store: memoryStore({}),
      sources: [web("S1", "u1", "https://Example.org/a/"), web("S2", "u2", "https://example.org/b")],
      maxToolCalls: 5,
    });
    const fetch = (url: string, body: string, isError = false) =>
      kit.onToolResult({ toolName: "fetch_content", toolCallId: url, args: { url }, text: body, isError });

    fetch("https://example.org/a#section", "nội dung A");
    fetch("https://example.org/b", "lỗi 500", true);
    fetch("https://other.example/x", "trang lạ");

    expect(kit.openedText("u1", 99)).toBe("nội dung A");
    expect(kit.openedText("u2", 1)).toBeUndefined();
    expect(kit.stats().toolCalls).toBe(3);
  });
});

describe("engine tool hooks", () => {
  it("selectSessionTools is the de-duplicated union of custom and web tools, empty by default", () => {
    const custom = [{ name: "search_source" }, { name: "fetch_content" }] as never;
    expect(selectSessionTools(undefined, false)).toEqual([]);
    expect(selectSessionTools(custom, false)).toEqual(["search_source", "fetch_content"]);
    const both = selectSessionTools(custom, true);
    expect(both).toContain("search_source");
    expect(both.filter((n) => n === "fetch_content")).toHaveLength(1);
    expect(WEB_TOOL_NAMES.every((n) => both.includes(n))).toBe(true);
  });

  it("pairs start (args) with end (result) per call, and a throwing callback cannot break the run", () => {
    const seen: unknown[] = [];
    const errors: unknown[] = [];
    const listener = createToolResultListener(
      (event) => {
        seen.push(event);
        if (event.toolCallId === "bad") throw new Error("boom");
      },
      (err) => errors.push(err),
    );
    const call = (id: string, args: unknown, text: string, isError = false) => {
      listener({ type: "tool_execution_start", toolCallId: id, toolName: "fetch_content", args } as never);
      listener({ type: "tool_execution_end", toolCallId: id, toolName: "fetch_content", result: { content: [{ type: "text", text }] }, isError } as never);
    };
    call("1", { url: "https://example.org" }, "xin chào");
    call("bad", {}, "x");
    call("2", {}, "lỗi", true);

    expect(seen).toHaveLength(3);
    expect(seen[0]).toEqual({ toolName: "fetch_content", toolCallId: "1", args: { url: "https://example.org" }, text: "xin chào", isError: false });
    expect(errors).toHaveLength(1);
    expect(seen[2]).toMatchObject({ isError: true });
  });
});
