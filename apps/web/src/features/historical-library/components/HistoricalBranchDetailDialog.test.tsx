import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HistoricalPeriodDetailSchema, HistoricalPhaseDetailSchema, HistoricalEntityDetailSchema, HistoricalCitationSchema } from "@repo/shared";
import { currentUserQueryKey } from "@/shared/services/currentUserService";
import { HistoricalLibraryWorkspace } from "./HistoricalLibraryWorkspace";

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
    if (Date.now() > until) throw new Error("Historical detail did not settle");
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
  }
}

function button(text: string): HTMLButtonElement {
  const found = Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((item) => item.textContent?.trim() === text);
  if (!found) throw new Error(`Missing button: ${text}`);
  return found;
}

async function openSelect(label: string): Promise<string[]> {
  const trigger = document.querySelector<HTMLButtonElement>(`[role="dialog"] [role="combobox"][aria-label="${label}"]`);
  expect(trigger?.disabled).toBe(false);
  await act(async () => trigger?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  await settle(() => Boolean(document.querySelector('[role="listbox"]')));
  return Array.from(document.querySelectorAll('[role="option"]')).map((option) => option.textContent?.trim() ?? "");
}

async function chooseOption(label: string): Promise<void> {
  const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find((item) => item.textContent?.trim() === label);
  expect(option).toBeDefined();
  await act(async () => option?.click());
}

it("opens the paginated branch and edits the selected content without bypassing permissions", async () => {
  const common = {
    summary: "Mô tả lịch sử", time: { kind: "RANGE", start: { year: 1802, precision: "YEAR", approximate: false }, end: { year: 1945, precision: "YEAR", approximate: false }, endState: "KNOWN" },
    timeLabel: "1802 – 1945", startYear: 1802, endYear: 1945, version: 1,
    deletedAt: null, createdById: "owner", updatedAt: new Date().toISOString(),
    childCount: 1, sourceCount: 0, citationCount: 0, podcastCount: 0, isActive: true,
  };
  const period = HistoricalPeriodDetailSchema.parse({ ...common, id: "11111111-1111-4111-8111-111111111111", name: "Thời kỳ Nguyễn", slug: "thoi-ky-nguyen" });
  const phase = HistoricalPhaseDetailSchema.parse({ ...common, id: "22222222-2222-4222-8222-222222222222", name: "Giai đoạn đầu", slug: "giai-doan-dau", periodId: period.id });
  const secondPhase = HistoricalPhaseDetailSchema.parse({ ...phase, id: "44444444-4444-4444-8444-444444444444", name: "Giai đoạn cuối", slug: "giai-doan-cuoi", createdById: "another-owner" });
  const event = HistoricalEntityDetailSchema.parse({ ...common, id: "33333333-3333-4333-8333-333333333333", name: "Sự kiện đầu", slug: "su-kien-dau", entityType: "EVENT", aliases: [], historicalPhaseId: phase.id, historicalPhase: phase, reviewStatus: "DRAFT", reviewedVersion: null, reviewedAt: null, reviewNote: null, displayStatus: "DRAFT", readiness: { ready: false, reasons: ["MISSING_SOURCE"] } });
  const nextEvent = { ...event, id: "55555555-5555-4555-8555-555555555555", name: "Sự kiện trang hai", slug: "su-kien-trang-hai" };
  const lastEvent = { ...event, id: "66666666-6666-4666-8666-666666666666", name: "Sự kiện giai đoạn cuối", slug: "su-kien-cuoi", historicalPhaseId: secondPhase.id, historicalPhase: secondPhase };
  const page = (items: unknown[]) => ({ items, page: 1, limit: 20, total: items.length });
  const citation = HistoricalCitationSchema.parse({
    id: "77777777-7777-4777-8777-777777777777", sourceId: "88888888-8888-4888-8888-888888888888",
    sourceRevisionId: "99999999-9999-4999-8999-999999999999", sourceVersion: 1, currentSourceVersion: 1,
    locator: "Trang 42", excerpt: "Đoạn trích sự kiện cuối", note: "Ghi chú nguồn lịch sử", sortOrder: 0, outdated: false,
    source: { id: "88888888-8888-4888-8888-888888888888", title: "Tư liệu sự kiện cuối", tier: "TIER_1_CHINH_SU",
      author: "Tác giả", publisher: "Nhà xuất bản", publicationYear: 2020, edition: null, isbn: null,
      url: "https://example.com/source", fileAssetId: null, version: 1, verificationStatus: "VERIFIED",
      verifiedVersion: 1, verifiedAt: null, verificationNote: null, createdById: "owner", archivedAt: null },
  });
  let mutationRequested = false;
  let failBranch = false;
  let emptyBranch = false;
  let savedRequest: { path: string; input: Record<string, unknown> } | undefined;
  globalThis.fetch = Object.assign(async (input: URL | RequestInfo, init?: RequestInit) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const path = url.pathname;
    if (init?.method && init.method !== "GET") mutationRequested = true;
    if (init?.method === "PATCH") {
      const body = JSON.parse(String(init.body));
      savedRequest = { path, input: body };
      return Response.json({ ...nextEvent, ...body, version: 2 });
    }
    if (path.endsWith("/historical-summary")) return Response.json({ periods: 1, phases: 1, events: 0, missingSources: 0, readyForPodcast: 0 });
    if (path.endsWith("/historical-periods")) return Response.json(page([period]));
    if (failBranch && path.endsWith("/historical-phases")) return Response.json({ error_code: "LOAD_FAILED", message: "Không tải được nhánh lịch sử" }, { status: 500 });
    if (path.endsWith("/historical-phases")) return Response.json(emptyBranch ? page([]) : { items: url.searchParams.get("page") === "2" ? [secondPhase] : [phase], page: Number(url.searchParams.get("page") ?? 1), limit: 1, total: 2 });
    if (path.endsWith("/historical-entities")) {
      const phaseId = url.searchParams.get("historicalPhaseId");
      if (phaseId === secondPhase.id) return Response.json(page([lastEvent]));
      if (phaseId === phase.id) return Response.json({ items: url.searchParams.get("page") === "2" ? [nextEvent] : [event], page: Number(url.searchParams.get("page") ?? 1), limit: 1, total: 2 });
      return Response.json(page([]));
    }
    if (path.endsWith("/sources")) return Response.json({ items: path.includes(lastEvent.id) ? [citation] : [] });
    if (path.endsWith(`/${period.id}`)) return Response.json(period);
    return Response.json({ error_code: "NOT_FOUND", message: path }, { status: 404 });
  }, { preconnect: originalFetch.preconnect });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(currentUserQueryKey, { id: "owner", role: "moderator" });
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(<QueryClientProvider client={client}><HistoricalLibraryWorkspace /></QueryClientProvider>));
  await settle(() => Boolean(document.querySelector('[aria-label="Xem chi tiết Thời kỳ Nguyễn"]')));
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Thời kỳ: Thời kỳ Nguyễn"]')?.click());
  await settle(() => Boolean(document.querySelector('[aria-label="Giai đoạn: Giai đoạn đầu"]')));
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Giai đoạn: Giai đoạn đầu"]')?.click());
  await settle(() => Boolean(host.textContent?.includes("Sự kiện đầu")));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  const eventName = Array.from(host.querySelectorAll("span")).find((item) => item.textContent === "Sự kiện đầu");
  await act(async () => eventName?.dispatchEvent(new MouseEvent("click", { bubbles: true })));
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(host.querySelectorAll('[aria-label^="Xem chi tiết"]').length).toBe(1);
  await act(async () => button("Xem chi tiết").click());
  await settle(() => Boolean(document.querySelector('[role="dialog"]')?.textContent?.includes("Sự kiện giai đoạn cuối")));
  const dialog = document.querySelector('[role="dialog"]');
  expect(dialog?.textContent).toContain("Thời kỳ Nguyễn");
  expect(dialog?.textContent).toContain("Giai đoạn đầu");
  expect(dialog?.textContent).toContain("Giai đoạn cuối");
  expect(dialog?.textContent).toContain("Sự kiện đầu");
  expect(dialog?.textContent).toContain("Sự kiện trang hai");
  expect(dialog?.textContent).toContain("Mô tả lịch sử");
  expect(dialog?.querySelector('input, textarea, [role="combobox"], [contenteditable="true"]')).toBeNull();
  expect(dialog?.querySelector('[data-slot="accordion"], details')).toBeNull();
  for (const action of ["Xóa", "Khôi phục", "Thêm giai đoạn", "Thêm sự kiện", "Gắn nguồn", "Gửi duyệt"]) {
    expect(Array.from(dialog?.querySelectorAll("button") ?? []).some((item) => item.textContent?.trim() === action)).toBe(false);
  }
  await settle(() => Boolean(dialog?.textContent?.includes("Đoạn trích sự kiện cuối")));
  expect(dialog?.textContent).toContain("Tư liệu sự kiện cuối");
  expect(dialog?.textContent).toContain("Trang 42");
  expect(dialog?.textContent).toContain("Ghi chú nguồn lịch sử");
  expect(dialog?.querySelector('a[href="https://example.com/source"]')).not.toBeNull();
  expect(mutationRequested).toBe(false);
  const editButtons = Array.from(dialog?.querySelectorAll<HTMLButtonElement>("button") ?? []).filter((item) => item.textContent?.trim() === "Chỉnh sửa");
  expect(editButtons).toHaveLength(1);
  expect(dialog?.querySelector('footer [data-slot="dialog-close"]')).toBeNull();
  const edit = editButtons[0];
  expect(edit?.disabled).toBe(false);
  await act(async () => edit?.click());
  expect(dialog?.querySelector('[aria-label="Loại nội dung"]')?.textContent).toContain("Thời kỳ");
  expect(document.querySelector<HTMLInputElement>('[aria-label="Tên nội dung"]')?.value).toBe("Thời kỳ Nguyễn");
  expect(await openSelect("Loại nội dung")).toEqual(["Thời kỳ", "Giai đoạn", "Sự kiện"]);
  await chooseOption("Giai đoạn");
  expect(await openSelect("Nội dung cần chỉnh sửa")).toEqual(["Giai đoạn đầu", "Giai đoạn cuối"]);
  await chooseOption("Giai đoạn cuối");
  expect(document.querySelector<HTMLInputElement>('[aria-label="Tên nội dung"]')?.value).toBe("Giai đoạn cuối");
  expect(button("Lưu thay đổi").disabled).toBe(true);
  await act(async () => dialog?.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(mutationRequested).toBe(false);
  await openSelect("Nội dung cần chỉnh sửa");
  await chooseOption("Giai đoạn đầu");
  expect(document.querySelector<HTMLInputElement>('[aria-label="Tên nội dung"]')?.value).toBe("Giai đoạn đầu");
  expect(button("Lưu thay đổi").disabled).toBe(false);
  await openSelect("Loại nội dung");
  await chooseOption("Sự kiện");
  expect(await openSelect("Nội dung cần chỉnh sửa")).toEqual(["Sự kiện đầu", "Sự kiện trang hai", "Sự kiện giai đoạn cuối"]);
  await chooseOption("Sự kiện trang hai");
  expect(document.querySelector<HTMLInputElement>('[aria-label="Tên nội dung"]')?.value).toBe("Sự kiện trang hai");
  await act(async () => button("Lưu thay đổi").click());
  await settle(() => Boolean(savedRequest) && !dialog?.querySelector('[aria-label="Tên nội dung"]'));
  expect(savedRequest?.path).toBe(`/api/studio/historical-entities/${nextEvent.id}`);
  expect(savedRequest?.input).toMatchObject({ name: "Sự kiện trang hai", baseVersion: 1, historicalPhaseId: phase.id });
  expect(document.querySelector('[role="dialog"]')).toBe(dialog);
  await act(async () => button("Chỉnh sửa").click());
  expect(dialog?.querySelector('[aria-label="Loại nội dung"]')?.textContent).toContain("Thời kỳ");
  await act(async () => button("Hủy").click());
  expect(dialog?.querySelector('[aria-label="Tên nội dung"]')).toBeNull();
  await act(async () => { client.setQueryData(currentUserQueryKey, { id: "other-moderator", role: "moderator" }); });
  await settle(() => button("Chỉnh sửa").disabled);
  failBranch = true;
  await act(async () => { await client.invalidateQueries({ queryKey: ["historical-catalog", "branch"] }); });
  await settle(() => Boolean(dialog?.querySelector('[role="alert"]')));
  expect(dialog?.textContent).toContain("Không tải được nhánh lịch sử");
  failBranch = false;
  await act(async () => button("Thử lại").click());
  await settle(() => Boolean(dialog?.textContent?.includes("Sự kiện giai đoạn cuối")));
  expect(dialog?.querySelector('[role="alert"]')).toBeNull();
  emptyBranch = true;
  await act(async () => {
    client.setQueryData(currentUserQueryKey, { id: "owner", role: "moderator" });
    await client.invalidateQueries({ queryKey: ["historical-catalog", "branch"] });
  });
  await settle(() => Boolean(dialog?.textContent?.includes("Thời kỳ chưa có giai đoạn.")));
  await act(async () => button("Chỉnh sửa").click());
  await openSelect("Loại nội dung");
  await chooseOption("Sự kiện");
  expect(dialog?.textContent).toContain("Chưa có sự kiện để chỉnh sửa.");
  expect(dialog?.querySelector('[aria-label="Tên nội dung"]')).toBeNull();
  await openSelect("Loại nội dung");
  await chooseOption("Thời kỳ");
  expect(document.querySelector<HTMLInputElement>('[aria-label="Tên nội dung"]')?.value).toBe("Thời kỳ Nguyễn");
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Đóng hộp thoại"]')?.click());
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
