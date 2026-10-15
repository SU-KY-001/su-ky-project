import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ModeratorAssignmentsView } from "./ModeratorAssignments";

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
  await act(async () => {
    (host.querySelector("button") as HTMLButtonElement).click();
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
  const select = host.querySelector("select") as HTMLSelectElement;
  await act(async () => {
    Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value")?.set?.call(
      select,
      "00000000-0000-4000-8000-000000000002",
    );
    select.dispatchEvent(new window.Event("change", { bubbles: true }));
  });
  const button = [...host.querySelectorAll("button")].find((item) => item.textContent?.includes("Gắn podcast"));
  await act(async () => button?.click());
  expect(link).toHaveBeenCalledWith("schedule-1", "00000000-0000-4000-8000-000000000002");
});
