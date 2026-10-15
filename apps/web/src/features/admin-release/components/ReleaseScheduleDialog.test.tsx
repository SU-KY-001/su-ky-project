import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ReleaseScheduleRecord } from "@repo/shared";
import { ApiError } from "@/lib/apiError";
import { ReleaseScheduleDialog } from "./ReleaseScheduleDialog";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
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

it("validates create values and closes only after a successful create", async () => {
  const onCreate = mock(() => Promise.resolve());
  const onOpenChange = mock(() => undefined);
  renderDialog({ onCreate, onOpenChange });
  expect(document.body.textContent).toContain("Tạo lịch phát hành");
  const form = document.body.querySelector("form")!;

  await submit(form);
  expect(document.body.textContent).toContain("ít nhất một Moderator");
  expect(onOpenChange).not.toHaveBeenCalled();

  const inputs = document.body.querySelectorAll<HTMLInputElement>("input");
  await setInput(inputs[0]!, "Lịch tháng 10");
  await setInput(inputs[1]!, "2026-10-20T20:00");
  await setInput(inputs[2]!, "2026-10-20T19:00");
  await act(async () => document.body.querySelector<HTMLInputElement>('input[type="checkbox"]')?.click());
  await submit(form);
  expect(document.body.textContent).toContain("phải trước thời gian phát hành");
  expect(onCreate).not.toHaveBeenCalled();

  await setInput(inputs[2]!, "2026-10-21T20:00");
  await submit(form);
  expect(onCreate).toHaveBeenCalledTimes(1);
  expect(onOpenChange).toHaveBeenCalledWith(false);
});

it("opens edit mode directly with editable values and no view-only step", () => {
  renderDialog({ mode: "edit", schedule: schedule() });
  expect(document.body.textContent).toContain("Cập nhật lịch phát hành");
  expect(document.body.querySelector<HTMLInputElement>("#release-title")?.value).toBe("Dấu chân Trường Sơn");
  expect(document.body.querySelector<HTMLInputElement>('input[type="checkbox"]')?.checked).toBe(true);
  expect(document.body.querySelector<HTMLInputElement>("#production-deadline")?.value).not.toBe("");
  expect(document.body.textContent).not.toContain("Xem chi tiết");
  expect([...document.body.querySelectorAll("button")].some((button) => button.textContent?.trim() === "Chỉnh sửa")).toBe(false);
  expect(document.body.textContent).toContain("Lưu thay đổi");
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
  for (const label of ["Thử lại", "Phát hành ngay", "Hủy lịch", "Lưu thay đổi"])
    expect(document.body.textContent).toContain(label);
});
