import { afterEach, expect, it } from "bun:test";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import { DateTimePicker } from "./date-picker";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

function TimePickerProbe() {
  const [value, setValue] = useState("2026-10-15T14:21");
  return <>
    <DateTimePicker
      value={value}
      onChange={setValue}
      ariaLabel="Chọn thời gian phát hành"
      placeholder="Chọn ngày phát hành"
    />
    <output>{value}</output>
  </>;
}

async function setInput(input: HTMLInputElement, value: string) {
  const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set;
  await act(async () => {
    setter?.call(input, value);
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

it("uses a styled time picker and preserves exact hour and minute selection", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(<TimePickerProbe />));

  expect(host.querySelector('input[type="time"]')).toBeNull();
  const trigger = host.querySelector<HTMLButtonElement>('[data-slot="time-picker-trigger"]')!;
  const input = host.querySelector<HTMLInputElement>('input[aria-label="Chọn thời gian phát hành - giờ"]');
  expect(input).not.toBeNull();
  expect(input!.value).toBe("14:21");

  await act(async () => trigger.click());
  await act(async () => document.body.querySelector<HTMLButtonElement>('[aria-label="Chọn giờ 18"]')?.click());
  await act(async () => document.body.querySelector<HTMLButtonElement>('[aria-label="Chọn phút 45"]')?.click());

  expect(input!.value).toBe("18:45");
});

it("accepts typed Vietnamese dates and 24-hour times", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(<TimePickerProbe />));

  const dateInput = host.querySelector<HTMLInputElement>('input[aria-label="Chọn thời gian phát hành - nhập ngày"]');
  const timeInput = host.querySelector<HTMLInputElement>('input[aria-label="Chọn thời gian phát hành - giờ"]');
  expect(dateInput).not.toBeNull();
  expect(timeInput).not.toBeNull();
  await setInput(dateInput!, "20/10/2026");
  await act(async () => dateInput!.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
  await setInput(timeInput!, "18:45");
  await act(async () => timeInput!.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })));

  expect(host.querySelector("output")?.textContent).toBe("2026-10-20T18:45");
});

it("restores the last valid values after invalid typed dates or times", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(<TimePickerProbe />));

  const dateInput = host.querySelector<HTMLInputElement>('input[aria-label="Chọn thời gian phát hành - nhập ngày"]');
  const timeInput = host.querySelector<HTMLInputElement>('input[aria-label="Chọn thời gian phát hành - giờ"]');
  expect(dateInput).not.toBeNull();
  expect(timeInput).not.toBeNull();
  await setInput(dateInput!, "32/13/2026");
  await act(async () => dateInput!.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));
  await setInput(timeInput!, "29:99");
  await act(async () => timeInput!.dispatchEvent(new FocusEvent("focusout", { bubbles: true })));

  expect(dateInput!.value).toBe("15/10/2026");
  expect(timeInput!.value).toBe("14:21");
  expect(host.querySelector("output")?.textContent).toBe("2026-10-15T14:21");
});
