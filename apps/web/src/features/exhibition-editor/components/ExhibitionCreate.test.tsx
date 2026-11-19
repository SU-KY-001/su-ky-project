import { afterEach, expect, it, spyOn } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExhibitionCreate } from "./ExhibitionCreate";
import { ExhibitionWorkspaceSchema } from "@repo/shared";
import { exhibitionService } from "../services/exhibitionService";

let root: Root | undefined;
const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
afterEach(() => { act(() => root?.unmount()); client.clear(); document.body.innerHTML = ""; });

it("validates the name inline and updates the chapters when choosing the room count", async () => {
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<MemoryRouter><QueryClientProvider client={client}><ExhibitionCreate /></QueryClientProvider></MemoryRouter>));
  const form = host.querySelector("form")!;
  expect(form.noValidate).toBe(true);
  await act(async () => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(host.textContent).toContain("Vui lòng nhập tên triển lãm.");
  const select = host.querySelector<HTMLButtonElement>('[role="combobox"][aria-label="Số phòng triển lãm"]');
  expect(select).not.toBeNull();
  await act(async () => select?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  const option = [...document.querySelectorAll<HTMLElement>('[role="option"]')].find(item => item.textContent?.trim() === "1 phòng");
  expect(option).toBeDefined();
  await act(async () => option?.click());
  expect(host.querySelectorAll("fieldset input[placeholder^='Tên chương']")).toHaveLength(1);
  expect(host.textContent).toContain("1 phòng");
  expect(host.querySelector("canvas")).toBeNull();
});

it("switches between whole-gallery audio and podcasts attached to artwork", async () => {
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<MemoryRouter><QueryClientProvider client={client}><ExhibitionCreate /></QueryClientProvider></MemoryRouter>));
  expect(host.querySelector('input[type="file"]')).not.toBeNull();
  await act(async () => host.querySelector<HTMLInputElement>('[role="radio"][value="artwork"]')?.click());
  expect(host.querySelector('input[type="file"]')).toBeNull();
  expect(host.textContent).toContain("Tải file âm thanh cho từng tranh");
  await act(async () => host.querySelector<HTMLInputElement>('[role="radio"][value="room"]')?.click());
  expect(host.querySelector('input[type="file"]')).not.toBeNull();
});

it("continues the information step on the same draft without creating another exhibition", async () => {
  const chapter = { id: "11111111-1111-4111-8111-111111111111", roomKey: "room-1", title: "Chương 1", period: "", description: "" };
  const doc = { schemaVersion: 1, templateId: "gallery-1975-v1", templateVersion: 1, audioMode: "artwork", audioAssetId: null, metadata: { title: "Triển lãm đang tạo", subtitle: "", description: "", coverAssetId: null }, chapters: [chapter], items: [] };
  const workspace = ExhibitionWorkspaceSchema.parse({ id: chapter.id, slug: "draft", revision: 2, updatedAt: "2026-11-19T00:00:00.000Z", publicationStatus: "UNPUBLISHED", publishedRevision: null, document: doc, resolved: { metadata: doc.metadata, chapters: [chapter], items: [], audio: null }, allowedActions: ["edit"] });
  const save = spyOn(exhibitionService, "save").mockResolvedValue(workspace);
  const create = spyOn(exhibitionService, "create");
  let continued = "";
  try {
    const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
    await act(async () => root?.render(<MemoryRouter><QueryClientProvider client={client}><ExhibitionCreate initialWorkspace={workspace} onContinue={result => { continued = result.id; }} /></QueryClientProvider></MemoryRouter>));
    await act(async () => { host.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); await Bun.sleep(20); });
    expect(save).toHaveBeenCalledWith(workspace.id, 2, workspace.document);
    expect(create).not.toHaveBeenCalled();
    expect(continued).toBe(workspace.id);
  } finally { save.mockRestore(); create.mockRestore(); }
});
