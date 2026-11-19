import { afterEach, beforeEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { releaseReviewFixture } from "@/test/releaseReviewFixtures";
import { useNotificationStore } from "@/shared/lib/notifications";
import { moderatorReleaseService } from "../services/moderatorReleaseService";
import { ModeratorAssignments } from "./ModeratorAssignments";
import { selectDashboardAction } from "@/test/dashboardActions";

let root: Root | undefined;
let queryClient: QueryClient | undefined;
beforeEach(() => useNotificationStore.setState({ notifications: [] }));
afterEach(() => {
  act(() => root?.unmount()); queryClient?.clear(); document.body.innerHTML = "";
  useNotificationStore.setState({ notifications: [] });
});

it("shows reminders and submit results as toasts without page banners", async () => {
  const { schedule } = releaseReviewFixture();
  schedule.reviews = [];
  let fail = false;
  const submit = mock(async () => {
    if (fail) throw new Error("Podcast chưa có bản thu âm");
    return { ...releaseReviewFixture().schedule.reviews[0]! };
  });
  const upcoming = { id: "reminder-1", scheduleId: schedule.id, title: schedule.title, message: "Nhiệm vụ Điện Biên Phủ sắp đến hạn", productionDeadline: new Date(Date.now() + 3600000), scheduledAt: schedule.scheduledAt, createdAt: new Date() };
  const service = {
    ...moderatorReleaseService,
    assignments: async () => ({ items: [schedule] }),
    assignableEpisodes: async () => ({ items: [] }),
    reminders: async () => ({ items: [upcoming, { ...upcoming, id: "old-reminder", productionDeadline: new Date(Date.now() - 3600000) }] }),
    submitReview: submit,
  };
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => {
    root?.render(<QueryClientProvider client={queryClient!}><ModeratorAssignments service={service} /></QueryClientProvider>);
    await new Promise((resolve) => setTimeout(resolve, 30));
  });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
  expect(host.querySelector("table")).not.toBeNull();
  expect(host.querySelector('[role="alert"]')).toBeNull();
  expect(host.textContent).not.toContain("Nhắc việc trước hạn 24 giờ");
  const warning = useNotificationStore.getState().notifications.find((item) => item.id === "moderator-production-reminders")!;
  expect(warning.status).toBe("warning");
  expect(warning.title).toBe("Nhiệm vụ sắp đến hạn");
  await act(async () => { await queryClient!.invalidateQueries({ queryKey: ["moderator-release-reminders"] }); });
  expect(useNotificationStore.getState().notifications.find((item) => item.id === warning.id)?.revision).toBe(warning.revision);
  expect(host.textContent).not.toContain("Gửi duyệt");
  await selectDashboardAction(schedule.title, "Xem chi tiết", host);
  const send = [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("Gửi duyệt"))!;
  await act(async () => send.click());
  expect(submit).toHaveBeenCalledWith(schedule.id, 3);
  expect(useNotificationStore.getState().notifications.at(-1)?.status).toBe("success");
  fail = true;
  await act(async () => send.click());
  expect(useNotificationStore.getState().notifications.at(-1)).toMatchObject({ status: "error", description: "Podcast chưa có bản thu âm" });
  expect(host.querySelector('[role="alert"]')).toBeNull();
});

it("refreshes the task and reports when approval wins before withdrawal", async () => {
  const { schedule } = releaseReviewFixture();
  const withdraw = mock(async () => {
    schedule.reviews[0] = { ...schedule.reviews[0]!, status: "APPROVED" };
    throw new Error("Bản gửi không còn chờ duyệt.");
  });
  const service = { ...moderatorReleaseService, assignments: async () => ({ items: [{ ...schedule, reviews: [...schedule.reviews] }] }), assignableEpisodes: async () => ({ items: [] }), reminders: async () => ({ items: [] }), withdrawReview: withdraw };
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => { root?.render(<QueryClientProvider client={queryClient!}><ModeratorAssignments service={service} /></QueryClientProvider>); await new Promise((resolve) => setTimeout(resolve, 30)); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
  await selectDashboardAction(schedule.title, "Xem chi tiết", host);
  const click = async (text: string) => act(async () => [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.trim() === text)?.click());
  await click("Thu hồi bản gửi");
  await click("Xác nhận thu hồi");
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); });
  expect(withdraw).toHaveBeenCalledWith(schedule.id, schedule.reviews[0]!.id);
  expect(useNotificationStore.getState().notifications.at(-1)).toMatchObject({ status: "error", title: "Không thể thu hồi bản gửi" });
  expect(document.body.textContent).toContain("Hoàn thành");
  expect(document.body.textContent).not.toContain("Thu hồi bản gửi");
});

it("links the selected podcast before submitting it for review", async () => {
  const { schedule } = releaseReviewFixture();
  schedule.episode = null;
  schedule.episodeId = null;
  const calls: string[] = [];
  const service = { ...moderatorReleaseService, assignments: async () => ({ items: [schedule] }), reminders: async () => ({ items: [] }),
    assignableEpisodes: async () => ({ items: [{ id: "podcast-new", title: "Podcast mới", seriesTitle: "Series", contentRevision: 2, updatedAt: new Date() }] }),
    linkEpisode: async () => { calls.push("link"); return schedule; },
    submitReview: async () => { calls.push("submit"); return releaseReviewFixture().schedule.reviews[0]!; },
  };
  queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => { root?.render(<QueryClientProvider client={queryClient!}><ModeratorAssignments service={service} /></QueryClientProvider>); await new Promise((resolve) => setTimeout(resolve, 30)); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
  await selectDashboardAction(schedule.title, "Xem chi tiết", host);
  const trigger = document.body.querySelector<HTMLButtonElement>('[aria-label="Podcast nháp của bạn"]')!;
  await act(async () => { trigger.focus(); trigger.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" })); await new Promise((resolve) => setTimeout(resolve, 0)); });
  const option = document.body.querySelector<HTMLElement>('[data-slot="select-item"][data-value="podcast-new"]')!;
  await act(async () => { option.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0 })); option.click(); });
  await act(async () => { [...document.body.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.includes("Gửi duyệt"))?.click(); await new Promise((resolve) => setTimeout(resolve, 30)); });
  expect(calls).toEqual(["link", "submit"]);
  expect(document.body.textContent).not.toContain("Gắn podcast");
});
