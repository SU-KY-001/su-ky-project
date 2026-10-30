import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AudioUploadDropzone } from "./AudioUploadDropzone";

let root: Root | undefined;
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ""; });

it("accepts one audio file by drop and rejects multiple files", async () => {
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  const select = mock(async () => undefined);
  await act(async () => root?.render(<AudioUploadDropzone onSelect={select} />));
  const zone = host.querySelector('[role="group"]')!;
  const file = new File(["sound"], "story.mp3", { type: "audio/mpeg" });
  const drop = (files: File[]): Event => { const event = new Event("drop", { bubbles: true, cancelable: true }); Object.defineProperty(event, "dataTransfer", { value: { files } }); return event; };
  await act(async () => zone.dispatchEvent(drop([file, file])));
  expect(host.textContent).toContain("Chọn một file âm thanh duy nhất.");
  expect(select).not.toHaveBeenCalled();
  await act(async () => zone.dispatchEvent(drop([file])));
  expect(select).toHaveBeenCalledWith(file);
});

it("shows upload progress and keeps the existing file available after an error", async () => {
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  let rejectUpload: (error: Error) => void = () => {};
  const select = mock(() => new Promise<void>((_, reject) => { rejectUpload = reject; }));
  await act(async () => root?.render(<AudioUploadDropzone onSelect={select} hasAudio previewUrl="https://example.com/existing.mp3" />));
  expect(host.textContent).toContain("Đã có âm thanh kể chuyện");
  const zone = host.querySelector('[role="group"]')!;
  const drop = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(drop, "dataTransfer", { value: { files: [new File(["sound"], "new.mp3", { type: "audio/mpeg" })] } });
  await act(async () => zone.dispatchEvent(drop));
  expect(host.textContent).toContain("Đang tải âm thanh");
  await act(async () => rejectUpload(new Error("upload failed")));
  expect(host.textContent).toContain("Không thể tải file mới");
  expect(host.querySelector("audio")?.getAttribute("src")).toBe("https://example.com/existing.mp3");
  expect(host.textContent).toContain("Thử tải lại");
});
