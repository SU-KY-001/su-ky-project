import { describe, it, expect } from "bun:test";
import {
  CreateScriptWorkflowRequestSchema,
  StepDecisionRequestSchema,
  type ApiResponse,
} from "@repo/shared";
import { app } from "../src/app";
import { lintOralText } from "../src/modules/script-workflow/domain/oral-linter";
import {
  getDownstreamStepTypes,
  getNextStepType,
} from "../src/modules/script-workflow/domain/step-order";
import { parseAgentPayload } from "../src/modules/script-workflow/infrastructure/pg-boss-agent-queue";

describe("Script workflow", () => {
  describe("oral linter", () => {
    it("flags a colon", () => {
      const result = lintOralText("Trần Hưng Đạo nói rằng: quân ta nhất định thắng giặc ngoại xâm.");
      expect(result.passed).toBe(false);
      expect(result.hasForbiddenColons).toBe(true);
    });

    it("flags bullet dashes and parentheses", () => {
      expect(lintOralText("- Mở đầu câu chuyện của chúng ta hôm nay").hasForbiddenHyphens).toBe(true);
      expect(lintOralText("Trận đánh diễn ra rất ác liệt (theo chính sử) trên sông.").hasForbiddenParentheses).toBe(true);
    });

    it("flags fragmented sentences", () => {
      const result = lintOralText("Quân ta thắng. Rất lớn.");
      expect(result.hasFragmentedSentences).toBe(true);
    });

    it("passes clean spoken narration", () => {
      const result = lintOralText(
        "Năm một nghìn hai trăm tám mươi tám, quân Nguyên kéo vào sông Bạch Đằng. Trần Hưng Đạo đã cho đóng cọc gỗ dưới lòng sông từ trước đó."
      );
      expect(result.passed).toBe(true);
    });
  });

  describe("step order", () => {
    it("lists downstream steps in pipeline order", () => {
      expect(getDownstreamStepTypes("STORY_PLANNER")).toEqual([
        "SCRIPT_WRITER",
        "ORALIZER",
        "FACT_CHECKER",
      ]);
    });

    it("has no step after FACT_CHECKER", () => {
      expect(getNextStepType("FACT_CHECKER")).toBeNull();
      expect(getNextStepType("RESEARCHER")).toBe("SOURCE_EVALUATOR");
    });
  });

  describe("contracts", () => {
    it("bounds the topic length", () => {
      expect(CreateScriptWorkflowRequestSchema.safeParse({ topic: "ab" }).success).toBe(false);
      expect(CreateScriptWorkflowRequestSchema.safeParse({ topic: "a".repeat(10001) }).success).toBe(false);
      expect(CreateScriptWorkflowRequestSchema.safeParse({ topic: "  Bạch Đằng 1288  " })).toMatchObject({
        success: true,
        data: { topic: "Bạch Đằng 1288" },
      });
    });

    it("requires feedback on RERUN", () => {
      expect(
        StepDecisionRequestSchema.safeParse({ action: "RERUN", stepType: "STORY_PLANNER" }).success
      ).toBe(false);
      expect(
        StepDecisionRequestSchema.safeParse({
          action: "RERUN",
          stepType: "STORY_PLANNER",
          feedback: "Ngắn hơn",
        }).success
      ).toBe(true);
    });

    it("requires baseVersion on CONTINUE", () => {
      expect(
        StepDecisionRequestSchema.safeParse({ action: "CONTINUE", stepType: "RESEARCHER" }).success
      ).toBe(false);
    });
  });

  describe("queue payload guard", () => {
    it("rejects a payload for another step or with a bad run id", () => {
      expect(parseAgentPayload({ workflowRunId: "1", stepType: "RESEARCHER", parentVersionId: null }, "RESEARCHER")).toBeNull();
      expect(parseAgentPayload({ workflowRunId: 1, stepType: "ORALIZER", parentVersionId: null }, "RESEARCHER")).toBeNull();
    });

    it("accepts a valid payload and drops a malformed narrative selection", () => {
      const payload = parseAgentPayload(
        { workflowRunId: 1, stepType: "SOURCE_EVALUATOR", parentVersionId: 4, narrativeSelection: { seriesTitle: "x" } },
        "SOURCE_EVALUATOR"
      );
      expect(payload).toEqual({
        workflowRunId: 1,
        stepType: "SOURCE_EVALUATOR",
        parentVersionId: 4,
        guidance: undefined,
        narrativeSelection: undefined,
      });
    });
  });

  describe("HTTP access control", () => {
    it("rejects anonymous callers with the standard envelope", async () => {
      const res = await app.request("/api/script-workflows");
      expect(res.status).toBe(401);
      const body = (await res.json()) as ApiResponse<never>;
      expect(body.success).toBe(false);
      expect(body.error?.code).toBe("UNAUTHORIZED");
    });

    it("does not buffer-hang or 404 the SSE path for anonymous callers", async () => {
      const res = await app.request("/api/script-workflows/1/events/stream");
      expect(res.status).toBe(401);
    });
  });
});
