import type { ReleaseBlockReason, ReleasePolicyInput, ReleaseReadiness } from "./release.entity";

const AT_RISK_WINDOW_MS = 2 * 60 * 60 * 1000;

function blockingReason(input: ReleasePolicyInput): ReleaseBlockReason | null {
  if (input.reviewStatus !== "APPROVED") return "REVIEW_NOT_APPROVED";
  if (input.reviewedRevision !== input.contentRevision) return "APPROVAL_STALE";
  if (!input.checklistReady) return "CHECKLIST_INCOMPLETE";
  return null;
}

export function evaluateReleaseReadiness(input: ReleasePolicyInput, now: Date): ReleaseReadiness {
  if (input.status === "RELEASED" || input.status === "CANCELLED") {
    return { state: "TERMINAL", canPublish: false, reason: null };
  }
  if (input.status === "PUBLISHING") {
    return { state: "PROCESSING", canPublish: false, reason: null };
  }

  const reason = blockingReason(input);
  if (!reason) return { state: "READY", canPublish: true, reason: null };

  const remainingMs = input.scheduledAt.getTime() - now.getTime();
  if (remainingMs <= 0) return { state: "BLOCKED", canPublish: false, reason };
  if (remainingMs <= AT_RISK_WINDOW_MS) return { state: "AT_RISK", canPublish: false, reason };
  return { state: "WAITING", canPublish: false, reason };
}
