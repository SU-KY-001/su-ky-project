import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HistoricalCatalogList } from "./HistoricalCatalogList";
import { currentUserQueryKey } from "@/shared/services/currentUserService";

const originalFetch = globalThis.fetch;
let root: Root | undefined;
let client: QueryClient;
afterEach(async () => {
  await act(async () => root?.unmount());
  client?.clear();
  globalThis.fetch = originalFetch;
  document.body.innerHTML = "";
});
async function settle(check: () => boolean): Promise<void> {
  const until = Date.now() + 3000;
  while (!check()) {
    if (Date.now() > until) throw new Error("UI did not settle");
    await act(async () => { await new Promise(resolve => setTimeout(resolve, 10)); });
  }
}
it("shows six event columns and opens details only using the detail button without requesting sources", async () => {
  const requests: string[] = [];
  const common = { summary: "Mô tả lịch sử", time: { kind: "UNKNOWN", note: "Chưa rõ" }, timeLabel: "Chưa rõ",
    startYear: null, endYear: null, version: 1, deletedAt: null, createdById: "owner", updatedAt: new Date(),
    childCount: 0, podcastCount: 3, warnings: [] };
  const period = { ...common, id: "11111111-1111-4111-8111-111111111111", name: "Thời kỳ A", slug: "period", isActive: true, sourceCount: 0, citationCount: 0, citations: [], phases: [] };
  const phase = { ...period, id: "22222222-2222-4222-8222-222222222222", name: "Giai đoạn A", periodId: period.id, period };
  const events = ["Sự kiện A", "Sự kiện B"].map((name, index) => ({ ...common,
    id: `33333333-3333-4333-8333-33333333333${index}`, name, slug: `event-${index}`, entityType: "EVENT",
    aliases: [], historicalPhaseId: phase.id, historicalPhase: phase }));
  globalThis.fetch = Object.assign(async (input: URL | RequestInfo) => {
    const path = new URL(input instanceof Request ? input.url : String(input)).pathname;
    requests.push(path);
    if (path.endsWith("/historical-entities")) return Response.json({ items: events, page: 1, limit: 20, total: 2 });
    const event = events.find(item => path.endsWith(`/${item.id}`));
    if (event) return Response.json(event);
    return Response.json({ error_code: "NOT_FOUND", message: path }, { status: 404 });
  }, { preconnect: originalFetch.preconnect });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(currentUserQueryKey, { id: "owner", role: "moderator" });
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<QueryClientProvider client={client}><HistoricalCatalogList section="events" /></QueryClientProvider>));
  await settle(() => Boolean(host.textContent?.includes("Sự kiện B")));
  expect(Array.from(host.querySelectorAll("thead th")).map(cell => cell.textContent?.trim())).toEqual([
    "Sự kiện", "Thời kỳ", "Giai đoạn", "Mốc thời gian", "Podcast", "Thao tác",
  ]);
  const row = Array.from(host.querySelectorAll("tbody tr")).find(item => item.textContent?.includes("Sự kiện B"));
  await act(async () => row?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(row?.getAttribute("aria-expanded")).toBeNull();
  const detailButton = row?.querySelector<HTMLButtonElement>('button[aria-label="Xem chi tiết Sự kiện B"]');
  expect(detailButton).not.toBeNull();
  await act(async () => detailButton?.click());
  await settle(() => Boolean(document.querySelector('[role="dialog"]')?.textContent?.includes("Mô tả lịch sử")));
  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog?.textContent).toContain("Sự kiện B");
  expect(dialog?.textContent).toContain("Thời kỳ A");
  expect(dialog?.textContent).toContain("Giai đoạn A");
  expect(dialog?.textContent).not.toContain("Kiểm duyệt");
  expect(dialog?.textContent).not.toContain("Nguồn tư liệu");
  expect(requests.some(path => path.includes("/sources") || path.includes("/review"))).toBe(false);
});
