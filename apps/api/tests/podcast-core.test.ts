import { describe, expect, it } from "bun:test";
import { SourceQuerySchema } from "@repo/shared";
import { toSlug } from "../src/core/slug";

describe("podcast backend core contracts", () => {
  it("normalizes Vietnamese titles into stable URL slugs", () => {
    expect(toSlug("Khởi nghĩa Hai Bà Trưng", 80)).toBe("khoi-nghia-hai-ba-trung");
    expect(toSlug("Đại Việt", 5)).toBe("dai-v");
  });

  it("parses includeArchived=false as false", () => {
    expect(SourceQuerySchema.parse({ includeArchived: "false" }).includeArchived).toBe(false);
    expect(SourceQuerySchema.parse({ includeArchived: "true" }).includeArchived).toBe(true);
  });
});
