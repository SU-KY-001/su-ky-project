import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ChartBar } from "@phosphor-icons/react";
import { WorkspaceShell } from "./WorkspaceShell";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
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
