import { afterEach, expect, it } from "bun:test";
import { act, useState } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { HistoricalTimeDto } from "@repo/shared";
import { HistoricalTimeFields } from "./HistoricalTimeFields";
let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});
it("switches era while keeping numeric year and emits signed year", async () => {
  function Form() {
    const [time, setTime] = useState<HistoricalTimeDto>({
      kind: "POINT",
      at: { year: 179, precision: "YEAR", approximate: false },
    });
    return (
      <>
        <HistoricalTimeFields value={time} onChange={setTime} />
        <output>{JSON.stringify(time)}</output>
      </>
    );
  }
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(<Form />));
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="TCN sự kiện"]')?.click());
  expect(
    document.querySelector<HTMLInputElement>('input[aria-label="Năm sự kiện"]')
      ?.value,
  ).toBe("179");
  expect(document.querySelector("output")?.textContent).toContain(
    '"year":-179',
  );
});

it("shows notes only for uncertain endpoints and restores the known date", async () => {
  function Form() {
    const [time, setTime] = useState<HistoricalTimeDto>({ kind: "RANGE", start: { year: -221, precision: "YEAR", approximate: false }, end: { year: -206, precision: "YEAR", approximate: false }, endState: "KNOWN" });
    return <><HistoricalTimeFields value={time} onChange={setTime} /><output>{JSON.stringify(time)}</output></>;
  }
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<Form />));
  expect(document.querySelector('[aria-label="Ghi chú thời gian"]')).toBeNull();
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Chưa rõ bắt đầu"]')?.click());
  expect(document.querySelector('[aria-label="Ghi chú thời gian"]')).not.toBeNull();
  expect(document.querySelector("output")?.textContent).toContain('"start":null');
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Chưa rõ bắt đầu"]')?.click());
  expect(document.querySelector('[aria-label="Ghi chú thời gian"]')).toBeNull();
  expect(document.querySelector("output")?.textContent).toContain('"year":-221');
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Đến nay kết thúc"]')?.click());
  expect(document.querySelector("output")?.textContent).toContain('"endState":"ONGOING"');
  expect(document.querySelector('[aria-label="Ghi chú thời gian"]')).toBeNull();
});

it("adds month and day for events and keeps taxonomy dates at year precision", async () => {
  function Form() {
    const [time, setTime] = useState<HistoricalTimeDto>({ kind: "POINT", at: { year: 1945, precision: "YEAR", approximate: false } });
    return <><HistoricalTimeFields value={time} onChange={setTime} /><output>{JSON.stringify(time)}</output></>;
  }
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<Form />));
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Thêm tháng/ngày sự kiện"]')?.click());
  const month=document.querySelector<HTMLInputElement>('[aria-label="Tháng sự kiện"]')!;
  const day=document.querySelector<HTMLInputElement>('[aria-label="Ngày sự kiện"]')!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set?.call(month,"8"); month.dispatchEvent(new Event("input",{bubbles:true}));
  });
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,"value")?.set?.call(day,"19"); day.dispatchEvent(new Event("input",{bubbles:true}));
  });
  expect(document.querySelector("output")?.textContent).toContain('"precision":"DAY"');
  expect(document.querySelector("output")?.textContent).toContain('"month":8');
  expect(document.querySelector("output")?.textContent).toContain('"day":19');
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Chỉ năm sự kiện"]')?.click());
  expect(document.querySelector("output")?.textContent).not.toContain('"month"');
  expect(document.querySelector("output")?.textContent).not.toContain('"day"');
  await act(async () => root?.render(<HistoricalTimeFields taxonomy value={{kind:"RANGE",start:{year:1802,precision:"YEAR",approximate:false},end:null,endState:"ONGOING"}} onChange={() => {}} />));
  expect(document.querySelector('[aria-label="Thêm tháng/ngày bắt đầu"]')).toBeNull();
});
