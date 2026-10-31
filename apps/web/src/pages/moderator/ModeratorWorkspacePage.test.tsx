import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { currentUserQueryKey } from "@/shared/services/currentUserService";
import { ModeratorWorkspacePage } from "./ModeratorWorkspacePage";

let root: Root | undefined;
let client: QueryClient;
const LAZY_LOAD_ATTEMPTS = 40;
const LAZY_LOAD_POLL_MS = 50;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  client?.clear();
  document.body.innerHTML = "";
});

function LocationProbe() {
  const { pathname, search } = useLocation();
  return <output data-testid="location">{pathname}{search}</output>;
}

async function renderAt(entry: string): Promise<HTMLDivElement> {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(currentUserQueryKey, { id: "moderator-1", name: "Điều hành Sử Ký", email: "moderator@example.org", emailVerified: true, role: "moderator" });
  client.setQueryData(["moderator-release-assignments"], { items: [] });
  client.setQueryData(["moderator-assignable-episodes"], { items: [] });
  client.setQueryData(["moderator-release-reminders"], { items: [] });
  client.setQueryData(["moderator-release-tickets", "list"], { items: [], total: 0, page: 1, limit: 20 });
  client.setQueryData(["moderator-release-tickets", "assignments"], { items: [] });
  client.setQueryData(["quiz", "list"], { items: [] });
  client.setQueryData(["podcast-production", "series", ""], { pages: [{ items: [], page: 1, limit: 20, total: 0 }], pageParams: [1] });
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(
      <MemoryRouter initialEntries={[entry]}>
        <QueryClientProvider client={client}>
          <Routes><Route path="/moderator/*" element={<ModeratorWorkspacePage />} /></Routes>
          <LocationProbe />
        </QueryClientProvider>
      </MemoryRouter>,
    );
  });
  return host;
}

const location = (host: HTMLElement) => host.ownerDocument.querySelector('[data-testid="location"]')?.textContent;

it("gives assignments, tickets and release schedule their own URLs", async () => {
  const host = await renderAt("/moderator");

  await act(async () => host.querySelector<HTMLAnchorElement>('a[href="/moderator/schedule"]')!.click());
  for (let attempt = 0; attempt < LAZY_LOAD_ATTEMPTS && !host.textContent?.includes("Thời khóa biểu"); attempt++) {
    await act(async () => { await Bun.sleep(LAZY_LOAD_POLL_MS); });
  }
  expect(location(host)).toBe("/moderator/schedule");
  expect(host.textContent).toContain("Thời khóa biểu");

  await act(async () => host.querySelector<HTMLAnchorElement>('a[href="/moderator/assignments"]')!.click());
  for (let attempt = 0; attempt < LAZY_LOAD_ATTEMPTS && location(host) !== "/moderator/assignments"; attempt++) {
    await act(async () => { await Bun.sleep(LAZY_LOAD_POLL_MS); });
  }
  expect(location(host)).toBe("/moderator/assignments");
  expect(host.textContent).toContain("Nhiệm vụ của tôi");

  await act(async () => host.querySelector<HTMLAnchorElement>('a[href="/moderator/tickets"]')!.click());
  for (let attempt = 0; attempt < LAZY_LOAD_ATTEMPTS && location(host) !== "/moderator/tickets"; attempt++) {
    await act(async () => { await Bun.sleep(LAZY_LOAD_POLL_MS); });
  }
  expect(host.textContent).toContain("Bạn chưa gửi ticket nào");
});

it("opens the screen named by a deep link and marks its nav item current", async () => {
  const host = await renderAt("/moderator/tickets");
  for (let attempt = 0; attempt < LAZY_LOAD_ATTEMPTS && !host.textContent?.includes("Bạn chưa gửi ticket nào"); attempt++) {
    await act(async () => { await Bun.sleep(LAZY_LOAD_POLL_MS); });
  }
  expect(host.textContent).toContain("Bạn chưa gửi ticket nào");
  expect(host.querySelector('a[href="/moderator/tickets"]')?.getAttribute("aria-current")).toBe("page");
  expect(host.querySelector('a[href="/moderator"]')?.hasAttribute("aria-current")).toBe(false);
});

it("opens quizzes from a deep link and preserves navigation to angles", async () => {
  const host = await renderAt("/moderator/quizzes");
  for (let attempt = 0; attempt < LAZY_LOAD_ATTEMPTS && !host.querySelector('[role="searchbox"]'); attempt++) {
    await act(async () => { await Bun.sleep(LAZY_LOAD_POLL_MS); });
  }
  expect(host.textContent).toContain("Bộ quiz của bạn");
  expect(host.textContent).toContain("Tạo quiz");
  expect(host.querySelector('a[href="/moderator/quizzes"]')?.getAttribute("aria-current")).toBe("page");
  await act(async () => host.querySelector<HTMLAnchorElement>('a[href="/moderator/angles"]')!.click());
  for (let attempt = 0; attempt < LAZY_LOAD_ATTEMPTS && location(host) !== "/moderator/angles"; attempt++) {
    await act(async () => { await Bun.sleep(LAZY_LOAD_POLL_MS); });
  }
  expect(location(host)).toBe("/moderator/angles");
  expect(host.querySelector('a[href="/moderator/angles"]')?.getAttribute("aria-current")).toBe("page");
});

it("restores the series creation dialog from its URL and keeps list filters when closing it", async () => {
  const host = await renderAt("/moderator/podcast/series/new?status=DRAFT");
  // The podcast screen is lazy-loaded; poll until its dialog mounts.
  for (let attempt = 0; attempt < LAZY_LOAD_ATTEMPTS && !document.body.querySelector('[role="dialog"]'); attempt++) {
    await act(async () => { await Bun.sleep(LAZY_LOAD_POLL_MS); });
  }
  expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  await act(async () => [...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((button) => button.textContent?.trim() === "Hủy")!.click());
  expect(location(host)).toBe("/moderator/podcast?status=DRAFT");
});
