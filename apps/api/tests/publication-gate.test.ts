import { describe, expect, it } from "bun:test";
import {
  PublicationAssessmentSchema,
  PublishEpisodeExceptionSchema,
  rightsExpiryInstant,
  type EpisodeReadiness,
} from "@repo/shared";
import { DomainError } from "../src/core/errors/domain-error";
import {
  assertAssessmentGate,
  currentPublicationApproval,
  hasAiVoiceAudio,
  hasPublicationWarnings,
  parseAdminException,
} from "../src/modules/content/application/publication-gate";

const NOTE = "Đã đối chiếu kịch bản với nguồn chung.";
const base = { editorialNote: NOTE, rightsNote: NOTE, audioNote: NOTE };
const now = new Date("2026-10-23T08:00:00.000Z");
const facts = { hasAiVoice: false, hasWarnings: false, now };
const assessment = (patch: Record<string, unknown> = {}) => PublicationAssessmentSchema.parse({ ...base, ...patch });
/** Error code thrown by `fn`, or null when it does not throw. */
const codeOf = (fn: () => unknown): string | null => {
  try {
    fn();
    return null;
  } catch (error) {
    return error instanceof DomainError ? error.code : "UNKNOWN";
  }
};

describe("PublicationAssessmentSchema", () => {
  it("defaults the optional fields to null and turns blanks into null", () => {
    expect(assessment({ credits: "   ", aiDisclosure: "" })).toMatchObject({
      credits: null,
      aiDisclosure: null,
      warningAcceptance: null,
      rightsExpiresAt: null,
    });
  });

  it("accepts only strict ISO dates for the rights expiry", () => {
    for (const valid of ["2026-12-31", "2026-12-31T10:00:00Z", "2026-12-31T10:00:00+07:00"])
      expect(PublicationAssessmentSchema.safeParse({ ...base, rightsExpiresAt: valid }).success).toBe(true);
    for (const invalid of ["2026-02-30", "2026-13-01", "31/12/2026", "2026-12-31Tgarbage", "tomorrow"])
      expect(PublicationAssessmentSchema.safeParse({ ...base, rightsExpiresAt: invalid }).success).toBe(false);
  });

  it("keeps a date-only expiry valid through the end of that UTC day", () => {
    expect(rightsExpiryInstant("2026-10-23")).toBe(Date.parse("2026-10-23T23:59:59.999Z"));
    expect(rightsExpiryInstant("2026-10-23T08:00:00Z")).toBe(Date.parse("2026-10-23T08:00:00Z"));
  });
});

describe("PublishEpisodeExceptionSchema", () => {
  const input = { baseUpdatedAt: now, assessment: base };

  it("requires a reason of at least 20 trimmed characters and the timestamp lock", () => {
    expect(PublishEpisodeExceptionSchema.safeParse({ ...input, exceptionReason: "   quá ngắn   " }).success).toBe(false);
    expect(PublishEpisodeExceptionSchema.safeParse({ assessment: base, exceptionReason: "Phát hành khẩn theo yêu cầu ban biên tập." }).success).toBe(false);
    expect(PublishEpisodeExceptionSchema.parse({ baseUpdatedAt: now }).exceptionReason.length).toBeGreaterThanOrEqual(20);
    expect(PublishEpisodeExceptionSchema.safeParse({ ...input, exceptionReason: "Phát hành khẩn theo yêu cầu ban biên tập." }).success).toBe(true);
  });
});

describe("assertAssessmentGate", () => {
  it("rejects an expired rights date but not one that ends today", () => {
    expect(codeOf(() => assertAssessmentGate(assessment({ rightsExpiresAt: "2026-10-22" }), facts))).toBe("RIGHTS_EXPIRED");
    expect(codeOf(() => assertAssessmentGate(assessment({ rightsExpiresAt: "2026-10-23" }), facts))).toBeNull();
  });

  it("requires a disclosure for AI voice and a written reason when warnings exist", () => {
    expect(codeOf(() => assertAssessmentGate(assessment(), { ...facts, hasAiVoice: true }))).toBe("AI_DISCLOSURE_REQUIRED");
    expect(codeOf(() => assertAssessmentGate(assessment({ aiDisclosure: "Giọng AI" }), { ...facts, hasAiVoice: true }))).toBeNull();
    expect(codeOf(() => assertAssessmentGate(assessment(), { ...facts, hasWarnings: true }))).toBe("WARNING_ACCEPTANCE_REQUIRED");
    expect(codeOf(() => assertAssessmentGate(assessment({ warningAcceptance: "Chấp nhận có chủ đích" }), { ...facts, hasWarnings: true }))).toBeNull();
  });
});

describe("approval helpers", () => {
  const stored = {
    contentRevision: 4,
    assessment: assessment(),
    approvedById: "reviewer-1",
    approvedAt: now.toISOString(),
    exceptionReason: null,
  };

  it("honours an approval only for the revision it covers", () => {
    expect(currentPublicationApproval(stored, 4)?.approvedById).toBe("reviewer-1");
    expect(currentPublicationApproval(stored, 5)).toBeNull();
    expect(currentPublicationApproval(null, 4)).toBeNull();
    expect(currentPublicationApproval({ contentRevision: 4 }, 4)).toBeNull();
  });

  it("detects AI voice from the raw analysis even when other fields are missing", () => {
    expect(hasAiVoiceAudio([{ audioAnalysis: { origin: { kind: "AI_VOICE" } } }])).toBe(true);
    expect(hasAiVoiceAudio([{ audioAnalysis: { origin: { kind: "UPLOAD" } } }, { audioAnalysis: null }, {}])).toBe(false);
  });

  it("counts only WARN rows of WARNING level as warnings", () => {
    const readiness = (items: EpisodeReadiness["items"]) => ({ ready: true, contentRevision: 1, computedAt: now, items }) as EpisodeReadiness;
    expect(hasPublicationWarnings(readiness([{ key: "SCRIPT_TOO_SHORT", level: "WARNING", state: "WARN" }]))).toBe(true);
    expect(hasPublicationWarnings(readiness([{ key: "ENTITY_TAGS_UNCONFIRMED", level: "WARNING", state: "OK" }, { key: "EPISODE_POSTER", level: "INFO", state: "INFO" }]))).toBe(false);
  });

  it("re-parses an Admin exception at the transaction boundary", () => {
    const gate = { mode: "ADMIN_EXCEPTION" as const, hasWarnings: false, assessment: assessment(), exceptionReason: "quá ngắn" };
    expect(codeOf(() => parseAdminException(gate))).toBe("VALIDATION_ERROR");
    expect(parseAdminException({ ...gate, exceptionReason: "Phát hành khẩn theo yêu cầu ban biên tập." }).exceptionReason).toContain("khẩn");
  });
});
