import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
mock.module("./EditorScene", () => ({ EditorScene: () => <div data-testid="editor-scene" /> }));
await import("@react-three/fiber");
const { ExhibitionEditor } = await import("./ExhibitionEditor");

let root: Root | undefined;
let cache: QueryClient;
afterEach(() => { act(() => root?.unmount()); cache?.clear(); document.body.innerHTML = ""; });

it("opens existing exhibitions at information and leaving this step returns to the list", async () => {
  const id = "11111111-1111-4111-8111-111111111111";
  const doc = { schemaVersion: 1, templateId: "gallery-1975-v1", templateVersion: 1, audioMode: "artwork", audioAssetId: null, metadata: { title: "Triển lãm đã lưu", subtitle: "Phụ đề đã lưu", description: "", coverAssetId: null }, chapters: [{ id, roomKey: "room-1", title: "Chương 1", period: "", description: "" }], items: [] };
  cache = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  cache.setQueryData(["exhibition", id], { id, slug: "draft", revision: 1, updatedAt: new Date().toISOString(), publicationStatus: "UNPUBLISHED", publishedRevision: null, document: doc, resolved: { metadata: doc.metadata, chapters: doc.chapters, items: [], audio: null }, allowedActions: ["edit"] });
  const router = createMemoryRouter([{ path: "/moderator/exhibitions/:id/edit", element: <ExhibitionEditor id={id} /> }, { path: "/moderator/exhibitions", element: <p>Danh sách triển lãm</p> }], { initialEntries: [`/moderator/exhibitions/${id}/edit`] });
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<QueryClientProvider client={cache}><RouterProvider router={router} /></QueryClientProvider>));
  expect(host.querySelector<HTMLInputElement>('input[placeholder^="Ví dụ: Ký ức"]')?.value).toBe("Triển lãm đã lưu");
  expect(host.textContent).toContain("Chế độ âm thanh");
  expect(host.querySelector("canvas")).toBeNull();
  await act(async () => { [...host.querySelectorAll("button")].find(button => button.textContent?.trim() === "Quay lại")?.click(); });
  expect(router.state.location.pathname).toBe("/moderator/exhibitions");
});

it("keeps only the selected artwork image uploader when adding and switching several artworks", async () => {
  const media = window.matchMedia;
  window.matchMedia = (query: string) => ({ matches: false, media: query, onchange: null, addListener() {}, removeListener() {}, addEventListener() {}, removeEventListener() {}, dispatchEvent: () => true });
  const id = "11111111-1111-4111-8111-111111111111";
  const doc = { schemaVersion: 1, templateId: "gallery-1975-v1", templateVersion: 1, audioMode: "artwork", audioAssetId: null, metadata: { title: "Triển lãm", subtitle: "", description: "", coverAssetId: null }, chapters: [{ id, roomKey: "room-1", title: "Chương 1", period: "", description: "" }], items: [] };
  cache = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  cache.setQueryData(["exhibition", id], { id, slug: "draft", revision: 1, updatedAt: new Date().toISOString(), publicationStatus: "UNPUBLISHED", publishedRevision: null, document: doc, resolved: { metadata: doc.metadata, chapters: doc.chapters, items: [], audio: null }, allowedActions: ["edit"] });
  cache.setQueryData(["image-policy"], { mimeTypes: ["image/png"], formats: ["png"], maxBytes: 5000000 });
  const router = createMemoryRouter([{ path: "/edit", element: <ExhibitionEditor id={id} /> }], { initialEntries: ["/edit?step=layout"] });
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  try {
    await act(async () => root?.render(<QueryClientProvider client={cache}><RouterProvider router={router} /></QueryClientProvider>));
    const click = async (text: string) => { await act(async () => { [...document.querySelectorAll("button")].find(button => button.textContent?.includes(text))?.click(); }); };
    await click("Đã hiểu");
    for (let index = 0; index < 3; index++) { await click("Thêm tranh mới"); }
    expect([...host.querySelectorAll("label")].filter(label => label.textContent === "Ảnh trưng bày")).toHaveLength(1);
    await click("Tranh mới 1");
    expect([...host.querySelectorAll("label")].filter(label => label.textContent === "Ảnh trưng bày")).toHaveLength(1);
    expect(host.querySelectorAll('input[type="file"]')).toHaveLength(2);
  } finally { window.matchMedia = media; }
});
