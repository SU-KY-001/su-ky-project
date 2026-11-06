import { afterEach, expect, it, spyOn } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { QuizDraftQuestion } from "@repo/shared";
import { QuizTextImport } from "./QuizTextImport";
import { quizService } from "../services/quizService";
import type { QuizImportNotes } from "../utils/quizTextImport";

let root: Root | undefined;
let restore: (() => void) | undefined;
afterEach(() => {
  act(() => root?.unmount()); restore?.(); restore = undefined; document.body.innerHTML = "";
});
const source = "Câu 1: Ai lãnh đạo khởi nghĩa Lam Sơn?\nĐáp án: Lê Lợi";
function button(text: string, container: ParentNode = document): HTMLButtonElement {
  const result = [...container.querySelectorAll("button")].find(node => node.textContent?.trim() === text);
  if (!result) throw new Error(`Missing button: ${text}`);
  return result;
}
async function click(text: string, container: ParentNode = document): Promise<void> {
  await act(async () => button(text, container).click());
}
async function paste(text: string): Promise<void> {
  const textarea = document.querySelector<HTMLTextAreaElement>("#quiz-import-source")!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!.call(textarea, text);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function render(empty = true, count = 1): Promise<{ calls: { questions: QuizDraftQuestion[]; replace: boolean; notes: QuizImportNotes }[] }> {
  const calls: { questions: QuizDraftQuestion[]; replace: boolean; notes: QuizImportNotes }[] = [];
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  await act(async () => root?.render(<QuizTextImport count={count} empty={empty} defaultTime={60} onApply={(questions, replace, notes) => calls.push({ questions, replace, notes })} />));
  await click("Nhập câu hỏi");
  return { calls };
}
async function selectFile(file: File): Promise<void> {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;
  await act(async () => {
    Object.defineProperty(input, "files", { configurable: true, value: [file] });
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
}

it("pastes directly into the editor without an intermediate question review or save", async () => {
  const { calls } = await render();
  await paste(source);
  expect(calls).toHaveLength(0);
  expect(document.querySelector("mark")).toBeNull();
  expect(document.body.textContent).not.toContain("200.000");
  await click("Đưa vào trình soạn");
  expect(calls).toHaveLength(1);
  expect(calls[0].replace).toBe(true);
  expect(calls[0].questions[0]).toMatchObject({ kind: "TEXT", options: ["Lê Lợi"], timeLimit: 60 });
  expect(calls[0].notes).toEqual({});
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it("keeps every recognized question, including incomplete ones for correction in the main editor", async () => {
  const { calls } = await render();
  await paste(`${source}\nCâu 2: Câu thiếu đáp án\nA. Một\nB. Hai`);
  await click("Đưa vào trình soạn");
  expect(calls[0].questions).toHaveLength(2);
  const incomplete = calls[0].questions[1];
  expect(incomplete.correctIndex).toBeNull();
  expect(calls[0].notes[incomplete.id].source).toContain("Câu thiếu đáp án");
});

it("retains ambiguous parser warnings and the source instead of silently accepting them", async () => {
  const { calls } = await render();
  await paste("Câu 1: Chọn số hai\nA. Một\nB. Hai\nĐáp án: B. Không khớp");
  await click("Đưa vào trình soạn");
  const question = calls[0].questions[0];
  expect(calls[0].notes[question.id].issues).toContain("Ký hiệu và nội dung đáp án đúng không khớp nhau.");
});

it("requires confirmation to replace and cancelling keeps both the source and current editor", async () => {
  const { calls } = await render(false);
  await paste(source);
  await act(async () => document.querySelectorAll<HTMLInputElement>('input[name="import-apply"]')[1].click());
  await click("Đưa vào trình soạn");
  expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain("Thay thế 1 câu đang soạn?");
  expect(calls).toHaveLength(0);
  await click("Quay lại", document.querySelector('[role="alertdialog"]')!);
  expect(document.querySelector<HTMLTextAreaElement>("#quiz-import-source")?.value).toBe(source);
  await click("Hủy nhập");
  await click("Hủy nhập", document.querySelector('[role="alertdialog"]')!);
  expect(calls).toHaveLength(0);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it("replaces only after explicit confirmation", async () => {
  const { calls } = await render(false);
  await paste(source);
  await act(async () => document.querySelectorAll<HTMLInputElement>('input[name="import-apply"]')[1].click());
  await click("Đưa vào trình soạn");
  await click("Thay thế câu hỏi", document.querySelector('[role="alertdialog"]')!);
  expect(calls[0].replace).toBe(true);
});

it("loads a file directly into the main editor with no second apply or preview popup", async () => {
  const extraction = spyOn(quizService, "extractDocument").mockResolvedValue({ fileName: "quiz.docx", text: source });
  restore = () => extraction.mockRestore();
  const { calls } = await render();
  await click("Tải tài liệu");
  await selectFile(new File(["fixture"], "quiz.docx"));
  expect(extraction).toHaveBeenCalledTimes(1);
  expect(calls[0].questions[0].options).toEqual(["Lê Lợi"]);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it("appends to existing questions by default", async () => {
  const { calls } = await render(false);
  await paste(source);
  await click("Đưa vào trình soạn");
  expect(calls[0].replace).toBe(false);
});

it("shows an unreadable file source for correction without mutating the editor", async () => {
  const extraction = spyOn(quizService, "extractDocument").mockResolvedValue({ fileName: "quiz.docx", text: "Một đoạn bài học chưa có câu hỏi" });
  restore = () => extraction.mockRestore();
  const { calls } = await render();
  await click("Tải tài liệu");
  await selectFile(new File(["fixture"], "quiz.docx"));
  expect(calls).toHaveLength(0);
  expect(document.querySelector<HTMLTextAreaElement>("#quiz-import-source")?.value).toContain("Một đoạn bài học");
  expect(document.querySelector('[role="alert"]')?.textContent).toContain("Chưa tìm thấy câu hỏi");
});

it("does not silently discard text before the first question", async () => {
  const { calls } = await render();
  await paste(`Tiêu đề dư\n${source}`);
  await click("Đưa vào trình soạn");
  expect(calls).toHaveLength(0);
  expect(document.querySelector('[role="alert"]')?.textContent).toContain("Có nội dung trước");
});

it("enforces limits without a permanent character counter or truncation", async () => {
  const { calls } = await render();
  await paste(source + "x".repeat(200_001));
  await click("Đưa vào trình soạn");
  expect(calls).toHaveLength(0);
  expect(document.querySelector('[role="alert"]')?.textContent).toContain("vượt quá");
});

it("blocks an append that would exceed the editor limit", async () => {
  const { calls } = await render(false, 100);
  await paste(source);
  await click("Đưa vào trình soạn");
  expect(calls).toHaveLength(0);
  expect(document.querySelector('[role="alert"]')?.textContent).toContain("101");
});

it("rejects unsupported and oversized documents before calling extraction", async () => {
  const extraction = spyOn(quizService, "extractDocument");
  restore = () => extraction.mockRestore();
  const { calls } = await render();
  await click("Tải tài liệu");
  await selectFile(new File(["legacy"], "quiz.doc"));
  expect(document.querySelector('[role="alert"]')?.textContent).toContain("lưu .doc thành .docx");
  await selectFile(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.pdf"));
  expect(document.querySelector('[role="alert"]')?.textContent).toContain("5 MB");
  expect(extraction).not.toHaveBeenCalled();
  expect(calls).toHaveLength(0);
});

it("can cancel an ongoing upload without applying a late response", async () => {
  let resolve: (result: { fileName: string; text: string }) => void = () => {};
  let signal: AbortSignal | undefined;
  const extraction = spyOn(quizService, "extractDocument").mockImplementation((_file, inputSignal) => {
    signal = inputSignal;
    return new Promise(result => { resolve = result; });
  });
  restore = () => extraction.mockRestore();
  const { calls } = await render();
  await click("Tải tài liệu");
  await selectFile(new File(["fixture"], "quiz.docx"));
  await click("Hủy nhập");
  await click("Hủy nhập", document.querySelector('[role="alertdialog"]')!);
  await act(async () => resolve({ fileName: "quiz.docx", text: source }));
  expect(signal?.aborted).toBe(true);
  expect(calls).toHaveLength(0);
});
