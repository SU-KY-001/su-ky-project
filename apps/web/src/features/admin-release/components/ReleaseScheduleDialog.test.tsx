import { afterEach, expect, it, mock, setSystemTime } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReleaseScheduleRecord } from "@repo/shared";
import { ApiError } from "@/lib/apiError";
import { ReleaseScheduleDialog } from "./ReleaseScheduleDialog";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
  setSystemTime();
});

const moderators = [
  { id: "mod-1", name: "Nguyễn Minh Anh", email: "a@example.org" },
  { id: "mod-2", name: "Trần Hoàng Nam", email: "b@example.org" },
];

function schedule(status: ReleaseScheduleRecord["status"] = "SCHEDULED") {
  return {
    id: "schedule-1",
    title: "Dấu chân Trường Sơn",
    status,
    episodeId: "00000000-0000-4000-8000-000000000002",
    productionDeadline: new Date("2026-10-19T13:00:00.000Z"),
    scheduledAt: new Date("2026-10-20T13:00:00.000Z"),
    updatedAt: new Date("2026-10-15T08:00:00.000Z"),
    assignments: [{ moderatorId: "mod-1", moderator: moderators[0] }],
    episode: { title: "Podcast Trường Sơn", contentRevision: 3 },
  } as unknown as ReleaseScheduleRecord;
}

function renderDialog(props: Partial<React.ComponentProps<typeof ReleaseScheduleDialog>> = {}) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  const defaults: React.ComponentProps<typeof ReleaseScheduleDialog> = {
    mode: "create",
    schedule: null,
    moderators,
    progress: [],
    open: true,
    busy: false,
    error: null,
    onOpenChange: mock(() => undefined),
    onCreate: mock(() => Promise.resolve()),
    onUpdate: mock(() => Promise.resolve()),
    onRetry: mock(() => undefined),
    onPublishNow: mock(() => undefined),
    onCancel: mock(() => undefined),
    ...props,
  };
  act(() => root?.render(<ReleaseScheduleDialog {...defaults} />));
  return { host, props: defaults };
}

async function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  await act(async () => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

async function submit(form: HTMLFormElement) {
  await act(async () => {
    form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await Promise.resolve();
  });
}

async function chooseDate(ariaLabel: string, day: string) {
  // Picker dropdown interactions are covered by date-picker.test.tsx. Use its
  // typed-input path here so form validation does not depend on exit animations.
  const input = document.body.querySelector<HTMLInputElement>(`input[aria-label="${ariaLabel} - nhập ngày"]`)!;
  await setInput(input, day.split("-").reverse().join("/"));
  await act(async () => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
}

async function chooseTime(ariaLabel: string, hour: string, minute: string) {
  const input = document.body.querySelector<HTMLInputElement>(`input[aria-label="${ariaLabel} - giờ"]`)!;
  await setInput(input, `${hour}:${minute}`);
  await act(async () => input.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));
}

it("validates create values and closes only after a successful create", async () => {
  setSystemTime(new Date(2026, 9, 1, 10, 0));
  const onCreate = mock(() => Promise.resolve());
  const onOpenChange = mock(() => undefined);
  renderDialog({ onCreate, onOpenChange });
  expect(document.body.textContent).toContain("Tạo lịch phát hành");
  const form = document.body.querySelector("form")!;

  await submit(form);
  expect(document.body.textContent).toContain("một Moderator phụ trách");
  expect(onOpenChange).not.toHaveBeenCalled();

  await setInput(document.body.querySelector<HTMLInputElement>("#release-title")!, "Lịch tháng 10");
  await chooseDate("Chọn hạn hoàn thành sản xuất", "2026-10-20");
  await chooseDate("Chọn ngày phát hành", "2026-10-20");
  await chooseTime("Chọn hạn hoàn thành sản xuất", "20", "00");
  await chooseTime("Chọn ngày phát hành", "19", "00");
  expect(document.querySelector<HTMLInputElement>('[aria-label="Chọn hạn hoàn thành sản xuất - giờ"]')?.value).toBe("20:00");
  expect(document.querySelector<HTMLInputElement>('[aria-label="Chọn ngày phát hành - giờ"]')?.value).toBe("19:00");
  const moderatorTrigger = document.body.querySelector<HTMLButtonElement>('[data-slot="select-trigger"][aria-label="Moderator phụ trách"]')!;
  await act(async () => {
    moderatorTrigger.focus();
    moderatorTrigger.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  const moderatorOption = document.body.querySelector<HTMLElement>('[data-slot="select-item"][data-value="mod-1"]')!;
  await act(async () => {
    moderatorOption.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0 }));
    moderatorOption.click();
  });
  await submit(form);
  expect(document.body.textContent).toContain("phải trước thời gian phát hành");
  expect(onCreate).not.toHaveBeenCalled();

  await chooseTime("Chọn ngày phát hành", "21", "00");
  await submit(form);
  expect(onCreate).toHaveBeenCalledTimes(1);
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

it("opens edit mode directly with editable values and no view-only step", () => {
  renderDialog({ mode: "edit", schedule: schedule() });
  expect(document.body.textContent).toContain("Cập nhật lịch phát hành");
  expect(document.body.querySelector<HTMLInputElement>("#release-title")?.value).toBe("Dấu chân Trường Sơn");
  expect(document.body.querySelector<HTMLButtonElement>('[data-slot="select-trigger"][aria-label="Moderator phụ trách"]')?.textContent).toContain("Nguyễn Minh Anh");
  expect(document.body.querySelector<HTMLInputElement>("#production-deadline")?.value).toBe("19/10/2026");
  expect(document.body.textContent).not.toContain("Xem chi tiết");
  expect([...document.body.querySelectorAll("button")].some((button) => button.textContent?.trim() === "Chỉnh sửa")).toBe(false);
  expect(document.body.textContent).toContain("Lưu thay đổi");
  const footer = document.body.querySelector('[data-slot="dialog-footer"]');
  expect(footer).not.toBeNull();
  const save = [...document.body.querySelectorAll<HTMLButtonElement>("button")]
    .find((button) => button.textContent?.trim() === "Lưu thay đổi")!;
  expect(save.closest('[data-slot="dialog-footer"]')).toBe(footer);
  const scrollArea = document.body.querySelector('[data-dialog-scroll-area="true"]');
  expect(scrollArea).not.toBeNull();
  expect(scrollArea!.classList.contains("mod-dialog-scroll-area")).toBe(true);
  expect(scrollArea!.contains(footer)).toBe(false);
});

it("updates the live status without erasing typed input and blocks edits while publishing", async () => {
  const { props } = renderDialog({ mode: "edit", schedule: schedule() });
  const title = document.body.querySelector<HTMLInputElement>("#release-title")!;
  await setInput(title, "Nội dung chưa lưu");
  act(() => root?.render(<ReleaseScheduleDialog {...props} currentStatus="PUBLISHING" />));
  expect(title.value).toBe("Nội dung chưa lưu");
  expect(document.body.querySelector('[data-slot="card-badge"]')?.textContent).toBe("Đang phát hành");
  expect(document.body.textContent).not.toContain("Hủy lịch");
  const save = document.body.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  expect(save.disabled).toBe(true);
  await submit(document.body.querySelector("form")!);
  expect(props.onUpdate).not.toHaveBeenCalled();
});

it("keeps edit values on stale writes and separates exception actions", async () => {
  const failed = schedule("FAILED");
  const onRetry = mock(() => undefined);
  const onPublishNow = mock(() => undefined);
  const onCancel = mock(() => undefined);
  renderDialog({
    mode: "edit",
    schedule: failed,
    error: new ApiError(409, "STALE_WRITE", "stale", null, null),
    onRetry,
    onPublishNow,
    onCancel,
    progress: [{
      id: "progress-1",
      action: "release.failed",
      actorType: "SYSTEM",
      actorId: null,
      fromStatus: "PUBLISHING",
      toStatus: "FAILED",
      createdAt: new Date("2026-10-20T13:00:00.000Z"),
    }],
  });
  const title = document.body.querySelector<HTMLInputElement>("#release-title")!;
  await setInput(title, "Tên đang chỉnh chưa lưu");

  expect(title.value).toBe("Tên đang chỉnh chưa lưu");
  expect(document.body.textContent).toContain("Lịch đã thay đổi trên hệ thống");
  expect(document.body.textContent).toContain("Podcast Trường Sơn");
  expect(document.body.textContent).toContain("Tiến độ phát hành");
  const footer = document.body.querySelector('[data-slot="dialog-footer"]');
  expect(footer).not.toBeNull();
  for (const label of ["Chuẩn bị thử lại", "Phát hành ngay", "Hủy lịch", "Lưu thay đổi"]) {
    expect(document.body.textContent).toContain(label);
    const action = [...document.body.querySelectorAll<HTMLButtonElement>("button")]
      .find((button) => button.textContent?.trim() === label)!;
    expect(action.closest('[data-slot="dialog-footer"]')).toBe(footer);
  }
});

it("shows the admin schedule details read-only to moderators", async () => {
  const { props } = renderDialog({ mode: "view", schedule: schedule(), open: true });
  const dialog = document.body.querySelector('[role="dialog"]')!;
  expect(dialog.textContent).toContain("Chi tiết lịch phát hành");
  expect(dialog.textContent).toContain("Podcast Trường Sơn");
  const title = dialog.querySelector<HTMLInputElement>("#release-title")!;
  expect(title.matches(":disabled")).toBe(true);
  expect(dialog.querySelector<HTMLButtonElement>('[aria-label="Chọn ngày phát hành"]')?.matches(":disabled")).toBe(true);
  expect(dialog.querySelector<HTMLButtonElement>('[aria-label="Moderator phụ trách"]')?.matches(":disabled")).toBe(true);
  expect(dialog.textContent).not.toContain("Lưu thay đổi");
  expect(dialog.textContent).not.toContain("Hủy lịch");
  await submit(dialog.querySelector("form")!);
  expect(props.onUpdate).not.toHaveBeenCalled();
  const updated = { ...schedule(), title: "Lịch đã cập nhật", updatedAt: new Date("2026-10-16T08:00:00Z") };
  await act(async () => root?.render(<ReleaseScheduleDialog {...props} schedule={updated} />));
  expect(dialog.querySelector<HTMLInputElement>("#release-title")?.value).toBe("Lịch đã cập nhật");
});
