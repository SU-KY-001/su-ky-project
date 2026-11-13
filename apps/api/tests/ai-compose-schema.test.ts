import { describe, expect, it } from "bun:test";
import {
  ANGLE_GUIDE_MAX,
  ANGLE_NAME_MAX,
  CreateAngleSchema,
  CreateOutlineSchema,
  OUTLINE_MAX_WORDS,
  OUTLINE_MIN_WORDS,
  RewriteRequestSchema,
  ToneSchema,
  UpdateAngleSchema,
} from "@repo/shared";

const block = (n: number) => ({ ref: `b${n}`, text: "x", hash: "h" });

describe("angle schemas", () => {
  it("name is required (1..max), description and guide may be empty", () => {
    expect(CreateAngleSchema.safeParse({ name: "A", description: "", guide: "" }).success).toBe(true);
    expect(CreateAngleSchema.safeParse({ name: "  ", description: "", guide: "" }).success).toBe(false);
    expect(CreateAngleSchema.safeParse({ name: "n".repeat(ANGLE_NAME_MAX + 1), description: "", guide: "" }).success).toBe(false);
    expect(CreateAngleSchema.safeParse({ name: "A", description: "", guide: "g".repeat(ANGLE_GUIDE_MAX + 1) }).success).toBe(false);
  });
  it("update needs at least one field", () => {
    expect(UpdateAngleSchema.safeParse({}).success).toBe(false);
    expect(UpdateAngleSchema.safeParse({ guide: "" }).success).toBe(true);
  });
});

describe("compose schemas", () => {
  it("tone is a preset or custom text, never both or neither", () => {
    expect(ToneSchema.safeParse({ preset: "calm" }).success).toBe(true);
    expect(ToneSchema.safeParse({ custom: "ấm áp" }).success).toBe(true);
    expect(ToneSchema.safeParse({ preset: "calm", custom: "x" }).success).toBe(false);
    expect(ToneSchema.safeParse({ preset: "loud" }).success).toBe(false);
  });
  it("outline word range is enforced", () => {
    const base = { topic: "t", angleId: "builtin:nhan-vat", narration: "THIRD_PERSON" };
    expect(CreateOutlineSchema.safeParse({ ...base, targetWords: OUTLINE_MIN_WORDS }).success).toBe(true);
    expect(CreateOutlineSchema.safeParse({ ...base, targetWords: OUTLINE_MIN_WORDS - 1 }).success).toBe(false);
    expect(CreateOutlineSchema.safeParse({ ...base, targetWords: OUTLINE_MAX_WORDS + 1 }).success).toBe(false);
  });
  it("rewrite: blocks must be contiguous, count defaults to 3 and is capped", () => {
    expect(RewriteRequestSchema.parse({ blocks: [block(4), block(5)] }).count).toBe(3);
    expect(RewriteRequestSchema.safeParse({ blocks: [block(4), block(6)] }).success).toBe(false);
    expect(RewriteRequestSchema.safeParse({ blocks: [block(1)], count: 11 }).success).toBe(false);
    expect(RewriteRequestSchema.safeParse({ blocks: [block(1), block(2), block(3), block(4)] }).success).toBe(false);
  });
});
