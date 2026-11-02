import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ModeratorAssignmentsView } from "./ModeratorAssignments";
import { selectDashboardAction } from "@/test/dashboardActions";

let root: Root | undefined;

it("shows and filters five task states using the current revision", async () => {
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  const item = (id: string, status: string, episode: boolean, reviews: Array<{ status: "IN_REVIEW" | "APPROVED" | "CHANGES_REQUESTED"; revision: number; episodeId: string }> = []) => ({ id, title: id, status, scheduledAt: new Date(), productionDeadline: new Date(), episode: episode ? { id: "episode", contentRevision: 3 } : null, reviews });
  await act(async () => { root?.render(<ModeratorAssignmentsView assignments={[
    item("Chưa gắn", "SCHEDULED", false), item("Đang làm", "FAILED", true, [{ status: "APPROVED", revision: 3, episodeId: "old-episode" }, { status: "APPROVED", revision: 2, episodeId: "episode" }]),
    item("Đang duyệt", "BLOCKED", true, [{ status: "IN_REVIEW", revision: 3, episodeId: "episode" }]),
    item("Cần sửa", "SCHEDULED", true, [{ status: "CHANGES_REQUESTED", revision: 3, episodeId: "episode" }]),
    item("Đã duyệt", "RELEASED", true, [{ status: "APPROVED", revision: 3, episodeId: "episode" }]),
    item("Đã hủy", "CANCELLED", false),
  ]} onSubmitReview={() => undefined} />); });
  const rows = [...host.querySelectorAll<HTMLTableRowElement>("tbody tr")];
  expect(rows.map(row => [row.cells[0]?.textContent, row.cells[4]?.textContent])).toEqual([
    ["Chưa gắn", "Chưa bắt đầu"], ["Đang làm", "Đang thực hiện"], ["Đang duyệt", "Chờ duyệt"],
    ["Cần sửa", "Cần chỉnh sửa"], ["Đã duyệt", "Hoàn thành"],
  ]);
  const trigger = host.querySelector('[aria-label="Lọc trạng thái nhiệm vụ"]') as HTMLButtonElement;
  await act(async () => { trigger.focus(); trigger.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" })); await new Promise(resolve => setTimeout(resolve, 0)); });
  expect(document.body.textContent).toContain("Chưa bắt đầu");
  expect(document.body.textContent).toContain("Đang thực hiện");
  expect(document.body.textContent).toContain("Chờ duyệt");
  expect(document.body.textContent).toContain("Cần chỉnh sửa");
  expect(document.body.textContent).toContain("Hoàn thành");
  const option = document.body.querySelector<HTMLElement>('[data-slot="select-item"][data-value="COMPLETED"]')!;
  await act(async () => { option.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0 })); option.click(); });
  expect([...host.querySelectorAll<HTMLTableRowElement>("tbody tr")].map(row => row.cells[0]?.textContent)).toEqual(["Đã duyệt"]);
});

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

it("shows the most recent production deadlines first", async () => {
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  const assignment = (id: string, deadline: string) => ({ id, title: id, status: "SCHEDULED" as const, scheduledAt: new Date("2026-12-01T00:00:00Z"), productionDeadline: new Date(deadline), episode: null, reviews: [] });
  const items = [assignment("Cũ", "2026-10-01T00:00:00Z"), assignment("Mới", "2026-11-01T00:00:00Z"), assignment("Giữa", "2026-10-15T00:00:00Z")];
  await act(async () => { root?.render(<ModeratorAssignmentsView assignments={items} onSubmitReview={() => undefined} />); });
  expect([...host.querySelectorAll<HTMLTableRowElement>("tbody tr")].map(row => row.cells[0]?.textContent)).toEqual(["Mới", "Giữa", "Cũ"]);
  expect(items.map(item => item.title)).toEqual(["Cũ", "Mới", "Giữa"]);
});

it("shows assigned production work and submits its current revision", async () => {
  const submit = mock(() => undefined);
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(
      <ModeratorAssignmentsView
        assignments={[
          {
            id: "schedule-1",
            title: "Dấu chân Trường Sơn",
            status: "SCHEDULED",
            scheduledAt: new Date("2026-10-20T13:00:00.000Z"),
            productionDeadline: new Date("2026-10-19T13:00:00.000Z"),
            episode: { id: "episode-1", contentRevision: 4 },
            reviews: [],
          },
        ]}
        onSubmitReview={submit}
      />,
    );
  });
  expect(host.textContent).toContain("Nhiệm vụ của tôi");
  expect(host.textContent).toContain("Dấu chân Trường Sơn");
  expect(host.querySelector('[data-card-badge-type="status"]')?.textContent).toBe("Đang thực hiện");
  expect(host.textContent).not.toContain("Gửi duyệt");
  await selectDashboardAction("Dấu chân Trường Sơn", "Xem chi tiết", host);
  await act(async () => {
    [...document.body.querySelectorAll("button")].find((button) => button.textContent?.includes("Gửi duyệt"))?.click();
  });
  expect(submit).toHaveBeenCalledWith("schedule-1", 4);
});

it("lets the assigned moderator link an owned draft episode", async () => {
  const link = mock(() => undefined);
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(
      <ModeratorAssignmentsView
        assignments={[{
          id: "schedule-1",
          title: "Dấu chân Trường Sơn",
          status: "SCHEDULED",
          scheduledAt: new Date("2026-10-20T13:00:00.000Z"),
          productionDeadline: new Date("2026-10-19T13:00:00.000Z"),
          episode: null,
          reviews: [],
        }]}
        assignableEpisodes={[{
          id: "00000000-0000-4000-8000-000000000002",
          title: "Tập 1",
          seriesTitle: "Trường Sơn",
          contentRevision: 2,
          updatedAt: new Date("2026-10-18T13:00:00.000Z"),
        }]}
        onLinkEpisode={link}
        onSubmitReview={() => undefined}
      />,
    );
  });
  await selectDashboardAction("Dấu chân Trường Sơn", "Xem chi tiết", host);
  expect(host.querySelector("select")).toBeNull();
  expect(document.body.querySelector('[aria-label="Podcast nháp của bạn"]')).not.toBeNull();
  const trigger = document.body.querySelector('[aria-label="Podcast nháp của bạn"]') as HTMLButtonElement;
  await act(async () => {
    trigger.focus();
    trigger.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  const option = document.body.querySelector('[data-slot="select-item"][data-value="00000000-0000-4000-8000-000000000002"]') as HTMLElement;
  await act(async () => {
    option.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0 }));
    option.click();
  });
  const button = [...document.body.querySelectorAll("button")].find((item) => item.textContent?.includes("Gắn podcast"));
  await act(async () => button?.click());
  expect(link).toHaveBeenCalledWith("schedule-1", "00000000-0000-4000-8000-000000000002");
});
