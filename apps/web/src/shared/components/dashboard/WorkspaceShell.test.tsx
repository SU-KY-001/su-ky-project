import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ChartBar } from "@phosphor-icons/react/dist/icons/ChartBar";
import { WorkspaceShell } from "./WorkspaceShell";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
  document.documentElement.classList.remove("workspace-scroll-lock");
  document.body.classList.remove("workspace-scroll-lock");
});

it("renders a role-neutral workspace with supplied navigation and profile", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(
      <WorkspaceShell
        navigationLabel="Điều hướng admin"
        mobileNavigationTitle="Menu admin"
        brandCaption="KHÔNG GIAN QUẢN TRỊ"
        nav={[{ id: "overview", label: "Tổng quan", icon: ChartBar, active: true }]}
        profile={<button type="button">Đăng xuất</button>}
      >
        <p>Theo dõi phát hành</p>
      </WorkspaceShell>,
    );
  });
  expect(host.querySelector('aside[aria-label="Điều hướng admin"]')).not.toBeNull();
  expect(host.textContent).toContain("Tổng quan");
  expect(host.textContent).toContain("Theo dõi phát hành");
  expect(host.textContent).toContain("Đăng xuất");
  expect(host.querySelector('[data-dashboard-background="light-rays"]') === null).toBe(true);
});

it("locks the document so only the dashboard content can scroll", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  await act(async () => {
    root?.render(
      <WorkspaceShell
        navigationLabel="Điều hướng moderator"
        mobileNavigationTitle="Menu moderator"
        brandCaption="KHÔNG GIAN BIÊN TẬP"
        nav={[]}
        profile={<span>Moderator</span>}
      >
        <p>Nội dung dashboard</p>
      </WorkspaceShell>,
    );
  });

  expect(document.documentElement.classList.contains("workspace-scroll-lock")).toBe(true);
  expect(document.body.classList.contains("workspace-scroll-lock")).toBe(true);

  await act(async () => root?.unmount());
  root = undefined;

  expect(document.documentElement.classList.contains("workspace-scroll-lock")).toBe(false);
  expect(document.body.classList.contains("workspace-scroll-lock")).toBe(false);
});

it("collapses to an icon rail with the toggle inside the sidebar and preserves content", async () => {
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<WorkspaceShell navigationLabel="Điều hướng moderator" mobileNavigationTitle="Menu moderator" brandCaption="BIÊN TẬP" nav={[{ id: "overview", label: "Tổng quan", icon: ChartBar, active: true }]} profile={<span>Moderator</span>}><input aria-label="Nội dung đang soạn" defaultValue="Bản nháp" /></WorkspaceShell>));
  const input = host.querySelector('input');
  const toggle = host.querySelector<HTMLButtonElement>('button[aria-label="Thu gọn sidebar"]');
  expect(toggle !== null).toBe(true);
  expect(toggle?.closest('aside') !== null).toBe(true);
  expect(toggle?.getAttribute('aria-expanded')).toBe('true');
  await act(async () => toggle!.click());
  expect(host.querySelector('.mod-layout-shell')?.getAttribute('data-sidebar-collapsed')).toBe('true');
  expect(host.querySelector<HTMLButtonElement>('button[aria-label="Mở rộng sidebar"]')?.getAttribute('aria-expanded')).toBe('false');
  expect(host.querySelector('input') === input).toBe(true);
  expect(host.querySelector('.mod-sidebar nav a svg') !== null).toBe(true);
  expect(host.querySelector('.mod-sidebar nav a')?.getAttribute('aria-label')).toBe('Tổng quan');
  await act(async () => host.querySelector<HTMLButtonElement>('button[aria-label="Mở rộng sidebar"]')!.click());
  expect(host.querySelector('.mod-layout-shell')?.getAttribute('data-sidebar-collapsed')).toBe('false');
  expect(host.querySelector('input')?.value).toBe('Bản nháp');
});
