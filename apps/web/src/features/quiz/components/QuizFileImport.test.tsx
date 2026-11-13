import { afterEach, expect, it, spyOn } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { parseQuizDocument, type QuizDraftQuestion, type QuizImportPreview } from "@repo/shared";
import { QuizTextImport } from "./QuizTextImport";
import { quizService } from "../services/quizService";

let root: Root | undefined;
const restores: (() => void)[] = [];
afterEach(() => { act(() => root?.unmount()); root = undefined; for (const r of restores.splice(0)) r(); document.body.innerHTML = ""; });
const source = "Câu 1: Ai lãnh đạo khởi nghĩa Lam Sơn?\nĐáp án: Lê Lợi";
function report(text = source): QuizImportPreview { return parseQuizDocument({ fileName: "quiz.txt", format: "txt", blocks: text.split("\n").map((text, i) => ({ text, line: i + 1, page: null })) }, 60); }
function button(label: string, scope: ParentNode = document): HTMLButtonElement {
  const node = [...scope.querySelectorAll("button")].find(b => b.textContent?.trim() === label); if (!node) throw new Error(`Missing button ${label}`); return node;
}
async function click(label: string, scope: ParentNode = document): Promise<void> { await act(async () => button(label, scope).click()); }
async function upload(files = [new File([source], "quiz.txt")]): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  await act(async () => { Object.defineProperty(input, "files", { configurable: true, value: files }); input.dispatchEvent(new Event("change", { bubbles: true })); });
}
async function render(empty = true, count = 1): Promise<QuizDraftQuestion[][]> {
  const calls: QuizDraftQuestion[][] = [];
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<QuizTextImport count={count} empty={empty} defaultTime={60} onApply={questions => calls.push(questions)} />));
  await click("Import File"); return calls;
}
function mock(result = report()): void { const spy = spyOn(quizService, "previewDocument").mockResolvedValue(result); restores.push(() => spy.mockRestore()); }
it("starts with only file selection, without pasted input, toolbar or cancel button", async () => {
  await render(); expect(document.querySelector("textarea")).toBeNull();
  for (const label of ["Dán văn bản", "Tải tài liệu", "Xem mẫu", "Sao chép mẫu", "Hủy nhập"]) expect(document.body.textContent).not.toContain(label);
  expect(button("Chọn tệp")).not.toBeNull();
});
it("shows a read-only preview and applies only on explicit confirmation", async () => {
  mock(); const calls = await render(); await upload();
  expect(calls).toHaveLength(0); expect(document.body.textContent).toContain("Lê Lợi"); expect(document.body.textContent).toContain("Đọc tài liệu thành công");
  expect(document.querySelector("textarea")).toBeNull();
  await click("Đưa vào trình soạn"); expect(calls).toHaveLength(1); expect(calls[0][0]).toMatchObject({ kind: "TEXT", options: ["Lê Lợi"] });
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it("shows errors and correction guidance, and blocks applying the entire batch", async () => {
  mock(report("Câu 1: Chọn số\nA. Một\nB. Hai\nĐáp án: D")); const calls = await render(); await upload();
  expect(button("Đưa vào trình soạn").disabled).toBe(true); expect(document.body.textContent).toContain("Câu 1");
  expect(document.body.textContent).toContain("không có trong lựa chọn"); expect(document.body.textContent).toContain("Cách sửa");
  expect(document.body.textContent).toContain("dòng"); expect(button("Tải lại file đã sửa")).not.toBeNull(); expect(calls).toHaveLength(0);
});
it("shows all three kinds, explanations and actual counts", async () => {
  mock(report("Câu 1: Một?\nA. Một\nB. Hai\nĐáp án: A\nGiải thích: Căn cứ\nCâu 2: Hai?\nA. Ba\nB. Bốn\nĐáp án: A, B\nCâu 3: Ba?\nĐáp án: Năm"));
  await render(); await upload(); for (const t of ["Chọn một", "Chọn nhiều", "Điền đáp án", "Căn cứ", "3 câu"]) expect(document.body.textContent).toContain(t);
});
it("rejects invalid, multiple and oversized files without sending them", async () => {
  const spy = spyOn(quizService, "previewDocument"); restores.push(() => spy.mockRestore()); await render();
  await upload([new File(["x"], "q.exe")]); expect(document.querySelector('[role="alert"]')?.textContent).toContain("định dạng");
  await upload([new File(["x"], "q.txt"), new File(["x"], "q2.txt")]); expect(document.querySelector('[role="alert"]')?.textContent).toContain("một");
  await upload([new File([new Uint8Array(5 * 1024 * 1024 + 1)], "q.pdf")]); expect(document.querySelector('[role="alert"]')?.textContent).toContain("5 MB"); expect(spy).not.toHaveBeenCalled();
});
it("shows actual uploading/processing phases and close aborts without applying late output", async () => {
  let finish: (r: QuizImportPreview) => void = () => {}; let signal: AbortSignal | undefined; let uploaded: (() => void) | undefined;
  const spy = spyOn(quizService, "previewDocument").mockImplementation((_file, _time, s, onUploaded) => { signal = s; uploaded = onUploaded; return new Promise(resolve => { finish = resolve; }); }); restores.push(() => spy.mockRestore());
  const calls = await render(); await upload(); expect(document.body.textContent).toContain("Đang tải tài liệu");
  await act(async () => uploaded?.()); expect(document.body.textContent).toContain("Đang đọc và phân tích");
  await act(async () => document.querySelector<HTMLButtonElement>('[aria-label="Đóng hộp thoại"]')!.click());
  expect(signal?.aborted).toBe(true); await act(async () => finish(report())); expect(calls).toHaveLength(0); expect(document.querySelector('[role="dialog"]')).toBeNull();
});
it("can retry the same file after a technical failure", async () => {
  const spy = spyOn(quizService, "previewDocument").mockRejectedValueOnce(new Error("Đọc tài liệu quá thời gian")).mockResolvedValueOnce(report()); restores.push(() => spy.mockRestore());
  const calls = await render(); const file = new File([source], "quiz.txt"); await upload([file]); expect(document.querySelector('[role="alert"]')?.textContent).toContain("quá thời gian");
  await upload([file]); expect(button("Đưa vào trình soạn").disabled).toBe(false); expect(calls).toHaveLength(0); expect(spy).toHaveBeenCalledTimes(2);
});
it("blocks append above 100 and allows explicit replacement only after confirmation", async () => {
  mock(); const calls = await render(false, 100); await upload(); expect(button("Đưa vào trình soạn").disabled).toBe(true);
  await act(async () => document.querySelector<HTMLInputElement>('input[value="replace"]')!.click());
  await click("Đưa vào trình soạn"); expect(calls).toHaveLength(0); const confirm = document.querySelector('[role="alertdialog"]')!;
  await click("Quay lại", confirm); expect(calls).toHaveLength(0);
  await click("Đưa vào trình soạn"); await click("Thay thế câu hỏi", document.querySelector('[role="alertdialog"]')!); expect(calls).toHaveLength(1);
});
it("applies at most once even when the button receives two clicks before repaint", async () => {
  mock(); const calls = await render(); await upload(); const apply = button("Đưa vào trình soạn");
  await act(async () => { apply.click(); apply.click(); }); expect(calls).toHaveLength(1);
});
it("shows a reassuring message only after the long-running timer fires", async () => {
  const timer = spyOn(window, "setTimeout"); restores.push(() => timer.mockRestore());
  const preview = spyOn(quizService, "previewDocument").mockImplementation(() => new Promise(() => {})); restores.push(() => preview.mockRestore());
  await render(); await upload(); expect(document.body.textContent).not.toContain("bằng nút X để dừng");
  const callback = timer.mock.calls.find(call => call[1] === 10_000)?.[0];
  expect(typeof callback).toBe("function");
  await act(async () => { if (typeof callback === "function") callback(); });
  expect(document.body.textContent).toContain("bằng nút X để dừng");
});
it("discards only the current file preview when going back and accepts a new upload", async () => {
  const second = report("Câu 1: Câu hỏi từ file mới?\nĐáp án: Nội dung mới");
  const spy = spyOn(quizService, "previewDocument").mockResolvedValueOnce(report()).mockResolvedValueOnce(second); restores.push(() => spy.mockRestore());
  const calls = await render(false, 1); await upload();
  expect(document.body.textContent).not.toContain("Chọn file khác");
  await act(async () => document.querySelector<HTMLInputElement>('input[value="replace"]')!.click());
  const back = document.querySelector<HTMLButtonElement>('[aria-label="Quay lại chọn tệp"]');
  expect(Boolean(back)).toBe(true);
  await act(async () => back?.click());
  expect(Boolean(document.querySelector('[role="dialog"]'))).toBe(true);
  expect(button("Chọn tệp").disabled).toBe(false);
  expect(document.body.textContent).not.toContain("Lê Lợi");
  expect(calls).toHaveLength(0);
  await upload([new File(["new"], "new.docx")]);
  expect(document.querySelector<HTMLInputElement>('input[value="append"]')?.checked).toBe(true);
  await click("Đưa vào trình soạn");
  expect(calls).toHaveLength(1); expect(calls[0][0].text).toBe("Câu hỏi từ file mới?");
});
