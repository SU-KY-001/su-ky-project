import { describe, expect, it } from "bun:test";
import type { ModeratorAssignmentSummary } from "./components/ModeratorAssignments";
import {
  getSchedulePresentationState,
  getScheduleSession,
  getVietnamDateKey,
  getVietnamWeek,
  groupAssignmentsByDate,
} from "./moderatorScheduleModel";

function assignment(
  overrides: Partial<ModeratorAssignmentSummary> = {},
): ModeratorAssignmentSummary {
  return {
    id: "schedule-1",
    title: "Dấu chân Trường Sơn",
    status: "SCHEDULED",
    scheduledAt: new Date("2026-10-20T03:30:00.000Z"),
    productionDeadline: new Date("2026-10-19T03:30:00.000Z"),
    episode: { id: "episode-1", contentRevision: 3 },
    reviews: [],
    ...overrides,
  };
}

describe("moderator schedule calendar model", () => {
  it("groups a UTC timestamp after Vietnam midnight into the next local day", () => {
    expect(getVietnamDateKey(new Date("2026-10-18T17:30:00.000Z"))).toBe("2026-10-19");
  });

  it("builds a Monday-first week across a month boundary", () => {
    const days = getVietnamWeek(new Date("2026-11-01T03:00:00.000Z"));

    expect(days.map(getVietnamDateKey)).toEqual([
      "2026-10-26",
      "2026-10-27",
      "2026-10-28",
      "2026-10-29",
      "2026-10-30",
      "2026-10-31",
      "2026-11-01",
    ]);
  });

  it("places releases into morning, afternoon and evening using Vietnam time", () => {
    expect(getScheduleSession(new Date("2026-10-16T04:59:00.000Z"))).toBe("morning");
    expect(getScheduleSession(new Date("2026-10-16T05:00:00.000Z"))).toBe("afternoon");
    expect(getScheduleSession(new Date("2026-10-16T11:00:00.000Z"))).toBe("evening");
  });

  it("uses semantic tones for approved, failed and cancelled release states", () => {
    expect(getSchedulePresentationState(assignment({ status: "READY_TO_PUBLISH" }), new Date("2026-10-16T00:00:00.000Z"))).toEqual({
      key: "approved",
      label: "Đã duyệt",
      tone: "success",
    });
    expect(getSchedulePresentationState(assignment({ status: "FAILED" }), new Date("2026-10-16T00:00:00.000Z"))).toEqual({
      key: "failed",
      label: "Phát hành thất bại",
      tone: "danger",
    });
    expect(getSchedulePresentationState(assignment({ status: "CANCELLED" }), new Date("2026-10-16T00:00:00.000Z"))).toEqual({
      key: "cancelled",
      label: "Đã hủy",
      tone: "neutral",
    });
  });

  it("promotes scheduled work to overdue or near-deadline presentation states", () => {
    const now = new Date("2026-10-16T03:00:00.000Z");

    expect(getSchedulePresentationState(assignment({ productionDeadline: new Date("2026-10-16T02:59:00.000Z") }), now)).toEqual({
      key: "overdue",
      label: "Quá hạn sản xuất",
      tone: "danger",
    });
    expect(getSchedulePresentationState(assignment({ productionDeadline: new Date("2026-10-17T02:59:00.000Z") }), now)).toEqual({
      key: "near-deadline",
      label: "Gần hạn sản xuất",
      tone: "attention",
    });
  });

  it("groups local dates and keeps releases ordered by scheduled time", () => {
    const later = assignment({ id: "later", scheduledAt: new Date("2026-10-18T14:00:00.000Z") });
    const earlier = assignment({ id: "earlier", scheduledAt: new Date("2026-10-18T12:00:00.000Z") });

    const grouped = groupAssignmentsByDate([later, earlier]);

    expect(grouped["2026-10-18"]?.map((item) => item.id)).toEqual(["earlier", "later"]);
  });
});
