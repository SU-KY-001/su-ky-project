import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ChartBar } from "@phosphor-icons/react";
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
});

it("keeps document scrolling locked while the workspace owns the viewport", async () => {
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
