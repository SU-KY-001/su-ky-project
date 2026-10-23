import {
  PublicationApprovalSchema,
  PublishEpisodeExceptionSchema,
  rightsExpiryInstant,
  type EpisodeReadiness,
  type PublicationApproval,
  type PublicationAssessment,
} from "@repo/shared";
import { DomainError } from "../../../core/errors/domain-error";

/** What the content looked like when the gate was evaluated; the same facts feed approve and final publish. */
export interface PublicationFacts {
  hasAiVoice: boolean;
  hasWarnings: boolean;
  now: Date;
}

/** How an episode is allowed to go live: a current review approval, or an Admin exception that records its own. */
export type EpisodePublishGate =
  | { mode: "APPROVAL"; hasWarnings: boolean }
  | {
      mode: "ADMIN_EXCEPTION";
      hasWarnings: boolean;
      exceptionReason: string;
      assessment: PublicationAssessment;
    };

export const hasPublicationWarnings = (readiness: EpisodeReadiness): boolean =>
  readiness.items.some((item) => item.level === "WARNING" && item.state === "WARN");

/** Reads the raw `audioAnalysis` JSON so legacy or unparsable rows are still detected as AI audio when they say so. */
export function hasAiVoiceAudio(narrations: ReadonlyArray<{ audioAnalysis?: unknown }>): boolean {
  return narrations.some(({ audioAnalysis }) => {
    if (!audioAnalysis || typeof audioAnalysis !== "object" || !("origin" in audioAnalysis)) return false;
    const { origin } = audioAnalysis;
    return Boolean(origin) && typeof origin === "object" && origin !== null && "kind" in origin && origin.kind === "AI_VOICE";
  });
}

/** Rights must still be valid, AI audio must be disclosed, and open warnings need a written reason. */
export function assertAssessmentGate(assessment: PublicationAssessment, facts: PublicationFacts): void {
  if (assessment.rightsExpiresAt && rightsExpiryInstant(assessment.rightsExpiresAt) < facts.now.getTime())
    throw new DomainError(422, "RIGHTS_EXPIRED", "Quyền sử dụng đã hết hạn; cập nhật hạn quyền hoặc gia hạn trước khi duyệt/phát hành");
  if (facts.hasAiVoice && !assessment.aiDisclosure)
    throw new DomainError(422, "AI_DISCLOSURE_REQUIRED", "Âm thanh dùng giọng AI nên bắt buộc có nội dung công khai AI");
  if (facts.hasWarnings && !assessment.warningAcceptance)
    throw new DomainError(422, "WARNING_ACCEPTANCE_REQUIRED", "Còn cảnh báo chưa xử lý; ghi rõ lý do chấp nhận trước khi duyệt/phát hành");
}

/** Stored approvals are JSON; anything that no longer parses counts as "no approval". */
export function parsePublicationApproval(value: unknown): PublicationApproval | null {
  const parsed = PublicationApprovalSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}

/** Approval valid for exactly this content revision, else null. */
export function currentPublicationApproval(
  value: unknown,
  contentRevision: number,
): PublicationApproval | null {
  const approval = parsePublicationApproval(value);
  return approval?.contentRevision === contentRevision ? approval : null;
}

/** Re-parses an Admin exception at the transaction boundary so a bypassed route cannot skip the reason rule. */
export function parseAdminException(gate: Extract<EpisodePublishGate, { mode: "ADMIN_EXCEPTION" }>) {
  const parsed = PublishEpisodeExceptionSchema.pick({ exceptionReason: true, assessment: true }).safeParse({
    exceptionReason: gate.exceptionReason,
    assessment: gate.assessment,
  });
  if (!parsed.success)
    throw new DomainError(422, "VALIDATION_ERROR", "Lý do ngoại lệ hoặc kết luận phát hành chưa hợp lệ");
  return parsed.data;
}
