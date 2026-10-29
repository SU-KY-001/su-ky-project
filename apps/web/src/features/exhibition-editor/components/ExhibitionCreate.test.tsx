import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ExhibitionCreate } from "./ExhibitionCreate";

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
