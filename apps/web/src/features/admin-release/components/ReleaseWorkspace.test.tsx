import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ReleaseScheduleForm } from "./ReleaseScheduleForm";
import { ReleaseProgressTimeline } from "./ReleaseProgressTimeline";
import { ReleaseWorkspaceView } from "./ReleaseWorkspace";
import type { ReleaseScheduleDraft } from "../services/adminReleaseService";
import type { useReleaseWorkspace } from "../hooks/useReleaseWorkspace";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

it("creates a schedule with a release time, production deadline and moderator", async () => {
  const submit = mock((_draft: ReleaseScheduleDraft) => Promise.resolve());
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(
      <ReleaseScheduleForm
        moderators={[{ id: "mod-1", name: "Nguyễn An", email: "an@example.org" }]}
        initialValues={{
          title: "",
          productionDeadline: "2026-10-19T20:00",
          scheduledAt: "2026-10-20T20:00",
          moderatorId: "",
        }}
        onSubmit={submit}
      />,
    );
  });
  expect(host.querySelector('input[type="datetime-local"]')).toBeNull();
  expect(host.querySelector('button[aria-label="Chọn hạn hoàn thành sản xuất"]')).not.toBeNull();
  expect(host.querySelector('button[aria-label="Chọn ngày phát hành"]')).not.toBeNull();
  const title = host.querySelector<HTMLInputElement>("#release-title")!;
  const valueSetter = Object.getOwnPropertyDescriptor(
    window.HTMLInputElement.prototype,
    "value",
  )?.set;
  const setInput = async (input: HTMLInputElement, value: string) => {
    await act(async () => {
      valueSetter?.call(input, value);
      input.dispatchEvent(new window.Event("input", { bubbles: true }));
      input.dispatchEvent(new window.Event("change", { bubbles: true }));
    });
  };
  await setInput(title, "Podcast Điện Biên Phủ");
  const moderatorTrigger = host.querySelector('[data-slot="select-trigger"]') as HTMLButtonElement;
  await act(async () => {
    moderatorTrigger.focus();
    moderatorTrigger.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  const moderatorOption = document.body.querySelector('[data-slot="select-item"][data-value="mod-1"]') as HTMLElement;
  await act(async () => {
    moderatorOption.dispatchEvent(new PointerEvent("pointerup", { bubbles: true, button: 0 }));
    moderatorOption.click();
  });
  await act(async () => {
    (host.querySelector("form") as HTMLFormElement).dispatchEvent(
      new window.Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  expect(submit).toHaveBeenCalledTimes(1);
  const submitted = submit.mock.calls[0]?.[0];
  expect(submitted?.title).toBe("Podcast Điện Biên Phủ");
  expect(submitted?.moderatorId).toBe("mod-1");
  expect(new Date(submitted?.productionDeadline ?? "").getTime())
    .toBeLessThan(new Date(submitted?.scheduledAt ?? "").getTime());
});

it("translates technical progress events into release language", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(
      <ReleaseProgressTimeline
        events={[
          {
            id: "event-1",
            action: "release_schedule.created",
            actorType: "ADMIN",
            actorId: "admin-1",
            fromStatus: null,
            toStatus: "SCHEDULED",
            createdAt: new Date("2026-10-15T08:00:00.000Z"),
          },
          {
            id: "event-2",
            action: "release.published",
            actorType: "SYSTEM",
            actorId: null,
            fromStatus: "PUBLISHING",
            toStatus: "RELEASED",
            createdAt: new Date("2026-10-20T13:00:00.000Z"),
          },
        ]}
      />,
    );
  });
  expect(host.textContent).toContain("Đã tạo lịch phát hành");
  expect(host.textContent).toContain("Hệ thống đã phát hành podcast");
  expect(host.textContent).not.toContain("release.published");
});

it("does not render release action errors as a full-width page alert", async () => {
  const emptyColumn = { items: [], total: 0, isPending: false, error: null };
  const workspace = {
    view: "table",
    setView: mock(() => undefined),
    search: "",
    setSearch: mock(() => undefined),
    moderatorId: "",
    setModeratorId: mock(() => undefined),
    status: "",
    setStatus: mock(() => undefined),
    from: "",
    setFrom: mock(() => undefined),
    to: "",
    setTo: mock(() => undefined),
    tablePage: 1,
    setTablePage: mock(() => undefined),
    boardPages: { SCHEDULED: 1, READY_TO_PUBLISH: 1, PUBLISHING: 1, RELEASED: 1 },
    setBoardPage: mock(() => undefined),
    board: {
      columns: {
        SCHEDULED: emptyColumn,
        READY_TO_PUBLISH: emptyColumn,
        PUBLISHING: emptyColumn,
        RELEASED: emptyColumn,
      },
      isPending: false,
      isError: false,
    },
    table: { data: { items: [], page: 1, limit: 20, total: 0 }, isPending: false, error: null },
    moderators: { data: { items: [] } },
    progress: { data: { items: [] } },
    selectedSchedule: null,
    dialogMode: null,
    pendingIds: new Set<string>(),
    error: new Error("Không thể cập nhật lịch"),
    openEdit: mock(() => undefined),
    openCreate: mock(() => undefined),
    closeDialog: mock(() => undefined),
    transition: mock(() => Promise.resolve()),
    create: mock(() => Promise.resolve()),
    update: mock(() => Promise.resolve()),
    retry: mock(() => Promise.resolve()),
    publishNow: mock(() => Promise.resolve()),
    cancel: mock(() => Promise.resolve()),
    boardStatuses: ["SCHEDULED", "READY_TO_PUBLISH", "PUBLISHING", "RELEASED"],
    busy: false,
  } as unknown as ReturnType<typeof useReleaseWorkspace>;
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  await act(async () => root?.render(<ReleaseWorkspaceView workspace={workspace} />));

  expect(host.querySelector('[role="alert"]')).toBeNull();
  expect(host.textContent).not.toContain("Dữ liệu lịch đã được đồng bộ lại từ hệ thống");
});
