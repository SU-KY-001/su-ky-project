import { afterEach, expect, it, mock, spyOn } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { ResolvedExhibition } from "@repo/shared";

let sceneReady: (() => void) | undefined;
let sceneUnavailable: (() => void) | undefined;
await import("@react-three/fiber");
const sceneModule = await import("./components/GalleryScene");
const { ExhibitionExperience } = await import("./ExhibitionExperience");
let root: Root | undefined;
const fonts = Object.getOwnPropertyDescriptor(document, "fonts");
afterEach(() => {
  act(() => root?.unmount());
  mock.restore();
  document.body.innerHTML = "";
  if (fonts) Object.defineProperty(document, "fonts", fonts);
  else Reflect.deleteProperty(document, "fonts");
  sceneReady = undefined;
});

it("does not mount a gallery on the poster, supports cancel, then enters after the first frame", async () => {
  spyOn(sceneModule, "GalleryScene").mockImplementation(({ onReady, onUnavailable }) => { sceneReady = onReady; sceneUnavailable = onUnavailable; return <canvas data-testid="gallery" />; });
  Object.defineProperty(document, "fonts", { configurable: true, value: { load: async () => [] } });
  const exhibition: ResolvedExhibition = { metadata: { title: "Ký ức", subtitle: "", description: "Tư liệu", coverAssetId: null }, chapters: [{ id: "chapter", roomKey: "room-1", title: "Chương một", period: "", description: "" }], items: [] };
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => { root?.render(<ExhibitionExperience exhibition={exhibition} />); });
  expect(host.querySelector("canvas")).toBeNull();
  expect(sceneReady).toBeUndefined();
  const button = (text: string): HTMLButtonElement => {
    const element = [...document.querySelectorAll("button")].find(item => item.textContent?.includes(text));
    if (!element) throw new Error(`Missing button: ${text}`);
    return element;
  };
  await act(async () => { button("Bước vào triển lãm").click(); });
  expect(document.body.textContent).toContain("Hành trình triển lãm");
  expect(host.querySelector("canvas")).toBeNull();
  await act(async () => { document.querySelector<HTMLButtonElement>('[aria-label="Đóng hộp thoại"]')?.click(); });
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(host.querySelector("canvas")).toBeNull();
  await act(async () => { button("Bước vào triển lãm").click(); });
  await act(async () => { button("Chương một").click(); });
  expect(host.textContent).toContain("Đang chuẩn bị không gian");
  await act(async () => { button("Quay lại giới thiệu").click(); });
  expect(host.querySelector("canvas")).toBeNull();
  await act(async () => { button("Bước vào triển lãm").click(); });
  await act(async () => { button("Chương một").click(); });
  await act(async () => { sceneReady?.(); });
  expect(host.querySelector("canvas")).not.toBeNull();
  expect(host.textContent).not.toContain("Bước vào triển lãm");
  await act(async () => { sceneUnavailable?.(); });
  expect(document.body.textContent).toContain("Hành trình triển lãm");
  expect(document.body.textContent).not.toContain("Tiếp tục qua những bức ảnh");
});
