import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { PodcastWorkspace } from "./PodcastWorkspace";

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
