import { describe, expect, it } from "bun:test";
import { ResearcherAgentOutputSchema, SourceQuerySchema } from "@repo/shared";
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

  it("strips catalog source ids from agent-generated researcher output", () => {
    const output = ResearcherAgentOutputSchema.parse({
      topic: "Bạch Đằng",
      historicalTimeframe: "1288",
      geographicScope: "Bạch Đằng",
      sourcesCatalogue: [{
        id: "src-1",
        name: "Đại Việt sử ký toàn thư",
        authorOrOrigin: "Ngô Sĩ Liên",
        tier: "TIER_1_CHINH_SU",
        tierDescription: "Chính sử",
        reliabilityScore: 10,
        crossVerificationNotes: "Đối chiếu",
        isPrimaryAssertionSource: true,
        catalogSourceId: crypto.randomUUID(),
      }],
      narrativeMenu: [],
      initialResearchQuestions: [],
    });
    expect("catalogSourceId" in output.sourcesCatalogue[0]!).toBe(false);
  });
});
