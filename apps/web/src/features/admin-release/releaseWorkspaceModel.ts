import type { ReleaseScheduleRecord, ReleaseScheduleStatus } from "@repo/shared";

export type ReleaseWorkspaceViewMode = "kanban" | "table";
export type ReleaseBoardStatus = Extract<
  ReleaseScheduleStatus,
  "SCHEDULED" | "READY_TO_PUBLISH" | "RELEASED" | "FAILED"
>;
export type ReleaseDropCommand = "check-readiness" | "publish-now";

export function isProductionSubmittedLate(schedule: ReleaseScheduleRecord): boolean {
  const episode = schedule.episode;
  if (!episode) return false;

  const submission = schedule.reviews.find(
    (review) =>
      review.episodeId === episode.id &&
      review.revision === episode.contentRevision &&
      review.status !== "WITHDRAWN",
  );

  return Boolean(
    submission && submission.submittedAt.getTime() > schedule.productionDeadline.getTime(),
  );
}

export const RELEASE_BOARD_COLUMNS: ReadonlyArray<{
  status: ReleaseBoardStatus;
  label: string;
}> = [
  { status: "SCHEDULED", label: "Đã lên lịch" },
  { status: "READY_TO_PUBLISH", label: "Sẵn sàng phát hành" },
  { status: "RELEASED", label: "Đã phát hành" },
  { status: "FAILED", label: "Phát hành thất bại" },
];

const BOARD_STATUSES = new Set<ReleaseScheduleStatus>(
  RELEASE_BOARD_COLUMNS.map(({ status }) => status),
);
const ATTENTION_STATUSES = new Set<ReleaseScheduleStatus>(["BLOCKED"]);

function byNewestCreated(
  left: ReleaseScheduleRecord,
  right: ReleaseScheduleRecord,
): number {
  const createdDifference = right.createdAt.getTime() - left.createdAt.getTime();
  return createdDifference || left.scheduledAt.getTime() - right.scheduledAt.getTime();
}

export function groupReleaseSchedules(items: ReleaseScheduleRecord[]) {
  const columns: Record<ReleaseBoardStatus, ReleaseScheduleRecord[]> = {
    SCHEDULED: [],
    READY_TO_PUBLISH: [],
    RELEASED: [],
    FAILED: [],
  };
  const attention: ReleaseScheduleRecord[] = [];

  for (const item of items) {
    if (BOARD_STATUSES.has(item.status)) {
      columns[item.status as ReleaseBoardStatus].push(item);
    } else if (ATTENTION_STATUSES.has(item.status)) {
      attention.push(item);
    }
  }

  for (const column of Object.values(columns)) column.sort(byNewestCreated);
  attention.sort(byNewestCreated);
  return { columns, attention };
}

export function getReleaseDropCommand(
  from: ReleaseScheduleStatus,
  to: ReleaseBoardStatus,
): ReleaseDropCommand | null {
  if (from === "SCHEDULED" && to === "READY_TO_PUBLISH")
    return "check-readiness";
  return null;
}
