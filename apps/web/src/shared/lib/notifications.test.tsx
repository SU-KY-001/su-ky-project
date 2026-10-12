import { afterEach, describe, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AppToaster } from "../components/common/AppToaster";
import { notify, useNotificationStore } from "./notifications";

let root: Root | undefined;
afterEach(async () => {
  await act(async () => { notify.dismiss(); root?.unmount(); });
  root = undefined;
  document.body.innerHTML = "";
});

async function mount(): Promise<void> {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => { root?.render(<AppToaster />); });
}

describe("shared notifications", () => {
  it("automatically dismisses a completed notice", async () => {
    await mount();
    await act(async () => { notify.success({ title: "Đã lưu sự kiện." }); });
    expect(Boolean(document.querySelector('[data-toast-status="success"]'))).toBe(true);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 4700)); });
    expect(Boolean(document.querySelector('[data-slot="toast"]'))).toBe(false);
  }, 6000);

  it("replaces one pending notice with the actual result and allows dismissal", async () => {
    await mount();
    let id = "";
    await act(async () => { id = notify.loading({ title: "Đang lưu sự kiện…" }); });
    expect(document.querySelector('[data-toast-status="loading"]')?.textContent).toContain("Đang lưu sự kiện");
    await act(async () => { notify.error({ title: "Không thể lưu sự kiện.", description: "Bản nháp chưa được lưu. Vui lòng thử lại." }, id); });
    expect(document.querySelectorAll('[data-slot="toast"]').length).toBe(1);
    expect(Boolean(document.querySelector('[data-toast-status="loading"]'))).toBe(false);
    expect(document.querySelector('[data-toast-status="error"]')?.textContent).toContain("Bản nháp chưa được lưu");
    await act(async () => { document.querySelector<HTMLButtonElement>('button[aria-label="Đóng thông báo"]')?.click(); });
    expect(useNotificationStore.getState().notifications.length).toBe(0);
  });

  it("renders success, information and warnings separately and limits visible notices", async () => {
    await mount();
    await act(async () => {
      notify.success({ title: "Đã lưu sự kiện." });
      notify.info({ title: "Yêu cầu đặt lại mật khẩu đã được tiếp nhận." });
      notify.warning({ title: "Sự kiện chưa có nguồn tư liệu." });
    });
    for (const status of ["success", "info", "warning"]) expect(Boolean(document.querySelector(`[data-toast-status="${status}"]`))).toBe(true);
    await act(async () => { notify.error({ title: "Không thể cập nhật sự kiện." }); });
    expect(document.querySelectorAll('[data-slot="toast"]').length).toBe(3);
    expect(Boolean(document.querySelector('[data-toast-status="success"]'))).toBe(false);
  });
});
