import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { PodcastSeriesGallery } from "./PodcastSeriesGallery";

const originalResizeObserver = globalThis.ResizeObserver;
let root: Root | undefined;
let client: QueryClient;
afterEach(async () => {
  await act(async () => root?.unmount());
  client?.clear();
  Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, value: originalResizeObserver });
  document.body.innerHTML = "";
});

it("hides the previous button at the padded first-card snap position and shows it after scrolling", async () => {
  Object.defineProperty(globalThis, "ResizeObserver", { configurable: true, value: class {
    observe(element: Element): void {
      if (!(element instanceof HTMLUListElement)) return;
      Object.defineProperties(element, { clientWidth: { configurable: true, value: 300 }, scrollWidth: { configurable: true, value: 900 } });
      element.style.paddingLeft = "4px";
      element.style.paddingRight = "4px";
      element.scrollLeft = 4;
    }
    unobserve(): void {}
    disconnect(): void {}
  } });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  const series = { id: "series", slug: "series", title: "Series lịch sử", episodeCount: 3 };
  client.setQueryData(["library-gallery-series", undefined, undefined, undefined], {
    pages: [{ items: [series], page: 1, limit: 20, total: 1 }], pageParams: [1],
  });
  client.setQueryData(["library-series", series.slug], { ...series, episodes: [1, 2, 3].map(id => ({ id: String(id), slug: `episode-${id}`, title: `Tập ${id}`, description: "Mô tả", narrations: [] })) });
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<QueryClientProvider client={client}><MemoryRouter><PodcastSeriesGallery filter={{}} onPlay={() => undefined} /></MemoryRouter></QueryClientProvider>));
  const rail = host.querySelector<HTMLUListElement>("#podcast-rail-series");
  expect(rail).not.toBeNull();
  const previous = (): Element | null => host.querySelector('[aria-label="Các tập trước của Series lịch sử"]');
  const next = (): Element | null => host.querySelector('[aria-label="Các tập tiếp theo của Series lịch sử"]');
  expect(previous() === null).toBe(true);
  expect(next() !== null).toBe(true);
  if (!rail) throw new Error("Missing podcast rail");
  await act(async () => { rail.scrollLeft = 120; rail.dispatchEvent(new Event("scroll")); });
  expect(previous() !== null).toBe(true);
  expect(next() !== null).toBe(true);
  await act(async () => { rail.scrollLeft = 596; rail.dispatchEvent(new Event("scroll")); });
  expect(next() === null).toBe(true);
  await act(async () => { rail.scrollLeft = 4; rail.dispatchEvent(new Event("scroll")); });
  expect(previous() === null).toBe(true);
});
