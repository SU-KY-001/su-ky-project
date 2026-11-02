import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ModeratorAssignmentsView } from "./ModeratorAssignments";
import { selectDashboardAction } from "@/test/dashboardActions";

let root: Root | undefined;

it("shows and filters five task states using the current revision", async () => {
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  const item = (id: string, status: string, episode: boolean, reviews: Array<{ status: "IN_REVIEW" | "APPROVED" | "CHANGES_REQUESTED"; revision: number; episodeId: string }> = []) => ({ id, title: id, status, scheduledAt: new Date(), productionDeadline: new Date(), episode: episode ? { id: "episode", contentRevision: 3 } : null, reviews: reviews.map((review, index) => ({ ...review, id: `${id}-${index}` })) });
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

it("filters release dates inclusively using Vietnam calendar dates", async () => {
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  const assignment = (id: string, deadline: string) => ({ id, title: id, status: "SCHEDULED", scheduledAt: new Date(deadline), productionDeadline: new Date(deadline), episode: null, reviews: [] });
  await act(async () => root?.render(<ModeratorAssignmentsView assignments={[
    assignment("Trước", "2026-11-02T16:59:00Z"),
    assignment("Đầu ngày", "2026-11-02T17:00:00Z"),
    assignment("Cuối ngày", "2026-11-03T16:59:00Z"),
    assignment("Sau", "2026-11-03T17:00:00Z"),
  ]} onSubmitReview={() => undefined} />));
  const setDate = async (label: string, value: string) => {
    const input = host.querySelector<HTMLInputElement>(`input[aria-label="${label} - nhập ngày"]`)!;
    const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
    await act(async () => { setter?.call(input, value); input.dispatchEvent(new Event("input", { bubbles: true })); });
    await act(async () => { input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
  };
  await setDate("Ngày phát hành", "03/11/2026");
  expect([...host.querySelectorAll<HTMLTableRowElement>("tbody tr")].map((row) => row.cells[0]?.textContent)).toEqual(["Cuối ngày", "Đầu ngày"]);
  await setDate("Ngày phát hành", "");
  expect([...host.querySelectorAll<HTMLTableRowElement>("tbody tr")].map((row) => row.cells[0]?.textContent)).toEqual(["Sau", "Cuối ngày", "Đầu ngày", "Trước"]);
  await setDate("Hạn sản xuất", "01/11/2026");
  expect(host.textContent).toContain("Không có nhiệm vụ phù hợp với bộ lọc.");
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
  const send = mock(() => undefined);
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
        onSubmitReview={send}
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
  const button = [...document.body.querySelectorAll("button")].find((item) => item.textContent?.includes("Gửi duyệt"));
  await act(async () => button?.click());
  expect(send).toHaveBeenCalledWith("schedule-1", 2, "00000000-0000-4000-8000-000000000002");
});

it("returns to the unlinked task after withdrawal and requires selecting a podcast again", async () => {
  const withdraw = mock(() => undefined);
  const submit = mock(() => undefined);
  const link = mock(() => undefined);
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  const item = {
    id: "schedule-1", title: "Nhiệm vụ", status: "SCHEDULED", scheduledAt: new Date(), productionDeadline: new Date(),
    episode: { id: "episode-1", title: "Podcast A", contentRevision: 10 },
    reviews: [{ id: "review-1", episodeId: "episode-1", revision: 10, status: "IN_REVIEW" as const }],
  };
  const render = (value: Omit<typeof item, "reviews" | "episode"> & { episode: typeof item.episode | null; reviews: Array<{ id: string; episodeId: string; revision: number; status: "IN_REVIEW" | "WITHDRAWN" }> }) => <ModeratorAssignmentsView assignments={[value]} assignableEpisodes={[{ id: "episode-1", title: "Podcast A", seriesTitle: "Series", contentRevision: 10, updatedAt: new Date() }, { id: "episode-2", title: "Podcast B", seriesTitle: "Series", contentRevision: 1, updatedAt: new Date() }]} onLinkEpisode={link} onWithdrawReview={withdraw} onSubmitReview={submit} />;
  await act(async () => root?.render(render(item)));
  await selectDashboardAction(item.title, "Xem chi tiết", host);
  expect(document.body.textContent).not.toContain("Phiên bản 10");
  const click = async (text: string) => act(async () => [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.trim() === text)?.click());
  await click("Thu hồi bản gửi");
  expect(withdraw).not.toHaveBeenCalled();
  expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
  await click("Quay lại");
  expect(withdraw).not.toHaveBeenCalled();
  await click("Thu hồi bản gửi");
  await click("Xác nhận thu hồi");
  expect(withdraw).toHaveBeenCalledWith("schedule-1", "review-1");
  await act(async () => root?.render(render({ ...item, episode: null, reviews: [{ ...item.reviews[0]!, status: "WITHDRAWN" }] })));
  expect(document.body.textContent).not.toContain("Lịch sử kiểm duyệt");
  expect(document.body.querySelector('[aria-label="Podcast nháp của bạn"]')?.textContent).toContain("Podcast A");
  expect(document.body.textContent).not.toContain("Podcast đã liên kết:");
  expect(document.body.textContent).not.toContain("Phiên bản 10");
  expect(document.body.textContent).toContain("Chưa bắt đầu");
  expect(document.body.textContent).not.toContain("Sửa podcast");
  expect(document.body.textContent).not.toContain("Đổi podcast");
  expect(document.body.textContent).toContain("Gửi duyệt");
  expect(submit).not.toHaveBeenCalled();
  const trigger = document.body.querySelector<HTMLButtonElement>('[aria-label="Podcast nháp của bạn"]')!;
  expect(trigger).not.toBeNull();
  await act(async () => { trigger.focus(); trigger.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" })); await new Promise((resolve) => setTimeout(resolve, 0)); });
  const option = document.body.querySelector<HTMLElement>('[data-slot="select-item"][data-value="episode-2"]')!;
  await act(async () => { option.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0 })); option.click(); });
  await click("Gửi duyệt");
  expect(submit).toHaveBeenCalledWith("schedule-1", 1, "episode-2");
  await act(async () => root?.render(render({ ...item, reviews: [{ ...item.reviews[0]!, id: "review-2" }, { ...item.reviews[0]!, status: "WITHDRAWN" }] })));
  expect(document.body.querySelector('[aria-label="Podcast nháp của bạn"]')).toBeNull();
  expect(document.body.textContent).toContain("Thu hồi bản gửi");
  expect(document.body.textContent).not.toContain("Gửi duyệt");
});

it("allows selecting a replacement for a podcast still linked after an older withdrawal", async () => {
  const send = mock(() => undefined);
  const link = mock(() => undefined);
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<ModeratorAssignmentsView assignments={[{
    id: "task-old", title: "Nhiệm vụ cũ", status: "SCHEDULED", scheduledAt: new Date(), productionDeadline: new Date(),
    episode: { id: "old", title: "Podcast cũ", contentRevision: 10 },
    reviews: [{ id: "withdrawn", episodeId: "old", revision: 10, status: "WITHDRAWN" }],
  }]} assignableEpisodes={[{ id: "new", title: "Podcast mới", seriesTitle: "Series", contentRevision: 1, updatedAt: new Date() }]} onLinkEpisode={link} onSubmitReview={send} />));
  await selectDashboardAction("Nhiệm vụ cũ", "Xem chi tiết", host);
  const trigger = document.body.querySelector<HTMLButtonElement>('[aria-label="Podcast nháp của bạn"]')!;
  expect(trigger).not.toBeNull();
  await act(async () => { trigger.focus(); trigger.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" })); await new Promise((resolve) => setTimeout(resolve, 0)); });
  const option = document.body.querySelector<HTMLElement>('[data-slot="select-item"][data-value="new"]')!;
  await act(async () => { option.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0 })); option.click(); });
  await act(async () => [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent === "Gửi duyệt")?.click());
  expect(send).toHaveBeenCalledWith("task-old", 1, "new");
  expect(document.body.textContent).not.toContain("Gắn podcast");
});
