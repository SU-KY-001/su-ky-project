import { z } from "zod";
import { HITL_GATED_STEPS, type StepType } from "./api";

export const ReviewPolicySchema = z.enum(["AUTO_CONTINUE", "REVIEW_REQUIRED"]);

export type ReviewPolicy = z.infer<typeof ReviewPolicySchema>;

const REVIEW_REQUIRED_STEPS: readonly StepType[] = HITL_GATED_STEPS;

/** Ai là người/nhóm phải ký duyệt ở bước này (hiển thị trên dashboard). */
export const STEP_REVIEWER: Record<StepType, string> = {
  RESEARCHER: "Moderator · Duyệt nguồn & chọn trọng tâm kể (Gate 0)",
  SOURCE_EVALUATOR: "Tự động",
  FACT_EXTRACTOR: "Tự động",
  STORY_PLANNER: "Moderator · Biên tập dàn ý SPDC (Gate 1)",
  SCRIPT_WRITER: "Tự động",
  ORALIZER: "Tự động",
  FACT_CHECKER: "Moderator · Phê duyệt xuất bản (Gate 2)",
};

export function reviewPolicyFor(stepType: StepType): ReviewPolicy {
  return REVIEW_REQUIRED_STEPS.includes(stepType) ? "REVIEW_REQUIRED" : "AUTO_CONTINUE";
}

export function reviewerFor(stepType: StepType): string {
  return STEP_REVIEWER[stepType];
}
