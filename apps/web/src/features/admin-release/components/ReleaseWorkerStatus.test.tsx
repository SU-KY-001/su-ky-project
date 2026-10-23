import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { SystemHealthDto } from "@repo/shared";
import { ReleaseWorkerStatus } from "./ReleaseWorkerStatus";

let root: Root | undefined;
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ""; });

const health: SystemHealthDto = { status: "ok", service: "su-ky-api", version: "0.0.1", runtime: "Bun", bunVersion: "1.4.0", database: "connected", queue: "running", releaseWorker: "running", uptimeSeconds: 60, timestamp: new Date().toISOString() };

it("shows actual worker health and never leaves a green running indicator after connection failure", () => {
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  const render = (value: SystemHealthDto, healthError = false, syncError = false) => act(() => root?.render(<ReleaseWorkerStatus health={value} healthError={healthError} syncError={syncError} updatedAt={Date.now()} />));
  render(health);
  expect(host.textContent).toContain("Worker đang hoạt động");
  expect(host.textContent).toContain("Đồng bộ mỗi 2 giây");
  expect(host.querySelector('[data-tone="success"]')).not.toBeNull();
  render({ ...health, releaseWorker: "stale" });
  expect(host.textContent).toContain("Worker mất nhịp");
  expect(host.querySelector('[data-tone="success"]')).toBeNull();
  render(health, true, true);
  expect(host.textContent).toContain("Chưa xác định trạng thái worker");
  expect(host.textContent).toContain("Mất kết nối đồng bộ");
  expect(host.querySelector('[data-tone="success"]')).toBeNull();
});
