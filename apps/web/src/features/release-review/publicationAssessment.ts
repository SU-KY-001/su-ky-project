import type { EpisodeReadiness, EpisodeWorkspaceDto, PublicationAssessment } from "@repo/shared";

/** Mirror PublicationAssessmentSchema so the form blocks exactly what the server would reject. */
export const ASSESSMENT_NOTE_MIN_CHARS = 10;
export const ASSESSMENT_NOTE_MAX_CHARS = 5000;
export const ASSESSMENT_CREDITS_MAX_CHARS = 5000;
export const ASSESSMENT_DISCLOSURE_MAX_CHARS = 2000;
export const ASSESSMENT_WARNING_MAX_CHARS = 5000;
export const EXCEPTION_REASON_MIN_CHARS = 20;
export const EXCEPTION_REASON_MAX_CHARS = 5000;
const ISO_DATE_LENGTH = 10;

/** Text the user typed, kept as strings so the inputs stay controlled; converted by `toAssessment`. */
export interface AssessmentDraft {
  editorialNote: string;
  rightsNote: string;
  audioNote: string;
  credits: string;
  /** `YYYY-MM-DD` from a date input, or empty when the rights do not expire. */
  rightsExpiresAt: string;
  aiDisclosure: string;
  warningAcceptance: string;
}

export const emptyAssessmentDraft = (): AssessmentDraft => ({
  editorialNote: "", rightsNote: "", audioNote: "", credits: "", rightsExpiresAt: "", aiDisclosure: "", warningAcceptance: "",
});

/** What the server demands on top of the three notes, derived from the episode being approved. */
export interface AssessmentRequirements {
  /** An AI voice recording is attached, so listeners must be told. */
  disclosure: boolean;
  /** Readiness has WARN rows; the reviewer must say why publishing is still acceptable. */
  warning: boolean;
}

export function assessmentRequirements(episode: EpisodeWorkspaceDto, readiness: EpisodeReadiness): AssessmentRequirements {
  return {
    disclosure: episode.narrations.some((narration) => narration.audioAnalysis?.origin?.kind === "AI_VOICE"),
    warning: readiness.items.some((item) => item.state === "WARN"),
  };
}

export const todayIsoDate = (now: Date = new Date()): string => now.toISOString().slice(0, ISO_DATE_LENGTH);

/** Human-readable list of what is still wrong; empty means the draft is valid. */
export function assessmentProblems(draft: AssessmentDraft, requirements: AssessmentRequirements, now: Date = new Date()): string[] {
  const problems: string[] = [];
  const checkNote = (value: string, label: string) => {
    if (value.trim().length < ASSESSMENT_NOTE_MIN_CHARS) problems.push(`${label} (ít nhất ${ASSESSMENT_NOTE_MIN_CHARS} ký tự)`);
  };
  checkNote(draft.editorialNote, "Kết luận nội dung và nguồn");
  checkNote(draft.rightsNote, "Căn cứ quyền sử dụng");
  checkNote(draft.audioNote, "Kết luận bản nghe");
  // A date-only expiry stays valid through the end of that UTC day (server rule), so today is still allowed.
  if (draft.rightsExpiresAt && draft.rightsExpiresAt < todayIsoDate(now)) problems.push("Quyền đã hết hạn: ngày hết hạn không được trước hôm nay");
  if (requirements.disclosure && !draft.aiDisclosure.trim()) problems.push("Thông báo giọng AI cho người nghe");
  if (requirements.warning && !draft.warningAcceptance.trim()) problems.push("Lý do chấp nhận các cảnh báo");
  return problems;
}

/** Empty optional fields become null, matching the nullable schema fields. */
export function toAssessment(draft: AssessmentDraft): PublicationAssessment {
  return {
    editorialNote: draft.editorialNote.trim(),
    rightsNote: draft.rightsNote.trim(),
    audioNote: draft.audioNote.trim(),
    credits: draft.credits.trim() || null,
    rightsExpiresAt: draft.rightsExpiresAt || null,
    aiDisclosure: draft.aiDisclosure.trim() || null,
    warningAcceptance: draft.warningAcceptance.trim() || null,
  };
}
