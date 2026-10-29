import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { ImageUploadDropzone } from "./ImageUploadDropzone";

let root: Root | undefined;
afterEach(() => { act(() => root?.unmount()); document.body.innerHTML = ""; });

it("rejects multiple dropped images without uploading", async () => {
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  const upload = mock(async () => ({ assetId: "id", url: null, fileName: "ảnh", sizeBytes: null }));
  await act(async () => root?.render(<ImageUploadDropzone label="Ảnh trưng bày" value={null} policy={{ maxBytes: 1000, formats: ["png"], mimeTypes: ["image/png"] }} onUpload={upload} onChange={() => {}} onBusyChange={() => {}} />));
  const zone = host.querySelector('[role="group"]')!;
  const drop = new Event("drop", { bubbles: true, cancelable: true });
  Object.defineProperty(drop, "dataTransfer", { value: { files: [new File(["a"], "a.png", { type: "image/png" }), new File(["b"], "b.png", { type: "image/png" })] } });
  await act(async () => zone.dispatchEvent(drop));
  expect(host.textContent).toContain("Chọn hoặc kéo thả một ảnh duy nhất.");
  expect(upload).not.toHaveBeenCalled();
});
