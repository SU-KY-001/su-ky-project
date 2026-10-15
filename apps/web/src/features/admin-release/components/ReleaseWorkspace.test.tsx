import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ReleaseScheduleForm } from "./ReleaseScheduleForm";
import { ReleaseProgressTimeline } from "./ReleaseProgressTimeline";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

it("creates a schedule with a release time, production deadline and moderator", async () => {
  const submit = mock(() => Promise.resolve());
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(
      <ReleaseScheduleForm
        moderators={[{ id: "mod-1", name: "Nguyễn An", email: "an@example.org" }]}
        onSubmit={submit}
      />,
    );
  });
  const inputs = host.querySelectorAll("input");
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
  await setInput(inputs[0] as HTMLInputElement, "Podcast Điện Biên Phủ");
  await setInput(inputs[1] as HTMLInputElement, "2026-10-19T20:00");
  await setInput(inputs[2] as HTMLInputElement, "2026-10-20T20:00");
  await act(async () => {
    (host.querySelector('input[type="checkbox"]') as HTMLInputElement).click();
  });
  await act(async () => {
    (host.querySelector("form") as HTMLFormElement).dispatchEvent(
      new window.Event("submit", { bubbles: true, cancelable: true }),
    );
  });
  expect(submit).toHaveBeenCalledTimes(1);
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
