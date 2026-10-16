import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ModeratorAssignmentsView } from "./ModeratorAssignments";
import { selectDashboardAction } from "@/test/dashboardActions";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
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
  expect(host.querySelector('[data-card-badge-type="status"]')?.textContent).toBe("Đang sản xuất");
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
