import type { StepStatus, StepType, WorkflowStatus } from "@repo/shared";

export const STEP_LABELS: Record<StepType, string> = {
  RESEARCHER: "Tư vấn biên tập",
  SOURCE_EVALUATOR: "Thẩm định nguồn",
  FACT_EXTRACTOR: "Trích xuất sự kiện",
  STORY_PLANNER: "Dàn ý 3 tập",
  SCRIPT_WRITER: "Viết kịch bản",
  ORALIZER: "Chuyển văn nói",
  FACT_CHECKER: "Kiểm định và xuất bản",
};

export const GATE_LABELS: Partial<Record<StepType, string>> = {
  RESEARCHER: "Cổng 1",
  SOURCE_EVALUATOR: "Cổng 2",
  FACT_EXTRACTOR: "Cổng 3",
  STORY_PLANNER: "Cổng 4",
  SCRIPT_WRITER: "Cổng 5",
  ORALIZER: "Cổng 6",
  FACT_CHECKER: "Cổng 7",
};

export const GATE_ACTION_HINTS: Partial<Record<StepType, string>> = {
  RESEARCHER: "Chọn trọng tâm",
  SOURCE_EVALUATOR: "Duyệt thẩm định nguồn",
  FACT_EXTRACTOR: "Duyệt sự kiện",
  STORY_PLANNER: "Duyệt dàn ý",
  SCRIPT_WRITER: "Duyệt kịch bản",
  ORALIZER: "Duyệt văn nói",
  FACT_CHECKER: "Duyệt và xuất bản",
};

/** Visual tone, mapped to mod-* tokens by the badge component. */
export type StatusTone = "neutral" | "info" | "attention" | "success" | "danger";

export type StatusDescriptor = { label: string; tone: StatusTone };

export const WORKFLOW_STATUS: Record<WorkflowStatus, StatusDescriptor> = {
  PENDING: { label: "Chuẩn bị", tone: "neutral" },
  RUNNING: { label: "Đang chạy", tone: "info" },
  WAITING_FOR_HUMAN: { label: "Chờ bạn duyệt", tone: "attention" },
  COMPLETED: { label: "Hoàn tất", tone: "success" },
  FAILED: { label: "Thất bại", tone: "danger" },
};

export const STEP_STATUS: Record<StepStatus, StatusDescriptor> = {
  PENDING: { label: "Chưa đến bước này", tone: "neutral" },
  QUEUED: { label: "Đang xếp hàng", tone: "neutral" },
  RUNNING: { label: "AI đang xử lý", tone: "info" },
  WAITING_FOR_HUMAN: { label: "Chờ bạn duyệt", tone: "attention" },
  COMPLETED: { label: "Hoàn tất", tone: "success" },
  FAILED: { label: "Thất bại", tone: "danger" },
  STALE: { label: "Cần chạy lại", tone: "neutral" },
};

/** dd/MM/yyyy HH:mm */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

const RELATIVE_FORMAT = new Intl.RelativeTimeFormat("vi-VN", { numeric: "auto" });
const RELATIVE_UNITS: readonly { unit: Intl.RelativeTimeFormatUnit; seconds: number }[] = [
  { unit: "day", seconds: 86_400 },
  { unit: "hour", seconds: 3_600 },
  { unit: "minute", seconds: 60 },
];

export function formatRelative(iso: string, now: number = Date.now()): string {
  const diffSeconds = Math.round((new Date(iso).getTime() - now) / 1000);
  for (const { unit, seconds } of RELATIVE_UNITS) {
    if (Math.abs(diffSeconds) >= seconds) return RELATIVE_FORMAT.format(Math.round(diffSeconds / seconds), unit);
  }
  return "vừa xong";
}

export function formatDuration(totalSeconds: number): string {
  const minutes = Math.max(1, Math.round(totalSeconds / 60));
  return `~${minutes} phút`;
}

export function formatWords(words: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(words)} từ`;
}
