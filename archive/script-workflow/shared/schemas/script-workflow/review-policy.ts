import { z } from "zod";
import { HITL_GATED_STEPS, type StepType } from "./api";

export const ReviewPolicySchema = z.enum(["AUTO_CONTINUE", "REVIEW_REQUIRED"]);

export type ReviewPolicy = z.infer<typeof ReviewPolicySchema>;

const REVIEW_REQUIRED_STEPS: readonly StepType[] = HITL_GATED_STEPS;

/** Ai là người/nhóm phải ký duyệt ở bước này (hiển thị trên dashboard). */
export const STEP_REVIEWER: Record<StepType, string> = {
  RESEARCHER: "Moderator · Duyệt nguồn & chọn trọng tâm kể",
  SOURCE_EVALUATOR: "Moderator · Duyệt kết quả thẩm định nguồn",
  FACT_EXTRACTOR: "Moderator · Duyệt sự kiện đã trích xuất",
  STORY_PLANNER: "Moderator · Biên tập dàn ý SPDC",
  SCRIPT_WRITER: "Moderator · Duyệt kịch bản",
  ORALIZER: "Moderator · Duyệt bản văn nói",
  FACT_CHECKER: "Moderator · Phê duyệt xuất bản",
};

export function reviewPolicyFor(stepType: StepType): ReviewPolicy {
  return REVIEW_REQUIRED_STEPS.includes(stepType) ? "REVIEW_REQUIRED" : "AUTO_CONTINUE";
}

export function reviewerFor(stepType: StepType): string {
  return STEP_REVIEWER[stepType];
}
