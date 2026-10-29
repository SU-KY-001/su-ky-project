import type { EpisodeReadiness, ReadinessItem, ReadinessKey } from "@repo/shared";

/** Returns the row text, or null to hide the row (e.g. "all fine" rows that add no information). */
type Label = (item: ReadinessItem) => string | null;

const NARRATION_NAME = { THIRD_PERSON: "ngôi thứ ba", FIRST_PERSON: "ngôi thứ nhất" } as const;
const MS_PER_SECOND = 1000;
const SECONDS_PER_MINUTE = 60;
const FIRST_PERSON_MISSING = { NARRATOR: "người kể", SCRIPT: "kịch bản", AUDIO: "âm thanh sẵn sàng" } as const;

const num = (item: ReadinessItem, name: string): number => Number(item.params?.[name] ?? 0);
const who = (item: ReadinessItem): string => (item.narration ? ` (${NARRATION_NAME[item.narration]})` : "");

export function formatMs(ms: number): string {
  const total = Math.round(ms / MS_PER_SECOND);
  return `${Math.floor(total / SECONDS_PER_MINUTE)} phút ${total % SECONDS_PER_MINUTE} giây`;
}

/** Wording for AI rows always says "nghi ngờ, chưa xác minh"; a zero count is never presented as a confirmation. */
export const readinessLabels: Record<ReadinessKey, Label> = {
  BASIC_INFO: (i) => (i.state === "OK" ? "Có tên tập" : "Thiếu tên tập"),
  THIRD_PERSON_SCRIPT: (i) => (i.state === "OK" ? "Có kịch bản ngôi thứ ba" : "Chưa có kịch bản ngôi thứ ba"),
  THIRD_PERSON_AUDIO: (i) => (i.state === "OK" ? "Âm thanh ngôi thứ ba sẵn sàng" : "Chưa có âm thanh ngôi thứ ba sẵn sàng"),
  SCRIPT_CHANGED_AFTER_AUDIO: (i) => (i.state === "WARN" ? `Kịch bản sửa sau khi gắn âm thanh${who(i)}: âm thanh có thể không còn khớp` : null),
  DURATION_MISMATCH: (i) =>
    i.state === "WARN" ? `Âm thanh dài ${formatMs(num(i, "audioMs"))} nhưng kịch bản ước tính ${formatMs(num(i, "estimatedMs"))} (lệch ${num(i, "ratio")}%)${who(i)}` : null,
  AUDIO_QUALITY: (i) => (i.state === "WARN" ? `Phân tích âm thanh báo cần xem${who(i)}: tiếng ồn ${i.params?.noiseDb ?? "?"} dB, định dạng ${i.params?.format ?? "?"}` : null),
  AUDIO_UNANALYZED: (i) => (i.state === "INFO" ? `Âm thanh${who(i)} chưa được phân tích đầy đủ` : null),
  AUDIO_DURATION_UNKNOWN: (i) => (i.state === "INFO" ? `Chưa biết thời lượng âm thanh${who(i)}` : null),
  SCRIPT_TOO_SHORT: (i) => (i.state === "WARN" ? `Kịch bản${who(i)} chỉ ${num(i, "words")} từ (ngưỡng ${num(i, "min")})` : null),
  FIRST_PERSON_INCOMPLETE: (i) => (i.state === "WARN" ? `Lời kể ngôi thứ nhất còn thiếu ${FIRST_PERSON_MISSING[i.params?.missing as keyof typeof FIRST_PERSON_MISSING] ?? "một phần"}` : null),
  ENTITY_TAGS_UNCONFIRMED: (i) => (i.state === "WARN" ? `${num(i, "count")} thẻ nhân vật/sự kiện chưa xác nhận` : "Thẻ nhân vật, sự kiện đã xác nhận"),
  ENTITY_TAGS_NONE: (i) => (i.state === "INFO" ? "Chưa có thẻ nhân vật/sự kiện nào được xác nhận" : null),
  SERIES_NOT_PUBLISHED: (i) => (i.state === "WARN" ? "Series chưa xuất bản" : null),
  EPISODE_DESCRIPTION: (i) => (i.state === "INFO" ? "Tập chưa có mô tả" : null),
  EPISODE_POSTER: (i) => (i.state === "INFO" ? "Tập chưa có ảnh bìa riêng" : null),
  EPISODE_LOCKED: () => "Tập đang bị Admin khóa",
  AI_REVIEW_NOT_RUN: () => "Chưa chạy AI rà kịch bản cho tập này",
  AI_REVIEW_SUMMARY: (i) => {
    const total = num(i, "total");
    if (total === 0) return "AI không thấy gì đáng chú ý ở các đoạn đã xét (không phải xác nhận)";
    const high = num(i, "openHigh");
    return `AI nghi ngờ ${total} chỗ, ${num(i, "reviewed")} đã xem, ${num(i, "applied")} đã áp dụng đề xuất (chưa xác minh)${high ? `; ${high} chỗ mức cao chưa xem` : ""}`;
  },
  AI_REVIEW_STALE: () => "Kịch bản đã sửa sau lần AI rà gần nhất",
  AI_REVIEW_INCOMPLETE: (i) => `Lượt AI rà gần nhất chưa trọn vẹn (${i.params?.errorCode ?? "không rõ"})`,
};

export const AI_READINESS_KEYS: ReadonlySet<ReadinessKey> = new Set(["AI_REVIEW_NOT_RUN", "AI_REVIEW_SUMMARY", "AI_REVIEW_STALE", "AI_REVIEW_INCOMPLETE"]);

/** The mock's three row labels; INFO rows are notes, not a state of the episode, so they carry no label. */
export const STATE_LABEL: Partial<Record<ReadinessItem["state"], { text: string; tone: "ok" | "warn" | "missing" }>> = {
  OK: { text: "Đủ", tone: "ok" },
  WARN: { text: "Cảnh báo", tone: "warn" },
  MISSING: { text: "Thiếu", tone: "missing" },
};

/** One non-empty line per paragraph, matching how the script is stored (`\n` between paragraphs). */
export const paragraphCount = (script: string): number => script.split(/\n+/).filter((line) => line.trim()).length;

export function formatClock(ms: number): string {
  const total = Math.round(ms / MS_PER_SECOND);
  return `${String(Math.floor(total / SECONDS_PER_MINUTE)).padStart(2, "0")}:${String(total % SECONDS_PER_MINUTE).padStart(2, "0")}`;
}
