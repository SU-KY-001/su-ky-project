import { afterEach, expect, it } from "bun:test";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ArtworkPodcastPicker } from "./ArtworkPodcastPicker";

let root: Root | undefined;
let client: QueryClient;
afterEach(() => { act(() => root?.unmount()); client?.clear(); document.body.innerHTML = ""; });

it("enables podcast selection after artwork is ready and chooses a narration from its series", async () => {
  client = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  client.setQueryData(["auth", "current-user"], null);
  client.setQueryData(["exhibition-series", 1], { items: [{ id: "series", title: "Series lịch sử" }], page: 1, limit: 50, total: 1 });
  const option = { id: "narration", episodeId: "episode", episodeTitle: "Câu chuyện lịch sử", seriesId: "series", seriesTitle: "Series lịch sử", narrationLabel: "Người dẫn chuyện" };
  client.setQueryData(["exhibition-podcasts", "series", 1], { items: [option], page: 1, limit: 10, total: 1 });
  const selections: string[] = [];
  function Harness({ ready }: { ready: boolean }) {
    const [value, setValue] = useState<string | null>(null);
    return <ArtworkPodcastPicker ready={ready} value={value} onChange={next => { if (next) selections.push(next.id); setValue(next?.id ?? null); }} />;
  }
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<QueryClientProvider client={client}><Harness ready={false} /></QueryClientProvider>));
  expect(host.querySelector("fieldset")?.disabled).toBe(true);
  await act(async () => root?.render(<QueryClientProvider client={client}><Harness ready /></QueryClientProvider>));
  const series = host.querySelector<HTMLSelectElement>('[aria-label="Chọn series podcast"]')!;
  await act(async () => { series.value = "series"; series.dispatchEvent(new Event("change", { bubbles: true })); });
  const podcast = host.querySelector<HTMLSelectElement>('[aria-label="Chọn podcast"]')!;
  expect(podcast.textContent).toContain(option.episodeTitle);
  await act(async () => { podcast.value = option.id; podcast.dispatchEvent(new Event("change", { bubbles: true })); });
  expect(selections).toEqual(["narration"]);
  expect(host.textContent).toContain("Nghe trước podcast");
});
