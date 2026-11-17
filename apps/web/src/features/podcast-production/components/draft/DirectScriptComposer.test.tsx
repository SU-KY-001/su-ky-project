import { afterEach, expect, it, spyOn } from "bun:test";
import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { DraftSectionResponse } from "@repo/shared";
import { DirectScriptComposer } from "./DirectScriptComposer";
import { RichScriptEditor, type RichScriptEditorHandle } from "../RichScriptEditor";
import { legacyScriptToDocument } from "../../scriptEditor";
import { angleService } from "../../angles/angleService";
import { composeService } from "../../compose/composeService";

let root: Root | undefined;
const restores: Array<() => void> = [];
afterEach(() => { act(() => root?.unmount()); restores.splice(0).forEach((restore) => restore()); document.body.innerHTML = ""; });
const response = (text = "Kịch bản AI đã tạo."): DraftSectionResponse => ({ paragraphs: [text], wordCount: 5, lengthStatus: "OK", exceedsLimit: false, cleaned: false, novelNumbers: [], promptVersion: 1 });
async function click(label: string) { await act(async () => [...document.querySelectorAll<HTMLButtonElement>("button")].find((button) => button.textContent?.trim() === label)?.click()); }
async function mount(initial = "") {
  const angles = spyOn(angleService, "list").mockResolvedValue({ items: [{ id: "builtin:timeline", name: "Trình tự thời gian", description: "Trước, trong, sau", guide: "Kể theo thời gian", builtin: true }] }); restores.push(() => angles.mockRestore());
  let handle: RichScriptEditorHandle | null = null;
  function Harness() {
    const ref = useRef<RichScriptEditorHandle>(null);
    return <><DirectScriptComposer editorRef={ref} ensureEpisode={async () => "episode-id"} wordsPerMinute={150} /><RichScriptEditor ref={(value) => { ref.current = value; handle = value; }} initialDocument={legacyScriptToDocument(initial)} onChange={() => {}} /></>;
  }
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<Harness />));
  const input = host.querySelector<HTMLInputElement>('input[placeholder^="Vì sao"]')!;
  await act(async () => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(input, "Lịch sử Việt Nam"); input.dispatchEvent(new Event("input", { bubbles: true })); });
  return { host, editor: () => handle! };
}

it("generates a complete script directly into the editable rich editor without an outline call", async () => {
  const draft = spyOn(composeService, "draftSection").mockResolvedValue(response()); restores.push(() => draft.mockRestore());
  const outline = spyOn(composeService, "outline"); restores.push(() => outline.mockRestore());
  const { host, editor } = await mount(); await click("Tạo kịch bản");
  expect(outline).not.toHaveBeenCalled(); expect(draft).toHaveBeenCalledTimes(1);
  expect(draft.mock.calls[0]?.[1]).toMatchObject({ topic: "Lịch sử Việt Nam", narration: "THIRD_PERSON", index: 0, outline: [{ title: "Kịch bản podcast độc thoại hoàn chỉnh", targetWords: 1800 }] });
  expect(editor().getText()).toBe("Kịch bản AI đã tạo.");
  expect(host.querySelector('[contenteditable="true"]')).not.toBeNull();
  expect(host.textContent).toContain("Tạo lại kịch bản");
  expect(host.textContent).not.toContain("Tạo dàn ý");
});

it("confirms regeneration and preserves existing edits when AI fails", async () => {
  const draft = spyOn(composeService, "draftSection").mockRejectedValue(new Error("AI tạm gián đoạn")); restores.push(() => draft.mockRestore());
  const { editor } = await mount("Bản mod đang sửa");
  await click("Tạo kịch bản"); expect(draft).not.toHaveBeenCalled();
  await click("Tạo kịch bản mới");
  expect(editor().getText()).toBe("Bản mod đang sửa");
  expect(document.querySelector('[role="alert"]')?.textContent).toContain("AI tạm gián đoạn");
});

it("retains generated content on edit conflicts until explicit application", async () => {
  let finish: ((result: DraftSectionResponse) => void) | undefined;
  const draft = spyOn(composeService, "draftSection").mockImplementation(() => new Promise((resolve) => { finish = resolve; })); restores.push(() => draft.mockRestore());
  const { editor } = await mount(); await click("Tạo kịch bản");
  await act(async () => { editor().importText("Nội dung mod vừa sửa", true); });
  await act(async () => finish?.(response("Bản AI mới")));
  expect(editor().getText()).toBe("Nội dung mod vừa sửa");
  await click("Áp dụng bản vừa tạo"); await click("Tạo kịch bản mới");
  expect(editor().getText()).toBe("Bản AI mới");
});

it("ignores late model output after the moderator stops generation", async () => {
  let finish: ((result: DraftSectionResponse) => void) | undefined;
  const draft = spyOn(composeService, "draftSection").mockImplementation(() => new Promise((resolve) => { finish = resolve; })); restores.push(() => draft.mockRestore());
  const { editor } = await mount(); await click("Tạo kịch bản"); await click("Dừng tạo");
  await act(async () => finish?.(response("Kết quả muộn")));
  expect(editor().getText()).toBe("");
});
