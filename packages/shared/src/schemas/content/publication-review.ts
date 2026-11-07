import { z } from "zod";
import { EpisodeReadinessSchema } from "./readiness";

const MAX_NOTE_CHARS = 5000;
const MAX_CREDITS_CHARS = 5000;
const MAX_DISCLOSURE_CHARS = 2000;
const MIN_EXCEPTION_REASON_CHARS = 20;
// The audit row (actor, time, revision) is the record; a typed reason is optional for the one-click publish.
const DEFAULT_EXCEPTION_REASON = "Admin xuất bản trực tiếp, bỏ qua hàng chờ duyệt.";
const DATE_ONLY_LENGTH = "YYYY-MM-DD".length;

const optionalText = (max: number) =>
  z.string().trim().max(max).nullish().transform((value) => value || null);

/** Strict ISO 8601: a real calendar date (`YYYY-MM-DD`) or a date-time with offset. A date-only value stays valid through the end of that UTC day. */
const IsoDateString = z.union([
  z.string().trim().date("Ngày không hợp lệ (YYYY-MM-DD)"),
  z.string().trim().datetime({ offset: true, message: "Ngày giờ không hợp lệ (ISO 8601)" }),
]);

export function rightsExpiryInstant(value: string): number {
  return Date.parse(value.length === DATE_ONLY_LENGTH ? `${value}T23:59:59.999Z` : value);
}

/**
 * The reviewer's accountable conclusions. Text, not machine proof: nothing here is verified automatically, and the
 * person who approves owns the claim. Same shape for a normal APPROVE and for an Admin direct-publish exception.
 */
export const PublicationAssessmentSchema = z.object({
  editorialNote: optionalText(MAX_NOTE_CHARS).describe("Kết luận nội dung/nguồn trọng yếu (tùy chọn)"),
  rightsNote: optionalText(MAX_NOTE_CHARS).describe("Căn cứ quyền cho tài sản sử dụng (tùy chọn, riêng tư, không công khai)"),
  audioNote: optionalText(MAX_NOTE_CHARS).describe("Kết luận sau khi nghe bản âm thanh (tùy chọn)"),
  credits: optionalText(MAX_CREDITS_CHARS).describe("Ghi công hiển thị cho người nghe"),
  rightsExpiresAt: IsoDateString.nullish().transform((value) => value ?? null).describe("Hạn quyền sử dụng; phải còn hạn lúc duyệt và lúc phát hành"),
  aiDisclosure: optionalText(MAX_DISCLOSURE_CHARS).describe("Công khai AI; bắt buộc khi âm thanh là giọng AI"),
  warningAcceptance: optionalText(MAX_CREDITS_CHARS).describe("Lý do chấp nhận cảnh báo; bắt buộc khi còn cảnh báo"),
});

/** Canonical approval kept on the episode for the exact content revision it covers. */
export const PublicationApprovalSchema = z.object({
  contentRevision: z.number().int().positive(),
  assessment: PublicationAssessmentSchema,
  approvedById: z.string(),
  approvedAt: z.coerce.date(),
  exceptionReason: z.string().nullable(),
});

/** What the reviewer saw and concluded at the moment of the decision. */
export const ReviewReadinessSnapshotSchema = z.object({
  readiness: EpisodeReadinessSchema,
  assessment: PublicationAssessmentSchema.nullable(),
});

/** Admin direct publish: skips the review queue only; asset/source/evidence validity still applies. */
export const PublishEpisodeExceptionSchema = z.object({
  baseUpdatedAt: z.coerce.date(),
  exceptionReason: z.string().trim().min(MIN_EXCEPTION_REASON_CHARS).max(MAX_NOTE_CHARS).default(DEFAULT_EXCEPTION_REASON),
  assessment: PublicationAssessmentSchema.default({}),
});

/** The only approval data a listener sees. Notes, rights references and reviewer identity stay private. */
export const PublicPublicationInfoSchema = z.object({
  aiDisclosure: z.string().nullable(),
  credits: z.string().nullable(),
});

export type PublicationAssessment = z.infer<typeof PublicationAssessmentSchema>;
export type PublicationApproval = z.infer<typeof PublicationApprovalSchema>;
export type ReviewReadinessSnapshot = z.infer<typeof ReviewReadinessSnapshotSchema>;
export type PublishEpisodeExceptionInput = z.infer<typeof PublishEpisodeExceptionSchema>;
export type PublishEpisodeExceptionRequest = z.input<typeof PublishEpisodeExceptionSchema>;
export type PublicPublicationInfo = z.infer<typeof PublicPublicationInfoSchema>;
