import { describe, expect, it } from "bun:test";
import { evaluateReleaseReadiness } from "../src/modules/releases/domain/release-policy";

const scheduledAt = new Date("2026-10-20T13:00:00.000Z");

describe("release readiness policy", () => {
  it("marks an approved current revision as ready before its release time", () => {
    expect(evaluateReleaseReadiness({
      status: "SCHEDULED",
      reviewStatus: "APPROVED",
      reviewedRevision: 4,
      contentRevision: 4,
      checklistReady: true,
      scheduledAt,
    }, new Date("2026-10-20T10:00:00.000Z"))).toEqual({
      state: "READY",
      canPublish: true,
      reason: null,
    });
  });

  it("marks an unfinished schedule at risk within two hours", () => {
    expect(evaluateReleaseReadiness({
      status: "SCHEDULED",
      reviewStatus: "IN_REVIEW",
      reviewedRevision: null,
      contentRevision: 4,
      checklistReady: true,
      scheduledAt,
    }, new Date("2026-10-20T11:30:00.000Z"))).toEqual({
      state: "AT_RISK",
      canPublish: false,
      reason: "REVIEW_NOT_APPROVED",
    });
  });

  it("blocks a due schedule that is not approved", () => {
    expect(evaluateReleaseReadiness({
      status: "SCHEDULED",
      reviewStatus: "IN_REVIEW",
      reviewedRevision: null,
      contentRevision: 4,
      checklistReady: true,
      scheduledAt,
    }, scheduledAt)).toEqual({
      state: "BLOCKED",
      canPublish: false,
      reason: "REVIEW_NOT_APPROVED",
    });
  });

  it("rejects an approved review for a stale content revision", () => {
    expect(evaluateReleaseReadiness({
      status: "SCHEDULED",
      reviewStatus: "APPROVED",
      reviewedRevision: 3,
      contentRevision: 4,
      checklistReady: true,
      scheduledAt,
    }, new Date("2026-10-20T10:00:00.000Z"))).toEqual({
      state: "WAITING",
      canPublish: false,
      reason: "APPROVAL_STALE",
    });
  });

  it("does not reopen a terminal schedule", () => {
    expect(evaluateReleaseReadiness({
      status: "RELEASED",
      reviewStatus: "APPROVED",
      reviewedRevision: 4,
      contentRevision: 4,
      checklistReady: true,
      scheduledAt,
    }, scheduledAt)).toEqual({
      state: "TERMINAL",
      canPublish: false,
      reason: null,
    });
  });
});
