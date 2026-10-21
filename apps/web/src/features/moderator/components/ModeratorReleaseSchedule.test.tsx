import { afterEach, describe, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ModeratorAssignmentSummary } from "./ModeratorAssignments";
import { ModeratorReleaseScheduleView } from "./ModeratorReleaseSchedule";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  document.body.innerHTML = "";
});

function assignment(
  overrides: Partial<ModeratorAssignmentSummary> = {},
): ModeratorAssignmentSummary {
  return {
    id: "schedule-1",
    title: "Dấu chân Trường Sơn",
    status: "SCHEDULED",
    scheduledAt: new Date("2026-10-16T03:30:00.000Z"),
    productionDeadline: new Date("2026-10-17T03:30:00.000Z"),
    episode: { id: "episode-1", contentRevision: 3 },
    reviews: [],
    ...overrides,
  };
}

async function renderSchedule(assignments: ModeratorAssignmentSummary[]): Promise<HTMLElement> {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(
      <ModeratorReleaseScheduleView
        assignments={assignments}
        now={new Date("2026-10-16T02:00:00.000Z")}
      />,
    );
  });
  return host;
}

describe("ModeratorReleaseScheduleView", () => {
  it("renders seven weekdays, three sessions and places a release in its local session", async () => {
    const host = await renderSchedule([assignment()]);

    expect(host.querySelector('[data-week-scroll="true"]')?.getAttribute("data-scrollbar-hidden")).toBe("true");
    expect(host.querySelectorAll("[data-day-key]")).toHaveLength(7);
    expect(host.querySelectorAll("[data-session-row]")).toHaveLength(3);
    expect(host.querySelector('[data-session="morning"]')?.getAttribute("aria-label")).toBe("Buổi sáng, 00:00 - 11:59");
    expect(host.querySelector('[data-session="morning"] [data-schedule-id="schedule-1"]')?.textContent).toContain("Dấu chân Trường Sơn");
    expect(host.textContent).toContain("Podcast nháp v3");
    expect(host.textContent).toContain("12/10 - 18/10/2026");
  });

  it("shows visible semantic status labels and tone attributes", async () => {
    const host = await renderSchedule([
      assignment({ id: "approved", status: "READY_TO_PUBLISH", title: "Đã duyệt", scheduledAt: new Date("2026-10-15T03:00:00.000Z") }),
      assignment({ id: "failed", status: "FAILED", title: "Lỗi phát hành", scheduledAt: new Date("2026-10-16T12:00:00.000Z") }),
    ]);

    expect(host.querySelector('[data-schedule-id="approved"]')?.getAttribute("data-tone")).toBe("success");
    expect(host.querySelector('[data-schedule-id="approved"]')?.textContent).toContain("Đã duyệt");
    expect(host.querySelector('[data-schedule-id="failed"]')?.getAttribute("data-tone")).toBe("danger");
    expect(host.querySelector('[data-schedule-id="failed"]')?.textContent).toContain("Phát hành thất bại");
  });

  it("marks a schedule that has a pending reassignment ticket", async () => {
    const host = await renderSchedule([
      assignment({
        reassignmentTicket: {
          id: "ticket-1",
          status: "PENDING",
          reason: "Không thể tiếp tục vì lịch công tác đột xuất.",
          decisionReason: null,
          createdAt: new Date("2026-10-15T02:00:00.000Z"),
          updatedAt: new Date("2026-10-15T02:00:00.000Z"),
        },
      }),
    ]);

    expect(host.querySelector('[data-schedule-id="schedule-1"]')?.textContent).toContain("Chờ chuyển giao");
  });

  it("switches to the monthly calendar and lists releases for the selected day", async () => {
    const host = await renderSchedule([
      assignment({
        id: "schedule-20",
        title: "Ký ức đường số 4",
        scheduledAt: new Date("2026-10-20T08:00:00.000Z"),
      }),
    ]);
    const monthButton = [...host.querySelectorAll("button")].find((button) => button.textContent?.includes("Lịch tiến độ"));

    await act(async () => monthButton?.click());
    const taskDay = host.querySelector<HTMLButtonElement>('[data-has-schedules="true"]');

    expect(taskDay).not.toBeNull();
    expect(taskDay?.textContent).toContain("1 lịch");
    expect(taskDay?.getAttribute("aria-label")).toContain("1 lịch phát hành");

    const dayButton = [...host.querySelectorAll<HTMLButtonElement>('[data-slot="calendar"] button')].find((button) => button.textContent?.includes("20"));
    await act(async () => dayButton?.click());

    expect(host.querySelector("[data-selected-day-agenda]")?.textContent).toContain("Ký ức đường số 4");
  });

  it("keeps the timetable visible for an empty schedule and exposes navigation labels", async () => {
    const host = await renderSchedule([]);

    expect(host.textContent).toContain("Chưa có lịch phát hành trong tuần này");
    expect(host.querySelector('button[aria-label="Tuần trước"]')).not.toBeNull();
    expect(host.querySelector('button[aria-label="Tuần sau"]')).not.toBeNull();
    expect(host.querySelector('button[aria-pressed="true"]')?.textContent).toContain("Thời khóa biểu");
    expect(host.querySelector('[role="group"][aria-label="Chế độ xem lịch"]')).not.toBeNull();
  });
});
