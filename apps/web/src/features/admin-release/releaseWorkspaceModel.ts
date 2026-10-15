import type { ReleaseScheduleRecord, ReleaseScheduleStatus } from "@repo/shared";

export type ReleaseWorkspaceViewMode = "kanban" | "table";
export type ReleaseBoardStatus = Extract<
  ReleaseScheduleStatus,
  "SCHEDULED" | "READY_TO_PUBLISH" | "PUBLISHING" | "RELEASED"
>;
export type ReleaseDropCommand = "check-readiness" | "publish-now";

export const RELEASE_BOARD_COLUMNS: ReadonlyArray<{
  status: ReleaseBoardStatus;
  label: string;
}> = [
  { status: "SCHEDULED", label: "Đã lên lịch" },
  { status: "READY_TO_PUBLISH", label: "Sẵn sàng phát hành" },
  { status: "PUBLISHING", label: "Đang phát hành" },
  { status: "RELEASED", label: "Đã phát hành" },
];

const BOARD_STATUSES = new Set<ReleaseScheduleStatus>(
  RELEASE_BOARD_COLUMNS.map(({ status }) => status),
);
const ATTENTION_STATUSES = new Set<ReleaseScheduleStatus>(["BLOCKED", "FAILED"]);

function byScheduledAt(
  left: ReleaseScheduleRecord,
  right: ReleaseScheduleRecord,
): number {
  return left.scheduledAt.getTime() - right.scheduledAt.getTime();
}

export function groupReleaseSchedules(items: ReleaseScheduleRecord[]) {
  const columns: Record<ReleaseBoardStatus, ReleaseScheduleRecord[]> = {
    SCHEDULED: [],
    READY_TO_PUBLISH: [],
    PUBLISHING: [],
    RELEASED: [],
  };
  const attention: ReleaseScheduleRecord[] = [];

  for (const item of items) {
    if (BOARD_STATUSES.has(item.status)) {
      columns[item.status as ReleaseBoardStatus].push(item);
    } else if (ATTENTION_STATUSES.has(item.status)) {
      attention.push(item);
    }
  }

  for (const column of Object.values(columns)) column.sort(byScheduledAt);
  attention.sort(byScheduledAt);
  return { columns, attention };
}

export function getReleaseDropCommand(
  from: ReleaseScheduleStatus,
  to: ReleaseBoardStatus,
): ReleaseDropCommand | null {
  if (from === "SCHEDULED" && to === "READY_TO_PUBLISH")
    return "check-readiness";
  if (from === "READY_TO_PUBLISH" && to === "PUBLISHING")
    return "publish-now";
  return null;
}
