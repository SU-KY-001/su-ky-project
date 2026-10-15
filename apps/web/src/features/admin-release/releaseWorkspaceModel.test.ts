import { describe, expect, it } from "bun:test";
import type { ReleaseScheduleRecord, ReleaseScheduleStatus } from "@repo/shared";
import {
  RELEASE_BOARD_COLUMNS,
  getReleaseDropCommand,
  groupReleaseSchedules,
} from "./releaseWorkspaceModel";

function schedule(
  id: string,
  status: ReleaseScheduleStatus,
  scheduledAt: string,
): ReleaseScheduleRecord {
  return {
    id,
    status,
    scheduledAt: new Date(scheduledAt),
  } as ReleaseScheduleRecord;
}

describe("release workspace model", () => {
  it("defines the four approved Kanban columns", () => {
    expect(RELEASE_BOARD_COLUMNS).toEqual([
      { status: "SCHEDULED", label: "Đã lên lịch" },
      { status: "READY_TO_PUBLISH", label: "Sẵn sàng phát hành" },
      { status: "PUBLISHING", label: "Đang phát hành" },
      { status: "RELEASED", label: "Đã phát hành" },
    ]);
  });

  it("groups and sorts board records while separating attention records", () => {
    const grouped = groupReleaseSchedules([
      schedule("scheduled-late", "SCHEDULED", "2026-10-22T08:00:00.000Z"),
      schedule("released", "RELEASED", "2026-10-24T08:00:00.000Z"),
      schedule("failed", "FAILED", "2026-10-20T08:00:00.000Z"),
      schedule("scheduled-early", "SCHEDULED", "2026-10-21T08:00:00.000Z"),
      schedule("ready", "READY_TO_PUBLISH", "2026-10-23T08:00:00.000Z"),
      schedule("publishing", "PUBLISHING", "2026-10-23T09:00:00.000Z"),
      schedule("blocked", "BLOCKED", "2026-10-19T08:00:00.000Z"),
      schedule("cancelled", "CANCELLED", "2026-10-18T08:00:00.000Z"),
    ]);

    expect(grouped.columns.SCHEDULED.map(({ id }) => id)).toEqual([
      "scheduled-early",
      "scheduled-late",
    ]);
    expect(grouped.columns.READY_TO_PUBLISH.map(({ id }) => id)).toEqual(["ready"]);
    expect(grouped.columns.PUBLISHING.map(({ id }) => id)).toEqual(["publishing"]);
    expect(grouped.columns.RELEASED.map(({ id }) => id)).toEqual(["released"]);
    expect(grouped.attention.map(({ id }) => id)).toEqual(["blocked", "failed"]);
  });

  it("permits only policy-backed forward drop commands", () => {
    expect(getReleaseDropCommand("SCHEDULED", "READY_TO_PUBLISH")).toBe("check-readiness");
    expect(getReleaseDropCommand("READY_TO_PUBLISH", "PUBLISHING")).toBe("publish-now");
    expect(getReleaseDropCommand("SCHEDULED", "SCHEDULED")).toBeNull();
    expect(getReleaseDropCommand("READY_TO_PUBLISH", "SCHEDULED")).toBeNull();
    expect(getReleaseDropCommand("PUBLISHING", "RELEASED")).toBeNull();
    expect(getReleaseDropCommand("RELEASED", "PUBLISHING")).toBeNull();
  });
});
