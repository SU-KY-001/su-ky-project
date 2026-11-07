import type { EpisodeReviewStatus, ReleaseScheduleStatus } from "@repo/shared";

export type ReleaseBlockReason =
  | "REVIEW_NOT_APPROVED"
  | "APPROVAL_STALE"
  | "CHECKLIST_INCOMPLETE";

export interface ReleasePolicyInput {
  status: ReleaseScheduleStatus;
  reviewStatus: EpisodeReviewStatus | null;
  reviewedRevision: number | null;
  contentRevision: number;
  checklistReady: boolean;
  scheduledAt: Date;
}

export interface ReleaseReadiness {
  state: "WAITING" | "AT_RISK" | "READY" | "BLOCKED" | "PROCESSING" | "TERMINAL";
  canPublish: boolean;
  reason: ReleaseBlockReason | null;
}
