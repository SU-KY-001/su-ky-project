import { describe, expect, it } from "bun:test";
import type { EditorDocument } from "@repo/shared";
import { blockTexts, buildBlocks, extractBlocks, locateBlock, type BlockLocator } from "./blockRefs";
import { novelHint } from "./novelHint";
import { wordDiff } from "./wordDiff";

const para = (text: string) => ({ type: "paragraph" as const, content: text ? [{ type: "text" as const, text }] : [] });

describe("blockTexts", () => {
  it("takes paragraphs, headings and list/quote paragraphs in document order, skipping blank ones", () => {
    const doc: EditorDocument = {
      type: "doc",
      content: [
        { type: "heading", attrs: { level: 1 }, content: [{ type: "text", text: "Mở đầu" }] },
        para(""),
        { type: "bulletList", content: [{ type: "listItem", content: [para("ý một")] }] },
        { type: "blockquote", content: [para("trích")] },
        { type: "paragraph", content: [{ type: "text", text: "a" }, { type: "hardBreak" }, { type: "text", text: "b" }] },
      ],
    };
    expect(blockTexts(doc)).toEqual(["Mở đầu", "ý một", "trích", "a\nb"]);
  });
});

describe("buildBlocks", () => {
  it("numbers blocks, links the previous hash and counts duplicates over the whole document", () => {
    const [first, second, third] = buildBlocks(["Lý Thái Tổ dời đô", "Đoạn khác", "Lý  Thái Tổ dời đô"]);
    expect([first!.ref, second!.ref, third!.ref]).toEqual(["b0", "b1", "b2"]);
    expect(first!.prev).toBe("");
    expect(second!.prev).toBe(first!.hash);
    expect(first!.hash).toBe(third!.hash);
    expect([first!.dup, second!.dup, third!.dup]).toEqual([2, 1, 2]);
  });
});

describe("locateBlock (spec B1)", () => {
  const texts = ["một", "hai", "ba", "bốn"];
  const loc = (blocks = buildBlocks(texts), index = 2): BlockLocator => ({
    blockRef: blocks[index]!.ref,
    blockHash: blocks[index]!.hash,
    blockPrevHash: blocks[index]!.prev,
    blockDup: blocks[index]!.dup,
  });

  it("(1) same slot, same hash and same previous hash", () => {
    expect(locateBlock(buildBlocks(texts), loc())).toBe("b2");
  });

  it("(2) follows a unique block that moved down after an insert above", () => {
    expect(locateBlock(buildBlocks(["mới", ...texts]), loc())).toBe("b3");
  });

  it("conflicts when the target text was edited or deleted", () => {
    expect(locateBlock(buildBlocks(["một", "hai", "ba sửa", "bốn"]), loc())).toBe("conflict");
    expect(locateBlock(buildBlocks(["một", "hai", "bốn"]), loc())).toBe("conflict");
  });

  it("conflicts when the hash is no longer unique, never jumping to a twin", () => {
    expect(locateBlock(buildBlocks(["mới", ...texts, "ba"]), loc())).toBe("conflict");
  });

  it("(3) a duplicated target applies only in its own slot with the same neighbour", () => {
    const original = buildBlocks(["x", "lặp", "y", "lặp"]);
    const target = loc(original, 3);
    expect(target.blockDup).toBe(2);
    expect(locateBlock(original, target)).toBe("b3");
    expect(locateBlock(buildBlocks(["lặp", "x", "y", "lặp"]), { ...target, blockPrevHash: original[2]!.hash })).toBe("b3");
    expect(locateBlock(buildBlocks(["x", "lặp", "lặp"]), target)).toBe("conflict");
  });

  it("extractBlocks agrees with buildBlocks(blockTexts)", () => {
    const doc: EditorDocument = { type: "doc", content: [para("một"), para("hai")] };
    expect(extractBlocks(doc)).toEqual(buildBlocks(["một", "hai"]));
  });
});

describe("wordDiff", () => {
  it("marks only the changed words", () => {
    const parts = wordDiff("Ngô Quyền thắng ở Bạch Đằng năm 938", "Ngô Quyền đại thắng ở Bạch Đằng năm 938");
    expect(parts.filter((p) => p.kind === "add").map((p) => p.text.trim())).toEqual(["đại"]);
    expect(parts.filter((p) => p.kind === "del")).toEqual([]);
    expect(parts.map((p) => p.text).join("")).toBe("Ngô Quyền đại thắng ở Bạch Đằng năm 938");
  });

  it("shows replaced words as del + add and rebuilds both sides", () => {
    const before = "vua dời đô năm 1010";
    const after = "vua dời đô năm 1009";
    const parts = wordDiff(before, after);
    expect(parts.filter((p) => p.kind !== "add").map((p) => p.text).join("")).toBe(before);
    expect(parts.filter((p) => p.kind !== "del").map((p) => p.text).join("")).toBe(after);
    expect(parts.find((p) => p.kind === "add")?.text).toBe("1009");
  });

  it("falls back to a whole replace for huge inputs", () => {
    const big = Array.from({ length: 600 }, (_, i) => `a${i}`).join(" ");
    const other = Array.from({ length: 600 }, (_, i) => `b${i}`).join(" ");
    expect(wordDiff(big, other)).toEqual([{ kind: "del", text: big }, { kind: "add", text: other }]);
  });
});

describe("novelHint", () => {
  it("flags new numbers and mid-sentence names, ignores sentence starts and known words", () => {
    expect(novelHint("Vua dời đô năm 1010 về Đại La.", "Vua dời đô năm 1009. Sau đó Lý Công Uẩn về Đại La.")).toEqual(["1009", "Lý", "Công", "Uẩn"]);
  });

  it("returns nothing when the suggestion adds no number or name", () => {
    expect(novelHint("Vua dời đô năm 1010.", "Năm 1010, vua dời đô.")).toEqual([]);
  });
});
