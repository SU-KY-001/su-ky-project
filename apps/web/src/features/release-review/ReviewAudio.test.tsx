import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ReviewAudio } from "./ReviewAudio";

let root: Root | undefined;
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ""; });

it("shows the file's measured duration and current position after metadata loads", async () => {
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<ReviewAudio src="https://example.org/file.mp3" />));
  const audio = host.querySelector("audio")!;
  expect(audio.preload).toBe("metadata");
  expect(audio.controls).toBe(false);
  expect(host.textContent).not.toContain("00:00 / 00:00");
  Object.defineProperty(audio, "duration", { configurable: true, value: 106.8 });
  await act(async () => audio.dispatchEvent(new Event("loadedmetadata")));
  expect(audio.controls).toBe(true);
  expect(host.textContent).toContain("00:00 / 01:46");
  Object.defineProperty(audio, "currentTime", { configurable: true, value: 39 });
  await act(async () => audio.dispatchEvent(new Event("timeupdate")));
  expect(host.textContent).toContain("00:39 / 01:46");
});
