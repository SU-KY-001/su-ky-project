import { afterEach, expect, it, spyOn } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PodcastCreation } from "./PodcastCreation";
import { podcastProductionService } from "./services/podcastProductionService";
import { useNotificationStore } from "@/shared/lib/notifications";
import { angleService } from "./angles/angleService";
import { composeService } from "./compose/composeService";

const EPISODE_ID = "0feffcaa-036d-4c8f-8096-c47e13e72f91";
const SERIES_ID = "5a1f6d0e-0000-4000-8000-000000000001";

let root: Root | undefined;
let client: QueryClient | undefined;
afterEach(() => { act(() => root?.unmount()); client?.clear(); useNotificationStore.setState({ notifications: [] }); document.body.innerHTML = ""; });

function LocationProbe() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname}{search}</output>;
}

async function renderEpisode(entry: string, state?: { podcastFlow: "create" }): Promise<HTMLElement> {
  client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["podcast-production", "episode", EPISODE_ID], {
    id: EPISODE_ID, seriesId: SERIES_ID, seriesTitle: "Series", seriesStatus: "DRAFT", title: "Tập 1", slug: "tap-1", description: null,
    sortOrder: 1, status: "DRAFT", isDeleted: false, lock: null, publishedAt: null, updatedAt: "2026-10-22T00:00:00.000Z",
    narrations: [], attachments: [], poster: null, entityTags: [], publishChecklist: { ready: false, items: [], warnings: [] },
  });
  client.setQueryData(["podcast-production", "series-detail", SERIES_ID], { id: SERIES_ID, title: "Series", primaryHistoricalEventId: null, episodes: [], sources: [] });
  client.setQueryData(["podcast-production", "series", ""], { pages: [{ items: [], page: 1, limit: 20, total: 0 }], pageParams: [1] });
  client.setQueryData(["podcast-production", "script-config"], { wordsPerMinute: 150 });
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(
    <MemoryRouter initialEntries={[{ pathname: entry.split("?")[0], search: entry.includes("?") ? `?${entry.split("?")[1]}` : "", state }]}>
      <QueryClientProvider client={client!}>
        <PodcastCreation episodeId={EPISODE_ID} onBack={() => {}} onSaved={() => {}} />
        <LocationProbe />
      </QueryClientProvider>
    </MemoryRouter>,
  ));
  return host;
}

const activeStepLabel = (host: HTMLElement) => host.querySelector('nav button[aria-current="step"]')?.getAttribute("aria-label") ?? "";
const stepButton = (host: HTMLElement, number: number) => [...host.querySelectorAll<HTMLButtonElement>("nav button")].find((button) => button.getAttribute("aria-label")?.startsWith(`${number}.`))!;
const urlOf = (host: HTMLElement) => host.querySelector('[data-testid="location"]')?.textContent;

it("opens the step named by ?step= on an existing episode", async () => {
  const host = await renderEpisode(`/moderator/podcast/episodes/${EPISODE_ID}?step=voice`);
  expect(activeStepLabel(host)).toStartWith("3.");
});

it("falls back to the first step for a missing or unknown ?step=", async () => {
  expect(activeStepLabel(await renderEpisode(`/moderator/podcast/episodes/${EPISODE_ID}?step=nope`))).toStartWith("1.");
});

it("writes the chosen step to the URL, keeps other params, and drops it on the first step", async () => {
  const host = await renderEpisode(`/moderator/podcast/episodes/${EPISODE_ID}?q=abc`);
  await act(async () => stepButton(host, 4).click());
  expect(urlOf(host)).toBe(`/moderator/podcast/episodes/${EPISODE_ID}?q=abc&step=review`);
  expect(activeStepLabel(host)).toStartWith("4.");
  await act(async () => stepButton(host, 1).click());
  expect(urlOf(host)).toBe(`/moderator/podcast/episodes/${EPISODE_ID}?q=abc`);
});

it("opens a saved draft for editing, with Save available and no view-only banner", async () => {
  const host = await renderEpisode(`/moderator/podcast/episodes/${EPISODE_ID}`);
  expect(host.textContent).toContain("Đang chỉnh sửa tập podcast");
  expect(host.textContent).toContain("Lưu thay đổi");
  expect(host.textContent).not.toContain("Chế độ xem");
});

it("keeps creation titles after the information step creates a persisted draft", async () => {
  const host = await renderEpisode(`/moderator/podcast/episodes/${EPISODE_ID}?step=script`, { podcastFlow: "create" });
  expect(host.textContent).toContain("Đang tạo tập podcast");
  expect(host.querySelector("h1")?.textContent).toContain("Tạo podcast");
  expect(host.textContent).not.toContain("Đang chỉnh sửa tập podcast");
  expect(host.textContent).not.toContain("Xem lại bốn bước sản xuất");
  await act(async () => stepButton(host, 3).click());
  expect(host.textContent).toContain("Đang tạo tập podcast");
});

it("starts in the full-width manual mode and keeps the editor mounted across AI switches", async () => {
  const host = await renderEpisode(`/moderator/podcast/episodes/${EPISODE_ID}?step=script`);
  await act(async () => host.querySelector('[role="combobox"][aria-label="Loại podcast"]')?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
  await act(async () => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find((option) => option.textContent?.startsWith("Độc thoại"))?.click());
  const editor = host.querySelector('[contenteditable="true"]');
  expect(editor).not.toBeNull();
  const toggle = host.querySelector<HTMLButtonElement>('[aria-label="Trợ lý AI tạo kịch bản"]');
  expect(toggle?.getAttribute("aria-pressed")).toBe("false");
  expect(host.querySelector<HTMLElement>(".podcast-script-ai")?.hidden).toBe(true);
  expect(host.textContent).toContain("Import file");
  const toolbar = host.querySelector('[role="toolbar"][aria-label="Chế độ soạn kịch bản"]');
  expect(toolbar).not.toBeNull();
  expect(toolbar?.querySelector('[aria-label="Đậm"]')).toBeNull();
  expect(toolbar?.textContent).not.toContain("Import file");
  expect(toolbar?.textContent).not.toContain("Lưu kịch bản");
  expect(toolbar?.textContent).toContain("Loại podcast");
  expect(toolbar?.querySelector('[aria-label="Trợ lý AI tạo kịch bản"]')).not.toBeNull();
  expect(host.querySelector('.podcast-script-workspace')?.textContent).not.toContain("Chưa có thay đổi");
  expect(host.querySelector('.podcast-script-workspace')?.textContent).not.toContain("phút đọc");
  expect(host.querySelector('[data-script-mode="manual"]')).not.toBeNull();
  await act(async () => toggle?.click());
  expect(toggle?.getAttribute("aria-pressed")).toBe("true");
  expect(host.querySelector<HTMLElement>(".podcast-script-manual")?.hidden).toBe(false);
  const assistant = host.querySelector('aside[aria-label="Trợ lý AI"]');
  expect(assistant?.textContent).not.toContain("Về soạn thủ công");
  expect(host.querySelectorAll('button[aria-label="Về soạn thủ công"]')).toHaveLength(1);
  expect(assistant?.querySelector('[role="tablist"]')).toBeNull();
  expect(assistant?.textContent).not.toContain("AI rà kịch bản");
  expect(assistant?.textContent).not.toContain("Tạo dàn ý");
  const topic = assistant?.querySelector<HTMLInputElement>('input[placeholder^="Vì sao"]');
  expect(topic).not.toBeNull();
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(topic, "Chủ đề đang soạn dở");
    topic?.dispatchEvent(new Event("input", { bubbles: true }));
  });
  await act(async () => toggle?.click());
  expect(host.querySelector('[contenteditable="true"]')).toBe(editor);
  expect(host.querySelector('aside[aria-label="Trợ lý AI"]')).toBe(assistant);
  expect(host.querySelector<HTMLElement>(".podcast-script-manual")?.hidden).toBe(false);
  await act(async () => toggle?.click());
  expect(assistant?.querySelector<HTMLInputElement>('input[placeholder^="Vì sao"]')?.value).toBe("Chủ đề đang soạn dở");
});

it("shows an error toast when saving a podcast fails", async () => {
  const patch = spyOn(podcastProductionService, "patchEpisode").mockRejectedValue(new Error("Không thể kết nối"));
  try {
    const host = await renderEpisode(`/moderator/podcast/episodes/${EPISODE_ID}`);
    const button = [...host.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent?.includes("Lưu thay đổi"))!;
    await act(async () => { button.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(useNotificationStore.getState().notifications.at(-1)).toMatchObject({ status: "error", title: "Không thể lưu podcast", description: "Không thể kết nối" });
  } finally { patch.mockRestore(); }
});

it("selects dialogue and monologue from the podcast type menu without the old switch buttons", async () => {
  const host = await renderEpisode(`/moderator/podcast/episodes/${EPISODE_ID}?step=script`);
  const openTypes = async (): Promise<void> => {
    const trigger = host.querySelector('[role="combobox"][aria-label="Loại podcast"]');
    await act(async () => trigger?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
  };
  await openTypes();
  await act(async () => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find((option) => option.textContent?.startsWith("Hội thoại"))?.click());
  expect(host.querySelector('[aria-label="Nội dung kịch bản hội thoại"]')).not.toBeNull();
  expect(host.textContent).not.toContain("Kịch bản hội thoại nhiều người");
  expect(host.textContent).not.toContain("Chuyển về một người kể");
  await openTypes();
  await act(async () => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find((option) => option.textContent?.startsWith("Độc thoại"))?.click());
  expect(host.querySelector('[data-script-mode="manual"]')).not.toBeNull();
  expect(host.querySelector('[role="switch"]')).toBeNull();
});

it("shows a success toast after manually saving the script", async () => {
  const save = spyOn(podcastProductionService, "script").mockResolvedValue({} as never);
  try {
    const host = await renderEpisode(`/moderator/podcast/episodes/${EPISODE_ID}?step=script`);
    const button = [...host.querySelectorAll<HTMLButtonElement>("button")].find((item) => item.textContent?.trim() === "Lưu kịch bản")!;
    await act(async () => { button.click(); await new Promise((resolve) => setTimeout(resolve, 0)); });
    expect(useNotificationStore.getState().notifications.some((item) => item.status === "success" && item.title === "Đã lưu kịch bản")).toBe(true);
  } finally { save.mockRestore(); }
});

it("keeps edited script unsaved after the former autosave delay until explicit save", async () => {
  const save = spyOn(podcastProductionService, "script").mockResolvedValue({} as never);
  try {
    const host = await renderEpisode(`/moderator/podcast/episodes/${EPISODE_ID}?step=script`);
    await act(async () => host.querySelector('[role="combobox"][aria-label="Loại podcast"]')?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
    await act(async () => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find((option) => option.textContent?.startsWith("Độc thoại"))?.click());
    const editor = host.querySelector<HTMLElement>('[contenteditable="true"]')!;
    await act(async () => {
      const paste = new Event("paste", { bubbles: true, cancelable: true });
      Object.defineProperty(paste, "clipboardData", { value: { getData: () => "Kịch bản đang soạn chưa lưu" } });
      editor.dispatchEvent(paste);
    });
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 1100)); });
    expect(editor.textContent).toContain("Kịch bản đang soạn chưa lưu");
    expect(save).not.toHaveBeenCalled();
    await act(async () => { [...host.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.trim() === "Lưu kịch bản")?.click(); });
    expect(save).toHaveBeenCalledTimes(1);
  } finally { save.mockRestore(); }
});

it("generates directly in AI mode and retains the same editable script without autosaving", async () => {
  const angles = spyOn(angleService, "list").mockResolvedValue({ items: [{ id: "builtin:timeline", name: "Trình tự thời gian", description: "Trước, trong, sau", guide: "Kể theo thời gian", builtin: true }] });
  const draft = spyOn(composeService, "draftSection").mockResolvedValue({ paragraphs: ["Kịch bản độc thoại AI hoàn chỉnh."], wordCount: 7, lengthStatus: "OK", exceedsLimit: false, cleaned: false, novelNumbers: [], promptVersion: 1 });
  const save = spyOn(podcastProductionService, "script");
  try {
    const host = await renderEpisode(`/moderator/podcast/episodes/${EPISODE_ID}?step=script`);
    await act(async () => host.querySelector('[role="combobox"][aria-label="Loại podcast"]')?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true })));
    await act(async () => Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find((option) => option.textContent?.startsWith("Độc thoại"))?.click());
    const editor = host.querySelector('[contenteditable="true"]');
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Trợ lý AI tạo kịch bản"]')?.click());
    const input = host.querySelector<HTMLInputElement>('input[placeholder^="Vì sao"]')!;
    await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "Lịch sử Việt Nam"); input.dispatchEvent(new Event("input", { bubbles: true })); });
    await act(async () => [...host.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.getAttribute("role") !== "tab" && button.textContent?.trim() === "Tạo kịch bản")?.click());
    expect(draft).toHaveBeenCalledTimes(1);
    expect(host.querySelector('.podcast-script-workspace')?.getAttribute("data-script-mode")).toBe("ai");
    expect(host.querySelector('[contenteditable="true"]')).toBe(editor);
    expect(editor?.textContent).toBe("Kịch bản độc thoại AI hoàn chỉnh.");
    expect(host.querySelector<HTMLElement>(".podcast-script-manual")?.hidden).toBe(false);
    expect(save).not.toHaveBeenCalled();
    expect(host.textContent).toContain("Tạo lại kịch bản");
    expect(host.querySelector('aside[aria-label="Trợ lý AI"]')?.textContent).not.toContain("Rà soát");
    await act(async () => host.querySelector<HTMLButtonElement>('[aria-label="Về soạn thủ công"]')?.click());
    const reviewButton = [...host.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.trim() === "AI rà soát");
    expect(reviewButton?.disabled).toBe(false);
    await act(async () => reviewButton?.click());
    expect(host.querySelector('.podcast-script-workspace')?.getAttribute("data-script-mode")).toBe("manual");
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Rà phần nào?");
    expect(document.querySelector('[role="dialog"]')?.textContent).toContain("Cả kịch bản");
  } finally { angles.mockRestore(); draft.mockRestore(); save.mockRestore(); }
});
