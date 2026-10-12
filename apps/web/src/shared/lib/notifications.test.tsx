import { afterEach, describe, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AppToaster } from "../components/common/AppToaster";
import { notify, useNotificationStore } from "./notifications";

let root: Root | undefined;
afterEach(async () => {
  await act(async () => { notify.dismiss(); root?.unmount(); });
  root = undefined;
  useNotificationStore.setState({ notifications: [] });
  document.body.innerHTML = "";
});

async function mount(): Promise<void> {
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => { root?.render(<AppToaster />); });
}

describe("shared notifications", () => {
  it("pauses both timeout and its indicator while the notification is hovered", async () => {
    await mount();
    await act(async () => {
      notify.success({ title: "Đã lưu." });
      useNotificationStore.setState((state) => ({ notifications: state.notifications.map((item) => ({ ...item, duration: 150 })) }));
    });
    const viewport = document.querySelector("ol");
    await act(async () => { viewport?.dispatchEvent(new PointerEvent("pointermove", { bubbles: true })); });
    expect(document.querySelector<HTMLElement>(".toast-timeout")?.style.animationPlayState).toBe("paused");
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 180)); });
    expect(useNotificationStore.getState().notifications[0]?.open).toBe(true);
    await act(async () => { viewport?.parentElement?.dispatchEvent(new PointerEvent("pointerleave")); });
    expect(document.querySelector<HTMLElement>(".toast-timeout")?.style.animationPlayState).toBe("running");
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 170)); });
    expect(useNotificationStore.getState().notifications[0]?.open).toBe(false);
  });

  it("retains dismissed notices for exit and ignores a stale exit after republishing", () => {
    const id = notify.loading({ title: "Đang lưu…" });
    const revision = useNotificationStore.getState().notifications[0]!.revision;
    notify.dismiss(id);
    expect(useNotificationStore.getState().notifications[0]?.open).toBe(false);
    notify.success({ title: "Đã lưu." }, id);
    useNotificationStore.getState().remove(id, revision);
    expect(useNotificationStore.getState().notifications[0]?.open).toBe(true);
  });
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
    const pendingToast = document.querySelector('[data-slot="toast"]');
    await act(async () => { notify.error({ title: "Không thể lưu sự kiện.", description: "Bản nháp chưa được lưu. Vui lòng thử lại." }, id); });
    expect(document.querySelectorAll('[data-slot="toast"]').length).toBe(1);
    expect(document.querySelector('[data-slot="toast"]') === pendingToast).toBe(true);
    expect(Boolean(document.querySelector('[data-toast-status="loading"]'))).toBe(false);
    expect(document.querySelector('[data-toast-status="error"]')?.textContent).toContain("Bản nháp chưa được lưu");
    await act(async () => { document.querySelector<HTMLButtonElement>('button[aria-label="Đóng thông báo"]')?.click(); });
    expect(document.querySelector('[data-slot="toast"]')?.getAttribute("data-state")).toBe("closed");
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 220)); });
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
