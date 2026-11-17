import { afterEach, expect, it, spyOn } from "bun:test";
import { act, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";
import { RichScriptEditor, type RichScriptEditorHandle } from "./RichScriptEditor";
import { ScriptFileImport } from "./ScriptFileImport";
import * as service from "../services/scriptImportService";
import { legacyScriptToDocument } from "../scriptEditor";

let root: Root | undefined;
const restores: Array<() => void> = [];
afterEach(() => { act(() => root?.unmount()); restores.forEach((restore) => restore()); restores.length = 0; document.body.innerHTML = ""; });
async function render(props: Partial<React.ComponentProps<typeof ScriptFileImport>> = {}, initialText = "Nội dung cũ"): Promise<HTMLElement> {
  function Harness() {
    const ref = useRef<RichScriptEditorHandle>(null);
    return <><RichScriptEditor ref={ref} initialDocument={legacyScriptToDocument(initialText)} onChange={() => {}} /><ScriptFileImport editorRef={ref} {...props} /></>;
  }
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<Harness />));
  await click("Import file"); return host;
}
async function click(text: string): Promise<void> { await act(async () => Array.from(document.querySelectorAll<HTMLButtonElement>("button")).find((button) => button.textContent === text)?.click()); }
async function upload(): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  Object.defineProperty(input, "files", { configurable: true, value: [new File(["Văn bản mới"], "kichban.txt")] });
  await act(async () => { input.dispatchEvent(new Event("change", { bubbles: true })); await Bun.sleep(5); });
}
it("previews without writing and replaces existing content only after confirmation", async () => {
  const spy = spyOn(service, "extractScriptDocument").mockResolvedValue({ fileName: "kichban.txt", format: "txt", blocks: [{ text: "Văn bản mới", page: null, line: 1 }] }); restores.push(() => spy.mockRestore());
  const host = await render(); await upload();
  expect(document.querySelector("pre")?.textContent).toBe("Văn bản mới");
  expect(host.querySelector('[contenteditable="true"]')?.textContent).toBe("Nội dung cũ");
  await click("Đưa vào trình soạn");
  expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
  await click("Thay thế kịch bản");
  expect(host.querySelector('[contenteditable="true"]')?.textContent).toContain("Văn bản mới");
  expect(host.querySelector('[contenteditable="true"]')?.textContent).not.toContain("Nội dung cũ");
});
it("asks before replacement and cancellation keeps existing content", async () => {
  const spy = spyOn(service, "extractScriptDocument").mockResolvedValue({ fileName: "kichban.txt", format: "txt", blocks: [{ text: "Thay thế", page: null, line: 1 }] }); restores.push(() => spy.mockRestore());
  const host = await render(); await upload();
  await click("Đưa vào trình soạn");
  expect(document.querySelector('[role="alertdialog"]')).not.toBeNull();
  await click("Quay lại");
  expect(host.querySelector('[contenteditable="true"]')?.textContent).toBe("Nội dung cũ");
  await click("Đưa vào trình soạn"); await click("Thay thế kịch bản");
  expect(host.querySelector('[contenteditable="true"]')?.textContent).toBe("Thay thế");
});
it("ignores a late extraction result after closing the dialog", async () => {
  let finish: ((value: Awaited<ReturnType<typeof service.extractScriptDocument>>) => void) | undefined;
  const spy = spyOn(service, "extractScriptDocument").mockImplementation(() => new Promise((resolve) => { finish = resolve; })); restores.push(() => spy.mockRestore());
  const host = await render(); await upload(); await click("Hủy");
  await act(async () => finish?.({ fileName: "kichban.txt", format: "txt", blocks: [{ text: "Kết quả muộn", page: null, line: 1 }] }));
  expect(host.querySelector('[contenteditable="true"]')?.textContent).toBe("Nội dung cũ");
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it("recognizes titled multi-speaker dialogue and proposes a type change instead of a structure error", async () => {
  const spy = spyOn(service, "extractScriptDocument").mockResolvedValue({ fileName: "kichban.txt", format: "txt", blocks: [{ text: "[LOẠI KỊCH BẢN: PODCAST HỘI THOẠI]\nCÀ PHÊ SÀI GÒN XƯA\n\nTHẢO VY: Xin chào\nMINH KHANG: Cảm ơn\nKhách mời: Chào mọi người", page: null, line: 1 }] }); restores.push(() => spy.mockRestore());
  let appliedKind = "";
  await render({ selectedType: "monologue", onApply: (_text, kind) => { appliedKind = kind; return { ok: true }; } }); await upload();
  const applyButton = (): HTMLButtonElement | undefined => Array.from(document.querySelectorAll<HTMLButtonElement>('button')).find((button) => button.textContent === 'Đưa vào trình soạn');
  expect(applyButton()?.disabled).toBe(true);
  expect(document.body.textContent).toContain("Nhận diện: Hội thoại");
  expect(document.body.textContent).toContain("Hội thoại với 3 người nói");
  expect(document.body.textContent).not.toContain("Có nội dung đầu file chưa gắn người nói");
  expect(appliedKind).toBe("");
  await click("Đổi sang Hội thoại");
  await click("Đưa vào trình soạn"); await click("Thay thế kịch bản");
  expect(appliedKind).toBe("dialogue");
});

it("imports declared monologue into an empty editor without radio controls or dialogue errors", async () => {
  const body = "TRẬN BẠCH ĐẰNG NĂM 938\n\nHãy nhắm mắt lại một chút.\n\nXin chào và tạm biệt!";
  const spy = spyOn(service, "extractScriptDocument").mockResolvedValue({ fileName: "Kich_ban_Podcast_Lich_su_Doc_thoai.docx", format: "docx", blocks: [{ text: "[LOẠI KỊCH BẢN: PODCAST ĐỘC THOẠI]\n\n" + body, page: null, line: 1 }] }); restores.push(() => spy.mockRestore());
  const host = await render({}, ""); await upload();
  expect(document.querySelector("pre")?.textContent).toBe(body);
  expect(document.body.textContent).toContain("Nhận diện: Độc thoại");
  expect(document.querySelectorAll('input[type="radio"]')).toHaveLength(0);
  expect(document.body.textContent).not.toContain("Hội thoại cần ít nhất hai người");
  await click("Đưa vào trình soạn");
  expect(document.querySelector('[role="alertdialog"]')).toBeNull();
  expect(host.querySelector('[contenteditable="true"]')?.textContent).toContain("Hãy nhắm mắt lại một chút.");
  expect(host.querySelector('[contenteditable="true"]')?.textContent).not.toContain("LOẠI KỊCH BẢN");
});
