import { afterEach, beforeEach, expect, it, spyOn } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { LibraryChapter } from "@repo/shared";
import { PodcastToolbar } from "./PodcastToolbar";
import { libraryService } from "../../services/libraryService";
import { usePodcastPlaybackStore } from "../../store/podcastPlaybackStore";
import { currentUserQueryKey } from "@/shared/services/currentUserService";

const episodes: LibraryChapter[] = [1, 2].map(n => ({ id: `00000000-0000-4000-8000-00000000000${n}`, slug: `episode-${n}`, title: `Tên tập podcast ${n} có nội dung lịch sử`, sortOrder: n, narrations: [{ id: `10000000-0000-4000-8000-00000000000${n}`, type: "THIRD_PERSON", durationMs: 10_000, available: true }] }));
const playlist = { slug: "series", title: "Series", creator: "Tác giả", episodes };
function playbackData(narrationId: string): Awaited<ReturnType<typeof libraryService.playback>> {
  return { narrationId, episodeId: episodes.find(e => e.narrations[0].id === narrationId)!.id, audio: { assetId: "30000000-0000-4000-8000-000000000001", url: "https://example.test/audio.mp3", mimeType: "audio/mpeg", durationMs: 10_000 }, progress: null, sync: { intervalMs: 60_000, completionThreshold: 0.9 } };
}
function catalog(slug = episodes[0].slug, count = 3): Awaited<ReturnType<typeof libraryService.quizzes>> {
  return { page: 1, limit: 12, total: 1, items: [{ id: "20000000-0000-4000-8000-000000000001", title: "Quiz", description: null, episodeSlug: slug, episodeTitle: "Tập", seriesSlug: "series", seriesTitle: "Series", topicId: null, topicName: null, posterUrl: null, questionCount: count, plays: 0, hasCompleted: false }] };
}
let root: Root | undefined, client: QueryClient;
const restores: (() => void)[] = [];
const originalObserver = globalThis.ResizeObserver;
let toolbarHeight = 100, resizeToolbar: () => void = () => {};
beforeEach(() => {
  toolbarHeight = 100;
  Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, value: class implements ResizeObserver {
    constructor(private callback: ResizeObserverCallback) {}
    observe(element: Element): void {
      if (element.getAttribute("aria-label") !== "Thanh phát podcast") return;
      Object.defineProperty(element, "getBoundingClientRect", { configurable: true, value: (): DOMRect => new DOMRect(0, 0, 1000, toolbarHeight) });
      resizeToolbar = (): void => this.callback([], this);
    }
    unobserve(): void {}
    disconnect(): void {}
  } });
  usePodcastPlaybackStore.setState({ playlist, episodeId: episodes[0].id, playRequest: 1, playing: true, pauseRequested: false, shuffle: false, repeat: "off", history: [] });
  const play = spyOn(HTMLMediaElement.prototype, "play").mockImplementation(function(this: HTMLMediaElement): Promise<void> { Object.defineProperty(this, "paused", { configurable: true, value: false }); this.dispatchEvent(new Event("play")); return Promise.resolve(); });
  const pause = spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(function(this: HTMLMediaElement): void { Object.defineProperty(this, "paused", { configurable: true, value: true }); this.dispatchEvent(new Event("pause")); });
  const playback = spyOn(libraryService, "playback").mockImplementation(async narrationId => playbackData(narrationId));
  const progress = spyOn(libraryService, "saveProgress").mockImplementation(async narrationId => ({ narrationId, positionMs: 10_000, playedSeconds: 10, percent: 100, completedAt: new Date(), completion: null }));
  restores.push(() => play.mockRestore(), () => pause.mockRestore(), () => playback.mockRestore(), () => progress.mockRestore());
});
afterEach(async () => {
  await act(async () => root?.unmount()); root = undefined; client?.clear();
  for (const restore of restores.splice(0)) restore();
  usePodcastPlaybackStore.getState().close();
  Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, value: originalObserver });
  document.body.innerHTML = "";
});
async function render(): Promise<ReturnType<typeof createMemoryRouter>> {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(currentUserQueryKey, { id: "listener", name: "Listener", email: "listener@example.test", emailVerified: true, role: "user" });
  for (const episode of episodes) client.setQueryData(["library-playback", "listener", episode.narrations[0].id], playbackData(episode.narrations[0].id));
  const router = createMemoryRouter([{ path: "/", element: <><Outlet /><PodcastToolbar /></>, children: [{ index: true, element: <p>Trang nghe</p> }, { path: "quiz/:slug", element: <h1>Trang làm quiz</h1> }] }]);
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => { root?.render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>); await Bun.sleep(20); });
  return router;
}
async function finish(): Promise<void> {
  const audio = document.querySelector("audio"); if (!audio) throw new Error("Missing audio");
  Object.defineProperty(audio, "ended", { configurable: true, value: true });
  await act(async () => { audio.dispatchEvent(new Event("ended")); await Bun.sleep(30); });
}
function quizzes(result = catalog()): void { const spy = spyOn(libraryService, "quizzes").mockResolvedValue(result); restores.push(() => spy.mockRestore()); }

it("offers the finished episode's quiz with a short heading, actual count and direct route", async () => {
  quizzes(); await render(); await finish();
  expect(usePodcastPlaybackStore.getState().episodeId).toBe(episodes[1].id);
  const invitation = document.querySelector('[aria-label="Ôn tập sau khi nghe"]');
  expect(Boolean(invitation)).toBe(true); expect(invitation?.textContent).toContain("Ôn lại nội dung vừa nghe");
  expect(invitation?.textContent).toContain(episodes[0].title); expect(invitation?.textContent).toContain("3 câu hỏi");
  expect(invitation?.querySelector('a')?.getAttribute("href")).toBe("/quiz/episode-1");
});
it("pauses the currently playing next episode on quiz start, including metadata that arrives later", async () => {
  quizzes(); const router = await render(); await finish();
  const audio = document.querySelector("audio")!;
  await act(async () => audio.dispatchEvent(new Event("loadedmetadata")));
  expect(audio.paused).toBe(false);
  await act(async () => document.querySelector<HTMLAnchorElement>('[aria-label="Ôn tập sau khi nghe"] a')?.click());
  expect(router.state.location.pathname).toBe("/quiz/episode-1");
  expect(audio.paused).toBe(true);
  await act(async () => audio.dispatchEvent(new Event("loadedmetadata")));
  expect(audio.paused).toBe(true);
});
it("dismisses without pausing and does not repeat the skipped episode in the same session", async () => {
  quizzes(); await render(); await finish();
  expect(document.body.textContent).toContain("Để sau");
  const audio = document.querySelector("audio")!; await act(async () => audio.dispatchEvent(new Event("loadedmetadata")));
  await act(async () => [...document.querySelectorAll("button")].find(b => b.textContent === "Để sau")?.click());
  expect(audio.paused).toBe(false); expect(Boolean(document.querySelector('[aria-label="Ôn tập sau khi nghe"]'))).toBe(false);
  await act(async () => { usePodcastPlaybackStore.getState().play(playlist, episodes[0].id); await Bun.sleep(20); });
  await finish(); expect(Boolean(document.querySelector('[aria-label="Ôn tập sau khi nghe"]'))).toBe(false);
});
it("does not invite for an episode without quiz questions", async () => {
  quizzes(catalog(episodes[0].slug, 0)); await render(); await finish();
  expect(Boolean(document.querySelector('[aria-label="Ôn tập sau khi nghe"]'))).toBe(false);
});
it("ignores a delayed quiz lookup after the listening session has closed", async () => {
  let resolve: (value: Awaited<ReturnType<typeof libraryService.quizzes>>) => void = () => {};
  const spy = spyOn(libraryService, "quizzes").mockImplementation(() => new Promise(done => { resolve = done; })); restores.push(() => spy.mockRestore());
  await render(); await finish();
  await act(async () => usePodcastPlaybackStore.getState().close());
  await act(async () => { resolve(catalog()); await Bun.sleep(10); });
  await act(async () => { usePodcastPlaybackStore.getState().play(playlist, episodes[1].id); await Bun.sleep(20); });
  expect(Boolean(document.querySelector('[aria-label="Ôn tập sau khi nghe"]'))).toBe(false);
});
it("positions the invitation above the toolbar when its height changes", async () => {
  quizzes(); await render(); await finish();
  await act(async () => { toolbarHeight = 160; resizeToolbar(); });
  const invitation = document.querySelector<HTMLElement>('[aria-label="Ôn tập sau khi nghe"]');
  expect(invitation?.style.bottom).toBe("172px");
});
it("keeps quiz playback paused on a late play event and allows an explicit resume", async () => {
  quizzes(); await render(); await finish();
  const audio = document.querySelector("audio")!;
  await act(async () => document.querySelector<HTMLAnchorElement>('[aria-label="Ôn tập sau khi nghe"] a')?.click());
  await act(async () => { Object.defineProperty(audio, "paused", { configurable: true, value: false }); audio.dispatchEvent(new Event("play")); });
  expect(audio.paused).toBe(true);
  expect(usePodcastPlaybackStore.getState().pauseRequested).toBe(true);
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Phát podcast"]')?.click());
  expect(audio.paused).toBe(false);
  expect(usePodcastPlaybackStore.getState().pauseRequested).toBe(false);
});
it.each(["close", "pause"] as const)("does not restart repeat-one audio after %s while progress saving is pending", async action => {
  quizzes(); await render();
  const audio = document.querySelector("audio")!;
  let resolve: (value: Awaited<ReturnType<typeof libraryService.saveProgress>>) => void = () => {};
  const save = spyOn(libraryService, "saveProgress").mockImplementation(() => new Promise(done => { resolve = done; })); restores.push(() => save.mockRestore());
  await act(async () => usePodcastPlaybackStore.setState({ repeat: "one" }));
  Object.defineProperty(audio, "ended", { configurable: true, value: true });
  await act(async () => audio.dispatchEvent(new Event("ended")));
  await act(async () => usePodcastPlaybackStore.getState()[action]());
  const play = spyOn(audio, "play").mockResolvedValue(); restores.push(() => play.mockRestore());
  await act(async () => { resolve({ narrationId: episodes[0].narrations[0].id, positionMs: 10_000, playedSeconds: 10, percent: 100, completedAt: new Date(), completion: null }); await Bun.sleep(10); });
  expect(play).not.toHaveBeenCalled();
});
