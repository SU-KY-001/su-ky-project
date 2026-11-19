import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PublicationNoticeView } from "./PublicationNotice";

let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

async function render(info: Parameters<typeof PublicationNoticeView>[0]["info"]) {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => root?.render(<PublicationNoticeView info={info} />));
  return host;
}

it("shows the AI disclosure and credits recorded at approval", async () => {
  const host = await render({ aiDisclosure: "Giọng đọc do AI tạo.", credits: "Biên soạn: Nguyễn An" });
  expect(host.textContent).toContain("Thông báo về AI: Giọng đọc do AI tạo.");
  expect(host.textContent).toContain("Ghi công: Biên soạn: Nguyễn An");
});

it("renders nothing when no approval info or both fields are empty", async () => {
  expect((await render(null)).innerHTML).toBe("");
  expect((await render({ aiDisclosure: null, credits: null })).innerHTML).toBe("");
});
