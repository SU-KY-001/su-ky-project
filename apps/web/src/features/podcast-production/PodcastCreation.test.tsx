import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, useLocation } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { PodcastCreation } from "./PodcastCreation";

const EPISODE_ID = "0feffcaa-036d-4c8f-8096-c47e13e72f91";
const SERIES_ID = "5a1f6d0e-0000-4000-8000-000000000001";

let root: Root | undefined;
let client: QueryClient | undefined;
afterEach(() => { act(() => root?.unmount()); client?.clear(); document.body.innerHTML = ""; });

function LocationProbe() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname}{search}</output>;
}

async function renderEpisode(entry: string): Promise<HTMLElement> {
  client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["podcast-production", "episode", EPISODE_ID], {
    id: EPISODE_ID, seriesId: SERIES_ID, seriesTitle: "Series", seriesStatus: "DRAFT", title: "Tập 1", slug: "tap-1", description: null,
    sortOrder: 1, status: "DRAFT", isDeleted: false, lock: null, publishedAt: null, updatedAt: "2026-10-22T00:00:00.000Z",
    narrations: [], attachments: [], poster: null, entityTags: [], publishChecklist: { ready: false, items: [], warnings: [] },
  });
  client.setQueryData(["podcast-production", "series-detail", SERIES_ID], { id: SERIES_ID, title: "Series", primaryHistoricalEventId: null, episodes: [], sources: [] });
  client.setQueryData(["podcast-production", "series", ""], { pages: [{ items: [], page: 1, limit: 20, total: 0 }], pageParams: [1] });
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(
    <MemoryRouter initialEntries={[entry]}>
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
