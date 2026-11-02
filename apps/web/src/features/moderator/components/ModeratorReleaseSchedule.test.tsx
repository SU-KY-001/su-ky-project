import { afterEach, expect, it, mock } from "bun:test";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReleaseScheduleRecord } from "@repo/shared";
import { ModeratorReleaseScheduleView } from "./ModeratorReleaseSchedule";

let root: Root | undefined;
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ""; });

function schedule(id: string, status: ReleaseScheduleRecord["status"], linked = true): ReleaseScheduleRecord {
  return {
    id, title: `Lịch ${id}`, status,
    productionDeadline: new Date("2026-10-19T13:00:00Z"),
    scheduledAt: new Date("2026-10-20T13:00:00Z"), createdAt: new Date("2026-10-15T08:00:00Z"), updatedAt: new Date("2026-10-15T08:00:00Z"),
    episodeId: linked ? "episode-1" : null,
    episode: linked ? { id: "episode-1", title: `Podcast ${id}`, contentRevision: 4 } : null,
    assignments: [{ moderatorId: "mod-1", moderator: { id: "mod-1", name: "Nguyễn An", email: "an@example.org" } }],
    reviews: [],
  } as unknown as ReleaseScheduleRecord;
}

it("shows four schedule statuses, assigned podcast details and a read-only dialog", async () => {
  const schedules = [schedule("1", "SCHEDULED"), schedule("2", "READY_TO_PUBLISH"), schedule("3", "RELEASED", false), schedule("4", "CANCELLED"), schedule("5", "FAILED")];
  function Probe() {
    const [selectedId, setSelectedId] = useState<string | null>(null);
    return <ModeratorReleaseScheduleView schedules={schedules} selectedId={selectedId} onSelect={setSelectedId} onClose={() => setSelectedId(null)} />;
  }
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<Probe />));
  expect(host.querySelectorAll("tbody tr")).toHaveLength(4);
  expect(host.textContent).toContain("Podcast 1");
  expect(host.textContent).toContain("Chưa gắn podcast");
  expect(host.textContent).toContain("Đủ điều kiện");
  expect(host.textContent).not.toContain("Lịch 5");
  expect(host.textContent).not.toContain("Thời khóa biểu");
  const trigger = host.querySelector<HTMLButtonElement>('[aria-label="Lọc trạng thái lịch phát hành"]')!;
  await act(async () => { trigger.focus(); trigger.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" })); await new Promise(resolve => setTimeout(resolve, 0)); });
  const option = document.body.querySelector<HTMLElement>('[data-slot="select-item"][data-value="CANCELLED"]')!;
  await act(async () => { option.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0 })); option.click(); });
  expect(host.querySelectorAll("tbody tr")).toHaveLength(1);
  expect(host.textContent).toContain("Lịch 4");
  const detail = host.querySelector<HTMLButtonElement>('[aria-label="Xem chi tiết Lịch 4"]')!;
  await act(async () => detail.click());
  const dialog = document.body.querySelector('[role="dialog"]')!;
  expect(dialog.textContent).toContain("Chi tiết lịch phát hành");
  expect(dialog.textContent).toContain("Podcast 4");
  expect(dialog.querySelector<HTMLInputElement>("#release-title")?.disabled).toBe(true);
  expect(dialog.querySelector<HTMLButtonElement>('[aria-label="Moderator phụ trách"]')?.disabled).toBe(true);
  expect(dialog.textContent).not.toContain("Lưu thay đổi");
  expect(dialog.textContent).not.toContain("Hủy lịch");
});

it("paginates assigned schedules", async () => {
  const schedules = Array.from({ length: 11 }, (_, i) => schedule(String(i + 1), "SCHEDULED"));
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<ModeratorReleaseScheduleView schedules={schedules} selectedId={null} onSelect={mock(() => undefined)} onClose={mock(() => undefined)} />));
  expect(host.querySelectorAll("tbody tr")).toHaveLength(10);
  expect(host.textContent).toContain("11 lịch");
});

it("sorts schedules by creation date and combines search with release date filters", async () => {
  const older = { ...schedule("cũ", "SCHEDULED"), createdAt: new Date("2026-10-01T00:00:00Z"), scheduledAt: new Date("2026-11-02T16:59:00Z") };
  const newer = { ...schedule("mới", "SCHEDULED"), createdAt: new Date("2026-10-03T00:00:00Z"), scheduledAt: new Date("2026-11-02T17:00:00Z") };
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<ModeratorReleaseScheduleView schedules={[older, newer]} selectedId={null} onSelect={mock(() => undefined)} onClose={mock(() => undefined)} />));
  const rowNames = () => [...host.querySelectorAll<HTMLTableRowElement>("tbody tr")].map((row) => row.cells[0]?.textContent);
  expect(rowNames()).toEqual(["Lịch mới", "Lịch cũ"]);
  const input = host.querySelector<HTMLInputElement>('input[aria-label="Ngày phát hành - nhập ngày"]')!;
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  await act(async () => { setter?.call(input, "03/11/2026"); input.dispatchEvent(new Event("input", { bubbles: true })); });
  await act(async () => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  expect(rowNames()).toEqual(["Lịch mới"]);
  const search = host.querySelector<HTMLInputElement>('input[placeholder="Tìm lịch phát hành"]')!;
  await act(async () => { setter?.call(search, "không có"); search.dispatchEvent(new Event("input", { bubbles: true })); });
  expect(host.textContent).toContain("Không có lịch phù hợp");
});

it("filters the release date independently from the production deadline", async () => {
  const early = { ...schedule("sớm", "SCHEDULED"), scheduledAt: new Date("2026-11-02T16:59:00Z") };
  const late = { ...schedule("muộn", "SCHEDULED"), scheduledAt: new Date("2026-11-02T17:00:00Z") };
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<ModeratorReleaseScheduleView schedules={[early, late]} selectedId={null} onSelect={mock(() => undefined)} onClose={mock(() => undefined)} />));
  const input = host.querySelector<HTMLInputElement>('input[aria-label="Ngày phát hành - nhập ngày"]');
  expect(input).not.toBeNull();
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  await act(async () => { setter?.call(input, "03/11/2026"); input?.dispatchEvent(new Event("input", { bubbles: true })); });
  await act(async () => input?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  expect([...host.querySelectorAll<HTMLTableRowElement>("tbody tr")].map((row) => row.cells[0]?.textContent)).toEqual(["Lịch muộn"]);
  const deadline = host.querySelector<HTMLInputElement>('input[aria-label="Hạn sản xuất - nhập ngày"]')!;
  await act(async () => { setter?.call(deadline, "03/11/2026"); deadline.dispatchEvent(new Event("input", { bubbles: true })); });
  await act(async () => deadline.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
  expect(host.textContent).toContain("Không có lịch phù hợp");
  expect(input?.value).toBe("03/11/2026");
});
