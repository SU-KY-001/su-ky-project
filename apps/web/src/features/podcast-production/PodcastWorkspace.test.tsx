import { afterEach, expect, it, spyOn } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { PodcastWorkspace } from "./PodcastWorkspace";
import { currentUserQueryKey } from "@/shared/services/currentUserService";
import { podcastProductionService } from "./services/podcastProductionService";

let root: Root | undefined;
let queryClient: QueryClient | undefined;
afterEach(() => { act(() => root?.unmount()); queryClient?.clear(); document.body.innerHTML = ""; });

it("keeps fixed columns on expansion and renders a direct edit button for every podcast", async () => {
  queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  queryClient.setQueryData(["podcast-production", "series", ""], { pages: [{ items: [{ id: "series-1", title: "Giải phóng miền Nam", status: "DRAFT", episodeCounts: { total: 2 } }], page: 1, limit: 20, total: 1 }], pageParams: [1] });
  queryClient.setQueryData(["podcast-production", "series-detail", "series-1"], { episodes: [
    { id: "episode-1", title: "Tên podcast rất dài để kiểm tra bố cục khi mở nhánh", sortOrder: 1, status: "DRAFT", progress: { hasThirdPersonScript: true, hasThirdPersonAudio: true } },
    { id: "episode-2", title: "Khởi nghĩa thắng lợi ở Hà Nội", sortOrder: 2, status: "DRAFT", progress: { hasThirdPersonScript: false, hasThirdPersonAudio: false } },
  ] });
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<MemoryRouter><QueryClientProvider client={queryClient!}><PodcastWorkspace /></QueryClientProvider></MemoryRouter>));
  const widths = [...host.querySelectorAll("col")].map((column) => column.style.width);
  const expand = host.querySelector<HTMLButtonElement>('button[aria-label="Series: Giải phóng miền Nam"]');
  expect(expand).not.toBeNull();
  await act(async () => expand!.click());
  expect([...host.querySelectorAll("col")].map((column) => column.style.width)).toEqual(widths);
  expect(widths).toHaveLength(6);
  const actions = [...host.querySelectorAll<HTMLButtonElement>('[data-slot="dashboard-row-actions"] button')];
  expect(actions.map((button) => button.textContent?.trim())).toEqual(["Xem chi tiết", "Chỉnh sửa", "Chỉnh sửa"]);
  expect(actions.some((button) => button.hasAttribute("aria-haspopup"))).toBe(false);
  expect(actions.some((button) => button.querySelector("svg"))).toBe(false);
});

it("offers deletion only for an owner's drafts and cancels without removing them", async () => {
  queryClient = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  queryClient.setQueryData(currentUserQueryKey, { id: "owner", role: "moderator" });
  queryClient.setQueryData(["podcast-production", "topics"], { items: [] });
  queryClient.setQueryData(["podcast-production", "series", ""], { pages: [{ items: [], page: 1, limit: 20, total: 0 }], pageParams: [1] });
  queryClient.setQueryData(["podcast-production", "series-detail", "series-1"], {
    id: "series-1", title: "Series nháp", status: "DRAFT", owner: { id: "owner", name: "Người tạo" },
    cover: null, coverLandscape: null, description: null, language: "vi", primaryHistoricalEventId: null,
    topic: null, publicationEvidence: null, publishChecklist: { items: [] },
    episodes: [
      { id: "draft", title: "Tập nháp", status: "DRAFT", sortOrder: 1 },
      { id: "published", title: "Tập phát hành", status: "PUBLISHED", sortOrder: 2 },
    ],
  });
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<MemoryRouter initialEntries={["/moderator/podcast/series/series-1"]}><QueryClientProvider client={queryClient!}><PodcastWorkspace /></QueryClientProvider></MemoryRouter>));
  const buttons = () => [...document.body.querySelectorAll<HTMLButtonElement>("button")];
  expect(buttons().filter((button) => button.textContent === "Xóa tập")).toHaveLength(1);
  const remove = buttons().find((button) => button.textContent === "Xóa series");
  expect(remove).toBeDefined();
  await act(async () => remove?.click());
  expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain("Series nháp");
  await act(async () => buttons().find((button) => button.textContent === "Quay lại")?.click());
  expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  expect(document.body.textContent).toContain("Tập nháp");
  const deleteEpisode = spyOn(podcastProductionService, "deleteEpisode").mockResolvedValue(undefined);
  await act(async () => buttons().find((button) => button.textContent === "Xóa tập")?.click());
  expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain("Tập nháp");
  await act(async () => buttons().find((button) => button.textContent === "Xóa")?.click());
  expect(deleteEpisode).toHaveBeenCalledWith("draft");
  deleteEpisode.mockRestore();
  await act(async () => { queryClient!.setQueryData(currentUserQueryKey, { id: "other", role: "moderator" }); });
  await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
  expect(buttons().some((button) => button.textContent === "Xóa series" || button.textContent === "Xóa tập")).toBe(false);
});
