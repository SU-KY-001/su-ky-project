import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation, createMemoryRouter, RouterProvider } from "react-router";
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
  client.setQueryData(["moderator-release-schedules"], { items: [] });
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

it("opens the timeline from the moderator home and removes the overview navigation", async () => {
  const host = await renderAt("/moderator?create=milestone");
  expect(location(host)).toBe("/moderator/timeline?create=milestone");
  expect(host.querySelector('a[href="/moderator"]')).toBeNull();
  expect(host.querySelector('a[href="/moderator/timeline"]')?.getAttribute("aria-current")).toBe("page");
});

it("gives assignments, tickets and release schedule their own URLs", async () => {
  const host = await renderAt("/moderator");

  await act(async () => host.querySelector<HTMLAnchorElement>('a[href="/moderator/schedule"]')!.click());
  for (let attempt = 0; attempt < LAZY_LOAD_ATTEMPTS && !host.textContent?.includes("Danh sách lịch phát hành"); attempt++) {
    await act(async () => { await Bun.sleep(LAZY_LOAD_POLL_MS); });
  }
  expect(location(host)).toBe("/moderator/schedule");
  expect(host.textContent).toContain("Danh sách lịch phát hành");

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
  expect(host.querySelector('a[href="/moderator"]')).toBeNull();
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
  const language = document.body.querySelector<HTMLInputElement>("#series-language");
  expect(language?.value).toBe("Tiếng Việt");
  expect(language?.disabled).toBe(true);
  expect(document.body.textContent).not.toContain("Mã ngôn ngữ BCP 47");
  await act(async () => [...document.body.querySelectorAll<HTMLButtonElement>('[role="dialog"] button')].find((button) => button.textContent?.trim() === "Hủy")!.click());
  expect(location(host)).toBe("/moderator/podcast?status=DRAFT");
});

it("removes the Moderator sidebar from exhibition preview and restores it on return", async () => {
  await import("@react-three/fiber");
  const fonts = Object.getOwnPropertyDescriptor(document, "fonts");
  Object.defineProperty(document, "fonts", { configurable: true, value: { load: async () => [] } });
  const id = "11111111-1111-4111-8111-111111111111";
  const doc = { schemaVersion: 1, templateId: "gallery-1975-v1", templateVersion: 1, metadata: { title: "Triển lãm xem thử", subtitle: "", description: "", coverAssetId: null }, chapters: [{ id, roomKey: "room-1", title: "Chương 1", period: "", description: "" }], items: [] };
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(currentUserQueryKey, { id: "moderator-1", name: "Moderator", email: "mod@example.com", emailVerified: true, role: "moderator" });
  client.setQueryData(["exhibition", id], { id, slug: "preview", revision: 1, updatedAt: new Date().toISOString(), publicationStatus: "UNPUBLISHED", publishedRevision: null, document: doc, resolved: { metadata: doc.metadata, chapters: doc.chapters, items: [], audio: null }, allowedActions: ["edit"] });
  const router = createMemoryRouter([{ path: "/moderator/exhibitions/:id/:action", element: <ModeratorWorkspacePage /> }], { initialEntries: ["/moderator/exhibitions/" + id + "/preview"] });
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  try {
    await act(async () => { root?.render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>); });
    for (let attempt = 0; attempt < LAZY_LOAD_ATTEMPTS && !host.textContent?.includes("Kết thúc xem thử"); attempt++) await act(async () => { await Bun.sleep(LAZY_LOAD_POLL_MS); });
    expect(host.textContent).toContain("Kết thúc xem thử");
    expect(host.querySelector('[aria-label="Thu gọn sidebar"]')).toBeNull();
    expect(host.querySelector('[aria-label="Điều hướng moderator"]')).toBeNull();
    await act(async () => { await router.navigate("/moderator/exhibitions/" + id + "/edit"); });
    expect(host.querySelector('[aria-label="Thu gọn sidebar"]')).not.toBeNull();
  } finally { if (fonts) Object.defineProperty(document, "fonts", fonts); else Reflect.deleteProperty(document, "fonts"); }
});
