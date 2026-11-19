import { afterEach, expect, it, spyOn } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExhibitionList } from "./ExhibitionList";
import { exhibitionService } from "../services/exhibitionService";
import type { ExhibitionSummary } from "@repo/shared";

let root: Root | undefined;
let cache: QueryClient;
afterEach(() => { act(() => root?.unmount()); cache?.clear(); document.body.innerHTML = ""; });
const row: ExhibitionSummary = { id: "11111111-1111-4111-8111-111111111111", title: "Triển lãm nháp", slug: "draft", chapterCount: 1, itemCount: 0, podcastCount: 0, revision: 3, publicationStatus: "UNPUBLISHED", updatedAt: "2026-11-19T00:00:00Z" };
async function render(published = false) {
  cache = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  cache.setQueryData(["exhibitions", "", "all", 1], { items: [{ ...row, publicationStatus: published ? "PUBLISHED" : "UNPUBLISHED" }], total: 1, page: 1, limit: 10 });
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<MemoryRouter><QueryClientProvider client={cache}><ExhibitionList /></QueryClientProvider></MemoryRouter>));
  await click("Xem chi tiết");
}
async function click(label: string) {
  const button = [...document.querySelectorAll("button")].find(item => item.textContent?.trim() === label);
  if (!button) throw new Error(`Missing button: ${label}`);
  await act(async () => { button.click(); await Bun.sleep(20); });
}

it("deletes a draft only after confirmation and sends its revision", async () => {
  const remove = spyOn(exhibitionService, "deleteDraft").mockResolvedValue({ deleted: true });
  const list = spyOn(exhibitionService, "list").mockResolvedValue({ items: [], total: 0, page: 1, limit: 10 });
  try {
    await render();
    await click("Xóa bản nháp");
    expect(remove).not.toHaveBeenCalled();
    const dialog = document.querySelector('[role="alertdialog"]');
    expect(dialog?.textContent).toContain(row.title);
    await click("Quay lại");
    expect(remove).not.toHaveBeenCalled();
    await click("Xóa bản nháp");
    const confirm = document.querySelector<HTMLButtonElement>('[role="alertdialog"] button:last-child');
    await act(async () => { confirm?.click(); await Bun.sleep(30); });
    expect(remove).toHaveBeenCalledWith(row.id, row.revision);
  } finally { remove.mockRestore(); list.mockRestore(); }
});

it("does not offer deletion for a published exhibition", async () => {
  await render(true);
  expect([...document.querySelectorAll("button")].some(button => button.textContent?.trim() === "Xóa bản nháp")).toBe(false);
});
