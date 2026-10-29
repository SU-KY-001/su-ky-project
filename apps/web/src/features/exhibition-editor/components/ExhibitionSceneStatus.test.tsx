import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ExhibitionSceneStatus } from "./ExhibitionSceneStatus";

let root: Root | undefined;
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ""; });

it("shows loading until the first frame, and provides a retry after failure", async () => {
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  const retry = mock(() => undefined);
  await act(async () => root?.render(<ExhibitionSceneStatus status="loading" onRetry={retry} />));
  expect(host.textContent).toContain("Đang chuẩn bị không gian 3D");
  await act(async () => root?.render(<ExhibitionSceneStatus status="error" onRetry={retry} />));
  expect(host.textContent).toContain("Không thể tải không gian 3D");
  await act(async () => host.querySelector("button")?.click());
  expect(retry).toHaveBeenCalledTimes(1);
  await act(async () => root?.render(<ExhibitionSceneStatus status="ready" onRetry={retry} />));
  expect(host.textContent).not.toContain("Đang chuẩn bị");
});
