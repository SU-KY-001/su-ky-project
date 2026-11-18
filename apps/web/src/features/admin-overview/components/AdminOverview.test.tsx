import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { AdminListeningReport } from "@repo/shared";
import { ListenerReportView } from "./ListenerReport";
import { listeningPeriod, calendarReportPeriod, monthReportPeriod, ReportPeriodPicker } from "./ReportPeriodPicker";
import { PremiumOverview } from "./PremiumOverview";
import { PremiumWorkspace } from "./PremiumWorkspace";
import type { PremiumSection } from "../types";

let root: Root | undefined;
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ""; });
const empty: AdminListeningReport = {
  from: "2026-11-01", to: "2026-11-02", timezone: "Asia/Ho_Chi_Minh", generatedAt: "2026-11-02T12:00:00Z",
  summary: { uniqueListeners: 0, validListens: 0, listeningMs: 0, completedEpisodes: 0 },
  daily: [{ date: "2026-11-01", uniqueListeners: 0, validListens: 0, listeningMs: 0 }, { date: "2026-11-02", uniqueListeners: 0, validListens: 0, listeningMs: 0 }], topEpisodes: [],
};
async function render(node: React.ReactNode): Promise<HTMLDivElement> {
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => { root?.render(node); });
  return host;
}

it("uses Vietnam calendar dates for report presets across UTC midnight", () => {
  expect(listeningPeriod(7, new Date("2026-11-16T18:00:00Z"))).toEqual({ from: "2026-11-11", to: "2026-11-17" });
});

it("applies a chosen report preset through the shared date picker controls", async () => {
  const change = mock((_period: { from: string; to: string }): void => undefined);
  const host = await render(<ReportPeriodPicker value={listeningPeriod(7)} onChange={change} />);
  await act(async () => host.querySelector<HTMLButtonElement>('button')?.click());
  expect(document.querySelector('input[aria-label="Báo cáo từ ngày - nhập ngày"]')).not.toBeNull();
  expect(document.body.textContent).not.toContain('Tuần này');
  const month = Array.from(document.querySelectorAll('button')).find((button) => button.textContent?.startsWith('Theo tháng'));
  await act(async () => month?.click());
  expect(month?.getAttribute('aria-pressed')).toBe('true');
  expect(change).not.toHaveBeenCalled();
  await act(async () => Array.from(document.querySelectorAll('button')).find((button) => button.textContent === 'Áp dụng bộ lọc')?.click());
  expect(change).toHaveBeenCalledWith(calendarReportPeriod("month"));
});

it("uses whole calendar months, including leap years, and truncates the current month at today", () => {
  const now = new Date("2027-01-03T18:00:00Z");
  expect(calendarReportPeriod("month", now)).toEqual({ from: "2027-01-01", to: "2027-01-04" });
  expect(calendarReportPeriod("previous-month", now)).toEqual({ from: "2026-12-01", to: "2026-12-31" });
  expect(monthReportPeriod("2024-02", now)).toEqual({ from: "2024-02-01", to: "2024-02-29" });
});

it("renders an honest zero state and a finite zero chart without invented top episodes", async () => {
  const host = await render(<ListenerReportView report={empty} />);
  expect(host.textContent).toContain("Chưa có lượt nghe được tính");
  expect(host.textContent).toContain("Chưa có tập được tính lượt nghe");
  expect(host.querySelector('[data-slot="chart"]')).not.toBeNull();
  expect(host.querySelector('input[type="range"]')).toBeNull();
  expect(host.querySelectorAll("dl dt")).toHaveLength(4);
});

it("renders API totals and the top episode, with accepted listening time converted to hours", async () => {
  const report: AdminListeningReport = { ...empty, summary: { uniqueListeners: 1234, validListens: 2500, listeningMs: 7_200_000, completedEpisodes: 12 }, topEpisodes: [{ episodeId: "00000000-0000-4000-8000-000000000001", title: "Câu chuyện từ API", seriesTitle: "Dòng lịch sử", uniqueListeners: 20, validListens: 40, listeningMs: 3_600_000 }] };
  const host = await render(<ListenerReportView report={report} />);
  expect(host.textContent).toContain("1.234");
  expect(host.textContent).toContain("2.500");
  expect(host.textContent).toContain("2,0");
  expect(host.querySelector("tbody")?.textContent).toContain("Câu chuyện từ API");
  expect(host.querySelector("tbody")?.textContent).toContain("1,0 giờ");
});

it("shows the report empty state and routes every Premium shortcut", async () => {
  const navigate = mock((_section: PremiumSection): void => undefined);
  const host = await render(<PremiumOverview onNavigate={navigate} />);
  expect(host.textContent).toContain("Chưa có dữ liệu báo cáo");
  expect(Array.from(host.querySelectorAll("dl dd")).map((node) => node.textContent)).toEqual(["—", "—", "—", "—"]);
  const buttons = host.querySelectorAll<HTMLButtonElement>(".admin-premium-link");
  expect(buttons).toHaveLength(6);
  for (const button of buttons) await act(async () => button.click());
  expect(navigate.mock.calls).toEqual([["premium-plans"], ["premium-orders"], ["premium-transactions"], ["premium-members"], ["premium-policies"], ["premium-audit"]]);
});

it("renders the active Premium section and its content", async () => {
  const host = await render(<PremiumWorkspace section="premium-transactions"><p>Danh sách giao dịch</p></PremiumWorkspace>);
  expect(host.querySelector("h1")?.textContent).toBe("Sổ giao dịch");
  expect(host.textContent).toContain("Danh sách giao dịch");
});
