import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { openDashboardActions } from "@/test/dashboardActions";
import { DashboardRowActions } from "./DashboardRowActions";

let root: Root | undefined;
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ""; });

it("opens one shared menu by keyboard and runs the chosen action without activating the parent", async () => {
  const view = mock(() => undefined);
  const remove = mock(() => undefined);
  const activateRow = mock(() => undefined);
  const activateKey = mock(() => undefined);
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<div onClick={activateRow} onKeyDown={activateKey}>
    <DashboardRowActions label="Nhiệm vụ 1" actions={[
      { id: "view", label: "Xem chi tiết", onSelect: view },
      { id: "remove", label: "Xóa", onSelect: remove, disabled: true, destructive: true },
    ]} />
  </div>));
  expect(host.querySelectorAll("button")).toHaveLength(1);
  expect(host.querySelector("button")?.textContent?.trim()).toBe("Thao tác");
  expect(host.textContent).not.toContain("Xem chi tiết");
  await openDashboardActions("Nhiệm vụ 1", host);
  const items = [...document.querySelectorAll<HTMLElement>('[role="menuitem"]')];
  expect(items.map((item) => item.textContent)).toEqual(["Xem chi tiết", "Xóa"]);
  expect(items[1]?.getAttribute("aria-disabled")).toBe("true");
  await act(async () => items[1]?.click());
  expect(remove).not.toHaveBeenCalled();
  await act(async () => items[0]?.click());
  expect(view).toHaveBeenCalledTimes(1);
  expect(activateRow).not.toHaveBeenCalled();
  expect(activateKey).not.toHaveBeenCalled();
  expect(document.querySelector('[role="menu"]')).toBeNull();
});

it("disables the trigger while a record is busy", async () => {
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<DashboardRowActions label="Đang xử lý" disabled actions={[{ id: "view", label: "Xem chi tiết", onSelect: () => undefined }]} />));
  expect(host.querySelector("button")?.disabled).toBe(true);
});

it("opens details directly with the existing Moderator text button, without a dropdown", async () => {
  const view = mock(() => undefined);
  const activateRow = mock(() => undefined);
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<div onClick={activateRow}><DashboardRowActions label="Nhiệm vụ 1" actions={[{ id: "detail", label: "Xem chi tiết", onSelect: view }]} /></div>));
  const button = host.querySelector<HTMLButtonElement>('button[aria-label="Xem chi tiết Nhiệm vụ 1"]')!;
  expect(button.textContent?.trim()).toBe("Xem chi tiết");
  expect(button.querySelector("svg")).toBeNull();
  expect(button.hasAttribute("aria-haspopup")).toBe(false);
  await act(async () => button.click());
  expect(view).toHaveBeenCalledTimes(1);
  expect(activateRow).not.toHaveBeenCalled();
  expect(document.querySelector('[role="menu"]')).toBeNull();
});

it("renders the single podcast edit action directly, without a Thao tác menu", async () => {
  const edit = mock(() => undefined);
  const activateRow = mock(() => undefined);
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<div onClick={activateRow}><DashboardRowActions label="Tập podcast 1" actions={[{ id: "edit", label: "Chỉnh sửa", onSelect: edit }]} /></div>));
  const button = host.querySelector<HTMLButtonElement>('button[aria-label="Chỉnh sửa Tập podcast 1"]')!;
  expect(button.textContent?.trim()).toBe("Chỉnh sửa");
  expect(button.hasAttribute("aria-haspopup")).toBe(false);
  expect(host.textContent).not.toContain("Thao tác");
  await act(async () => button.click());
  expect(edit).toHaveBeenCalledTimes(1);
  expect(activateRow).not.toHaveBeenCalled();
});
