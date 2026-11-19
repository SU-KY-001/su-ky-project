import { StepTypeSchema, type StepType, type WorkflowEvent } from "@repo/shared";
import { STEP_LABELS, type StatusDescriptor } from "../../../labels";

export type OralizerLintStatus = "passed" | "failed" | null;

const EXACT_EVENT_LABELS: Record<string, StatusDescriptor> = {
  "workflow.created": { label: "Khởi tạo kịch bản", tone: "info" },
  "workflow.completed": { label: "Hoàn tất xuất bản", tone: "success" },
  "workflow.failed": { label: "Kịch bản thất bại", tone: "danger" },
  "workflow.downstream_invalidated": { label: "Các bước sau cần chạy lại", tone: "attention" },
  "step.oralizer.lint_passed": { label: "Chuyển văn nói · Đạt kiểm tra văn nói", tone: "success" },
  "step.oralizer.lint_failed": { label: "Chuyển văn nói · Chưa đạt kiểm tra văn nói", tone: "attention" },
  "decision.continue": { label: "Quyết định · Duyệt & tiếp tục", tone: "success" },
  "decision.approved": { label: "Quyết định · Đã duyệt", tone: "success" },
  "decision.rerun": { label: "Quyết định · Làm lại", tone: "attention" },
  "decision.direct_edit": { label: "Quyết định · Sửa tay", tone: "info" },
};

const STEP_ACTION_DESCRIPTORS: Record<string, StatusDescriptor> = {
  started: { label: "Bắt đầu xử lý", tone: "info" },
  queued: { label: "Đưa vào hàng đợi", tone: "neutral" },
  completed: { label: "Hoàn tất", tone: "success" },
  waiting_for_human: { label: "Chờ bạn duyệt", tone: "attention" },
  approved: { label: "Đã duyệt", tone: "success" },
  forked: { label: "Yêu cầu làm lại", tone: "attention" },
  rerun: { label: "Yêu cầu làm lại", tone: "attention" },
  direct_edited: { label: "Đã sửa tay", tone: "info" },
  retrying: { label: "Thử lại sau lỗi tạm thời", tone: "attention" },
  failed: { label: "Thất bại", tone: "danger" },
  lint_passed: { label: "Đạt kiểm tra văn nói", tone: "success" },
  lint_failed: { label: "Chưa đạt kiểm tra văn nói", tone: "attention" },
};

const PI_EVENT_DESCRIPTORS: Record<string, StatusDescriptor> = {
  "turn.started": { label: "AI bắt đầu lượt xử lý", tone: "info" },
  "turn.ended": { label: "AI hoàn tất lượt xử lý", tone: "neutral" },
  "message.started": { label: "AI bắt đầu soạn nội dung", tone: "info" },
  "message.streaming": { label: "AI đang soạn nội dung", tone: "info" },
  "message.ended": { label: "AI hoàn tất nội dung", tone: "neutral" },
  "tool.started": { label: "AI tra cứu tư liệu", tone: "info" },
  "tool.streaming": { label: "AI đang nhận tư liệu", tone: "info" },
  "tool.ended": { label: "AI hoàn tất tra cứu", tone: "neutral" },
};

function parseStepLabel(rawStep: string | undefined): string | null {
  if (!rawStep) return null;
  const parsed = StepTypeSchema.safeParse(rawStep.toUpperCase());
  return parsed.success ? STEP_LABELS[parsed.data] : null;
}

function withStepPrefix(stepLabel: string | null, descriptor: StatusDescriptor): StatusDescriptor {
  if (!stepLabel) return descriptor;
  return {
    label: `${stepLabel} · ${descriptor.label}`,
    tone: descriptor.tone,
  };
}

/**
 * Maps internal `event.type` names/prefixes to clear Vietnamese labels and tones,
 * never exposing internal terms (`agent`, `node`, `fork`, `STALE`).
 */
export function describeWorkflowEventType(type: string): StatusDescriptor {
  const exact = EXACT_EVENT_LABELS[type];
  if (exact) return exact;

  if (type.startsWith("step.")) {
    const parts = type.split(".");
    const stepLabel = parseStepLabel(parts[1]);
    const actionKey = parts.slice(2).join(".");
    const actionDescriptor = STEP_ACTION_DESCRIPTORS[actionKey];
    if (actionDescriptor) return withStepPrefix(stepLabel, actionDescriptor);
    return withStepPrefix(stepLabel, { label: "Cập nhật bước", tone: "neutral" });
  }

  if (type.startsWith("decision.")) {
    const subType = type.slice("decision.".length);
    const stepLabel = parseStepLabel(subType);
    if (stepLabel) return { label: `Quyết định · ${stepLabel}`, tone: "info" };
    return { label: "Quyết định của biên tập viên", tone: "info" };
  }

  if (type.startsWith("pi.")) {
    const parts = type.split(".");
    const stepLabel = parseStepLabel(parts[1]);
    const piAction = parts.slice(2).join(".");
    const piDescriptor = PI_EVENT_DESCRIPTORS[piAction];
    if (piDescriptor) return withStepPrefix(stepLabel, piDescriptor);
    return withStepPrefix(stepLabel, { label: "AI đang xử lý", tone: "info" });
  }

  if (type.startsWith("workflow.")) {
    return { label: "Cập nhật kịch bản", tone: "info" };
  }

  return { label: "Sự kiện hệ thống", tone: "neutral" };
}

const STEP_TYPE_KEYS: readonly StepType[] = StepTypeSchema.options;

/**
 * Replaces raw internal vocabulary (`agent`, `node`, `fork`, `STALE`, and raw StepType codes)
 * in server log messages so internal terms never leak into the UI while preserving the message.
 */
export function formatEventMessage(message: string): string {
  let result = message;
  for (const stepType of STEP_TYPE_KEYS) {
    result = result.replace(new RegExp(`\\b${stepType}\\b`, "g"), STEP_LABELS[stepType]);
  }
  return result
    .replace(/\bforked\b/gi, "làm lại")
    .replace(/\bfork\b/gi, "làm lại")
    .replace(/\bnodes\b/gi, "phiên bản")
    .replace(/\bnode\b/gi, "phiên bản")
    .replace(/\bagents\b/gi, "AI")
    .replace(/\bagent\b/gi, "AI")
    .replace(/\bSTALE\b/g, "Cần chạy lại");
}

/**
 * Returns `"passed" | "failed" | null` from the latest `step.oralizer.lint_*` event
 * so `OralizerPanel` can display a linter status badge.
 */
export function findOralizerLintStatus(events: readonly WorkflowEvent[] | undefined): OralizerLintStatus {
  if (!events || events.length === 0) return null;

  let latestEvent: WorkflowEvent | null = null;
  for (const event of events) {
    if (event.type !== "step.oralizer.lint_passed" && event.type !== "step.oralizer.lint_failed") {
      continue;
    }
    if (!latestEvent || event.id >= latestEvent.id) {
      latestEvent = event;
    }
  }

  if (!latestEvent) return null;
  return latestEvent.type === "step.oralizer.lint_passed" ? "passed" : "failed";
}
