import { describe, expect, it } from "bun:test";
import { CreateAiCheckSchema, PatchAiCheckItemSchema, hashBlockText, AI_CHECK_MAX_BLOCKS } from "@repo/shared";

const block = (i: number, text = `đoạn ${i}`) => ({ ref: `b${i}`, text, hash: hashBlockText(text), prev: "", dup: 1 });
const valid = (blocks = [block(0)]) => ({ kind: "SCRIPT_REVIEW" as const, scope: "ALL" as const, blocks });

describe("hashBlockText", () => {
  it("không đổi theo NFC và khoảng trắng", () => {
    expect(hashBlockText("e\u0301  a\n b ")).toBe(hashBlockText("\u00e9 a b"));
  });
  it("đổi khi nội dung đổi", () => {
    expect(hashBlockText("a")).not.toBe(hashBlockText("b"));
  });
});

describe("CreateAiCheckSchema", () => {
  it("nhận request hợp lệ", () => {
    expect(CreateAiCheckSchema.safeParse(valid()).success).toBe(true);
  });
  it("từ chối ref trùng", () => {
    expect(CreateAiCheckSchema.safeParse(valid([block(0), block(0)])).success).toBe(false);
  });
  it("blocks tối thiểu 1, tối đa MAX_BLOCKS", () => {
    expect(CreateAiCheckSchema.safeParse(valid([])).success).toBe(false);
    const many = Array.from({ length: AI_CHECK_MAX_BLOCKS + 1 }, (_, i) => block(i));
    expect(CreateAiCheckSchema.safeParse(valid(many)).success).toBe(false);
    expect(CreateAiCheckSchema.safeParse(valid(many.slice(0, AI_CHECK_MAX_BLOCKS))).success).toBe(true);
  });
});

describe("PatchAiCheckItemSchema", () => {
  it("cần ít nhất một trường", () => {
    expect(PatchAiCheckItemSchema.safeParse({}).success).toBe(false);
  });
  it("status chỉ nhận REVIEWED", () => {
    expect(PatchAiCheckItemSchema.safeParse({ status: "OPEN" }).success).toBe(false);
    expect(PatchAiCheckItemSchema.safeParse({ status: "REVIEWED" }).success).toBe(true);
    expect(PatchAiCheckItemSchema.safeParse({ applied: true }).success).toBe(true);
  });
});
