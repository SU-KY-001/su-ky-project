import { afterEach, beforeEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ListeningChart, listeningChartAxis } from "./ListeningChart";
import { RevenueByPlanChart } from "./RevenueByPlanChart";
import { readFileSync } from "node:fs";

let root: Root | undefined;
const bounds = HTMLElement.prototype.getBoundingClientRect;
const offsetWidth = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetWidth");
const offsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, "offsetHeight");
const originalMatchMedia = window.matchMedia;

it("does not constrain the chart against Recharts' zero-width measurement parent", () => {
  // ResponsiveContainer intentionally places the measured chart inside a width:0 overflow-visible div.
  // max-width:100% on .recharts-wrapper therefore resolves to zero in an actual browser.
  const css = readFileSync(new URL("../adminOverview.css", import.meta.url), "utf8");
  expect(css).not.toMatch(/\.recharts-wrapper\s*\{[^}]*max-width\s*:\s*100%/);
});
beforeEach(() => {
  // happy-dom has no layout engine; give the real Recharts components a measurable canvas.
  HTMLElement.prototype.getBoundingClientRect = function (): DOMRect {
    return this.classList.contains("recharts-responsive-container") || this.classList.contains("recharts-wrapper") ? new DOMRect(0, 0, 680, 260) : bounds.call(this);
  };
  Object.defineProperty(HTMLElement.prototype, "offsetWidth", { configurable: true, get(this: HTMLElement): number { return this.classList.contains("recharts-wrapper") ? 680 : offsetWidth?.get?.call(this) ?? 0; } });
  Object.defineProperty(HTMLElement.prototype, "offsetHeight", { configurable: true, get(this: HTMLElement): number { return this.classList.contains("recharts-wrapper") ? 260 : offsetHeight?.get?.call(this) ?? 0; } });
});
afterEach(() => {
  act(() => root?.unmount()); document.body.innerHTML = "";
  HTMLElement.prototype.getBoundingClientRect = bounds;
  window.matchMedia = originalMatchMedia;
  if (offsetWidth) Object.defineProperty(HTMLElement.prototype, "offsetWidth", offsetWidth);
  if (offsetHeight) Object.defineProperty(HTMLElement.prototype, "offsetHeight", offsetHeight);
});
const daily = [
  { date: "2026-11-16", validListens: 480, uniqueListeners: 240, listeningMs: 3_600_000 },
  { date: "2026-11-17", validListens: 882, uniqueListeners: 441, listeningMs: 7_200_000 },
];

it("keeps the axis proportional to small counts and avoids fractional listen counts", () => {
  expect(listeningChartAxis([0, 1])).toEqual({ maximum: 4, ticks: [0, 1, 2, 3, 4] });
  expect(listeningChartAxis([1, 5])).toEqual({ maximum: 6, ticks: [0, 2, 4, 6] });
});
async function render(data = daily): Promise<HTMLDivElement> {
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<ListeningChart daily={data} />));
  return host;
}
async function settle(): Promise<void> { await act(async () => { await new Promise((resolve) => setTimeout(resolve, 50)); }); }

it("shows the date and all three metrics on hover without a slider", async () => {
  const host = await render();
  await settle();
  expect(host.querySelector('input[type="range"]')).toBeNull();
  expect(host.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(2);
  const dates = Array.from(host.querySelectorAll(".recharts-cartesian-axis-tick-value")).map((node) => node.textContent).join(" ");
  expect(dates).toContain("16/11");
  expect(dates).toContain("17/11");
  expect(host.textContent).toContain("16/11/2026 – 17/11/2026");
  const canvas = host.querySelector(".recharts-wrapper");
  expect(canvas).not.toBeNull();
  await act(async () => canvas?.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 620, clientY: 120 })));
  await settle();
  const tooltip = host.querySelector(".admin-listening-tooltip");
  expect(tooltip?.textContent).toContain("17/11/2026");
  expect(tooltip?.textContent).toContain("882");
  expect(tooltip?.textContent).toContain("441");
  expect(tooltip?.textContent).toContain("Số người nghe");
  expect(tooltip?.textContent).toContain("Lượt nghe được tính");
  expect(tooltip?.textContent).not.toContain("Người nghe duy nhất");
  expect(tooltip?.textContent).toContain("2");
});

it("opens the tooltip on the first tap and moves it with touch dragging", async () => {
  const host = await render();
  const canvas = host.querySelector(".recharts-wrapper");
  const touch = (type: string, clientX: number): Event => {
    const event = new Event(type, { bubbles: true });
    Object.defineProperty(event, "touches", { value: [{ clientX, clientY: 120 }] });
    return event;
  };
  await act(async () => canvas?.dispatchEvent(touch("touchstart", 100)));
  await settle();
  expect(host.querySelector(".admin-listening-tooltip")?.textContent).toContain("480");
  await act(async () => canvas?.dispatchEvent(touch("touchmove", 620)));
  await settle();
  expect(host.querySelector(".admin-listening-tooltip")?.textContent).toContain("882");
});

it("supports keyboard selection and a finite single-day zero chart", async () => {
  const host = await render([ { date: "2026-11-17", validListens: 0, uniqueListeners: 0, listeningMs: 0 } ]);
  const surface = host.querySelector('svg[role="application"]');
  expect(surface).not.toBeNull();
  await act(async () => surface?.dispatchEvent(new FocusEvent("focusin", { bubbles: true })));
  await act(async () => surface?.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true })));
  await settle();
  expect(host.querySelector(".admin-listening-tooltip")?.textContent).toContain("0");
  expect(host.innerHTML).not.toContain("NaN");
});

it("compares plan revenue using columns and shows exact currency and share on hover", async () => {
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<RevenueByPlanChart plans={[{ label: "Gói năm", value: 17_820_000 }, { label: "Gói tháng", value: 580_000 }]} />));
  expect(host.querySelectorAll(".recharts-bar-rectangle")).toHaveLength(2);
  const canvas = host.querySelector(".recharts-wrapper");
  await act(async () => canvas?.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 150, clientY: 100 })));
  await settle();
  const tooltip = host.querySelector(".admin-listening-tooltip");
  expect(tooltip?.textContent).toContain("Gói năm");
  expect(tooltip?.textContent).toContain("17.820.000");
  expect(tooltip?.textContent).toContain("96,8%");
});

it("switches metric and grouping without adding horizontal minimum width or column labels", async () => {
  const host = await render();
  const buttons = Array.from(host.querySelectorAll("button"));
  await act(async () => buttons.find((button) => button.textContent === "Thời lượng nghe")?.click());
  expect(host.textContent).toContain("Đơn vị: giờ");
  expect(host.querySelector(".recharts-label-list")).toBeNull();
  expect(host.querySelector<HTMLElement>('[data-slot="chart"]')?.style.minWidth).toBe("");
  await act(async () => buttons.find((button) => button.textContent === "Tuần")?.click());
  expect(host.textContent).toContain("Mỗi cột là một tuần");
  expect(host.textContent).toContain("16/11: —");
});

it("mobile defaults to weekly distinct counts and displays tapped details below the chart", async () => {
  window.matchMedia = (query: string): MediaQueryList => ({ matches: true, media: query, onchange: null, addEventListener: () => {}, removeEventListener: () => {}, addListener: () => {}, removeListener: () => {}, dispatchEvent: () => true });
  const data = Array.from({ length: 10 }, (_, index) => ({ date: `2026-11-${String(index + 1).padStart(2, "0")}`, validListens: 1, uniqueListeners: 1, listeningMs: 3600000 }));
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<ListeningChart daily={data} weekly={[
    { date: "2026-10-26", validListens: 1, uniqueListeners: 1, listeningMs: 3600000 },
    { date: "2026-11-02", validListens: 7, uniqueListeners: 2, listeningMs: 25200000 },
    { date: "2026-11-09", validListens: 2, uniqueListeners: 1, listeningMs: 7200000 },
  ]} />));
  expect(host.textContent).toContain("Mỗi cột là một tuần");
  const canvas = host.querySelector(".recharts-wrapper");
  await act(async () => canvas?.dispatchEvent(new MouseEvent("mousemove", { bubbles: true, clientX: 340, clientY: 100 })));
  await settle();
  expect(host.querySelector('.admin-listening-tooltip')).toBeNull();
  expect(host.querySelector('[aria-live="polite"]')?.textContent).toContain("02/11/2026 – 08/11/2026");
  expect(host.querySelector('[aria-live="polite"]')?.textContent).toContain("2người");
  await act(async () => Array.from(host.querySelectorAll("button")).find((button) => button.textContent === "Ngày")?.click());
  expect(host.textContent).toContain("Mỗi cột là một ngày");
});
