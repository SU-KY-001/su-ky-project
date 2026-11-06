import { afterEach, expect, it, spyOn } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { QuizDraftQuestion } from "@repo/shared";
import { QuizTextImport } from "./QuizTextImport";
import { quizService } from "../services/quizService";

let root: Root | undefined;
let restore: (() => void) | undefined;
afterEach(() => {
  act(() => root?.unmount());
  restore?.();
  restore = undefined;
  document.body.innerHTML = "";
});
const source = "Câu 1: Ai lãnh đạo khởi nghĩa Lam Sơn?\nĐáp án: Lê Lợi";
function button(
  text: string,
  container: ParentNode = document,
): HTMLButtonElement {
  const result = [...container.querySelectorAll("button")].find(
    (node) => node.textContent?.trim() === text,
  );
  if (!result) throw new Error(`Missing button: ${text}`);
  return result;
}
async function click(
  text: string,
  container: ParentNode = document,
): Promise<void> {
  await act(async () => button(text, container).click());
}
async function paste(text: string): Promise<void> {
  const textarea = document.querySelector<HTMLTextAreaElement>(
    "#quiz-import-source",
  )!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLTextAreaElement.prototype,
      "value",
    )!.set!.call(textarea, text);
    textarea.dispatchEvent(new Event("input", { bubbles: true }));
  });
}
async function render(
  empty = true,
): Promise<{ calls: { questions: QuizDraftQuestion[]; replace: boolean }[] }> {
  const calls: { questions: QuizDraftQuestion[]; replace: boolean }[] = [];
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root?.render(
      <QuizTextImport
        count={1}
        empty={empty}
        defaultTime={60}
        onApply={(questions, replace) => calls.push({ questions, replace })}
      />,
    ),
  );
  await click("Nhập câu hỏi");
  return { calls };
}

it("reviews before applying and replaces only the empty placeholder without saving", async () => {
  const { calls } = await render();
  await paste(source);
  expect(calls).toHaveLength(0);
  await click("Đọc câu hỏi");
  expect(document.querySelector("mark")?.textContent).toContain("Lê Lợi");
  expect(calls).toHaveLength(0);
  await click("Đưa 1 câu vào trình soạn");
  expect(calls).toHaveLength(1);
  expect(calls[0].replace).toBe(true);
  expect(calls[0].questions[0]).toMatchObject({
    kind: "TEXT",
    options: ["Lê Lợi"],
    timeLimit: 60,
  });
  expect(document.querySelector('[role="dialog"]')).toBeNull();
  expect(document.querySelector('[role="alertdialog"]')).toBeNull();
});

it("never silently skips invalid questions and allows explicitly excluding one", async () => {
  const { calls } = await render();
  await paste(`${source}\n\nCâu 2: Câu thiếu đáp án\nA. Một\nB. Hai`);
  await click("Đọc câu hỏi");
  expect(button("Đưa 2 câu vào trình soạn").disabled).toBe(true);
  expect(document.body.textContent).toContain("Chưa có đáp án đúng");
  const cards = document.querySelectorAll("article");
  await click("Bỏ câu này", cards[1]);
  await click("Đưa 1 câu vào trình soạn");
  expect(calls[0].questions).toHaveLength(1);
});

it("lets the reviewer fix a missing correct answer in place", async () => {
  const { calls } = await render();
  await paste("Câu 1: Chọn số hai\nA. Một\nB. Hai");
  await click("Đọc câu hỏi");
  await click("Chỉnh sửa");
  await act(async () =>
    document
      .querySelector<HTMLInputElement>('[aria-label="Đáp án B đúng"]')!
      .click(),
  );
  await click("Xác nhận bản đã sửa");
  expect(button("Đưa 1 câu vào trình soạn").disabled).toBe(false);
  await click("Đưa 1 câu vào trình soạn");
  expect(calls[0].questions[0].correctIndex).toBe(1);
});

it("requires confirmation to replace existing questions and cancel preserves the editor", async () => {
  const { calls } = await render(false);
  await paste(source);
  await click("Đọc câu hỏi");
  await act(async () =>
    document
      .querySelectorAll<HTMLInputElement>('input[name="import-apply"]')[1]
      .click(),
  );
  await click("Đưa 1 câu vào trình soạn");
  expect(document.querySelector('[role="alertdialog"]')?.textContent).toContain(
    "Thay thế 1 câu đang soạn?",
  );
  expect(calls).toHaveLength(0);
  await click("Quay lại", document.querySelector('[role="alertdialog"]')!);
  await click("Hủy nhập");
  await click("Hủy nhập", document.querySelector('[role="alertdialog"]')!);
  expect(calls).toHaveLength(0);
  expect(document.querySelector('[role="dialog"]')).toBeNull();
});

it("loads a document into editable source and still requires review and apply", async () => {
  const extraction = spyOn(quizService, "extractDocument").mockResolvedValue({
    fileName: "quiz.docx",
    text: source,
  });
  restore = () => extraction.mockRestore();
  const { calls } = await render();
  await click("Tải tài liệu");
  const fileInput =
    document.querySelector<HTMLInputElement>('input[type="file"]')!;
  await act(async () => {
    Object.defineProperty(fileInput, "files", {
      configurable: true,
      value: [new File(["fixture"], "quiz.docx")],
    });
    fileInput.dispatchEvent(new Event("change", { bubbles: true }));
  });
  expect(
    document.querySelector<HTMLTextAreaElement>("#quiz-import-source")?.value,
  ).toBe(source);
  expect(extraction).toHaveBeenCalledTimes(1);
  expect(calls).toHaveLength(0);
});

it("appends to existing questions by default instead of replacing them", async () => {
  const { calls } = await render(false);
  await paste(source);
  await click("Đọc câu hỏi");
  await click("Đưa 1 câu vào trình soạn");
  expect(calls[0].replace).toBe(false);
});

it("warns before reparsing would reset explicit review changes", async () => {
  await render();
  await paste(`${source}\nCâu 2: Câu khác\nĐáp án: Hai`);
  await click("Đọc câu hỏi");
  await click("Bỏ câu này", document.querySelectorAll("article")[1]);
  await click("Sửa văn bản nguồn");
  await click("Đọc lại câu hỏi");
  const confirmation = document.querySelector('[role="alertdialog"]')!;
  expect(confirmation.textContent).toContain("Đọc lại văn bản nguồn?");
  await click("Quay lại", confirmation);
  expect(document.querySelector("#quiz-import-source")).not.toBeNull();
});
