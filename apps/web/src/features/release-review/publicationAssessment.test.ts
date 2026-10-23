import { expect, it } from "bun:test";
import { assessmentProblems, emptyAssessmentDraft, toAssessment } from "./publicationAssessment";

const NOW = new Date("2026-10-23T08:00:00.000Z");
const none = { disclosure: false, warning: false };
const filled = { ...emptyAssessmentDraft(), editorialNote: "Đã đối chiếu nguồn.", rightsNote: "Tư liệu công cộng.", audioNote: "Đã nghe, khớp kịch bản." };

it("requires the three notes to reach 10 trimmed characters", () => {
  expect(assessmentProblems(emptyAssessmentDraft(), none, NOW)).toHaveLength(3);
  expect(assessmentProblems({ ...filled, editorialNote: "   ngắn   " }, none, NOW)).toHaveLength(1);
  expect(assessmentProblems(filled, none, NOW)).toEqual([]);
});

it("demands AI disclosure and warning acceptance only when the episode needs them", () => {
  expect(assessmentProblems(filled, { disclosure: true, warning: true }, NOW)).toHaveLength(2);
  expect(assessmentProblems({ ...filled, aiDisclosure: "Giọng đọc do AI tạo.", warningAcceptance: "Cảnh báo đã xem, chấp nhận." }, { disclosure: true, warning: true }, NOW)).toEqual([]);
});

it("rejects a rights expiry before today but keeps today valid through its UTC day", () => {
  expect(assessmentProblems({ ...filled, rightsExpiresAt: "2026-10-22" }, none, NOW)).toHaveLength(1);
  expect(assessmentProblems({ ...filled, rightsExpiresAt: "2026-10-23" }, none, NOW)).toEqual([]);
});

it("sends trimmed notes and null for empty optional fields", () => {
  expect(toAssessment({ ...filled, editorialNote: "  Đã đối chiếu nguồn.  ", credits: "  " })).toEqual({
    editorialNote: "Đã đối chiếu nguồn.",
    rightsNote: "Tư liệu công cộng.",
    audioNote: "Đã nghe, khớp kịch bản.",
    credits: null,
    rightsExpiresAt: null,
    aiDisclosure: null,
    warningAcceptance: null,
  });
});
