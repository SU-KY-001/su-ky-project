import { z } from "zod";
import { NarrativeFocusSelectionSchema } from "./research-consultation";
import { StepTypeSchema } from "./api";

/**
 * Quyết định của Moderator trên một node của cây thực thi.
 *
 * Trước đây là 3 route động từ (`/steps/:type/continue|rerun|direct-edit`); gộp lại
 * thành một endpoint `POST /workflows/:id/step-decisions` vì cả ba cùng thao tác trên
 * một tài nguyên (node) và chỉ khác payload.
 */
export const STEP_DECISION_ACTIONS = ["CONTINUE", "RERUN", "DIRECT_EDIT"] as const;

export type StepDecisionAction = (typeof STEP_DECISION_ACTIONS)[number];

const nodeBase = {
  stepType: StepTypeSchema,
  /** Node Moderator đang thao tác — cũng là khoá lạc quan (optimistic lock). */
  baseVersion: z.number().int().positive(),
};

export const StepDecisionRequestSchema = z.discriminatedUnion("action", [
  z.object({
    ...nodeBase,
    action: z.literal("CONTINUE"),
    incomingGuidance: z.string().optional(),
    /** Chỉ dùng ở Gate 0: trọng tâm kể Moderator chọn từ Menu (hoặc tự nhập). */
    narrativeSelection: NarrativeFocusSelectionSchema.optional(),
  }),
  z.object({
    // RERUN không mang `baseVersion`: nhánh mới fork từ cha của node hiện hành,
    // service tự đọc node hiện tại nên một khoá lạc quan ở đây sẽ là tham số chết.
    stepType: StepTypeSchema,
    action: z.literal("RERUN"),
    feedback: z.string().min(1),
  }),
  z.object({
    ...nodeBase,
    action: z.literal("DIRECT_EDIT"),
    editedOutputJson: z.unknown(),
    note: z.string().optional(),
  }),
]);

export type StepDecisionRequest = z.infer<typeof StepDecisionRequestSchema>;

/** Xuất bản tường minh một node đã duyệt (dùng khi muốn publish lại node cũ). */
export const CreatePublicationRequestSchema = z.object({
  approvedVersionId: z.number().int().positive(),
});

export type CreatePublicationRequest = z.infer<typeof CreatePublicationRequestSchema>;
