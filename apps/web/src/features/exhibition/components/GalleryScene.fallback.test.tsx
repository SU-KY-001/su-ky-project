import { afterEach, expect, it, mock, spyOn } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";

// Fiber always mounts its fallback as the canvas's HTML children, even with WebGL.
const fiber = await import("@react-three/fiber");
const { GalleryScene } = await import("./GalleryScene");
let root: Root | undefined;
afterEach(() => { act(() => root?.unmount()); mock.restore(); document.body.innerHTML = ""; });

it("does not report WebGL failure merely because the HTML canvas fallback mounts", async () => {
  spyOn(fiber, "Canvas").mockImplementation(({ fallback }) => <canvas>{fallback}</canvas>);
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  const unavailable = mock(() => undefined);
  const noop = (): void => {};
  await act(async () => root?.render(<GalleryScene active={false} input={{ current: { keys: new Set() } }} view={{ position: [0, 1.65, 5], yaw: 0, revision: 0 }} items={[]} chapterText={[]} onUnavailable={unavailable} onPause={noop} onNavigate={noop} onInspect={noop} onTarget={noop} onChapter={noop} />));
  expect(host.querySelector("canvas")).not.toBeNull();
  expect(unavailable).not.toHaveBeenCalled();
});
