import { describe, expect, it } from "bun:test";
import { importQuestionIssues, parseQuizText } from "./quizTextImport";
import { QUIZ_IMPORT_TEMPLATE } from "./quizImportTemplate";

describe("quiz text import", () => {
  it("recognizes mixed question types and uses the editor time when omitted", () => {
    const result = parseQuizText(QUIZ_IMPORT_TEMPLATE, 60);
    expect(result.issues).toEqual([]);
    expect(result.items.map((item) => item.question.kind)).toEqual([
      "SINGLE",
      "MULTIPLE",
      "TEXT",
      "TEXT",
    ]);
    expect(
      result.items.map((item) => [
        ...item.issues,
        ...importQuestionIssues(item.question),
      ]),
    ).toEqual([[], [], [], []]);
    expect(result.items[0].question.timeLimit).toBe(30);
    expect(result.items[1].question.timeLimit).toBe(60);
    expect(result.items[1].question.correctIndexes).toEqual([0, 2]);
  });
  it("reads Word bullets, wrapped options, full answer labels and source ranges", () => {
    const result = parseQuizText(
      "Câu 1: Câu thứ nhất?\n • A. Đáp án dài\nxuống dòng\n • B. Đáp án hai\nĐáp án đúng: B. Đáp án hai\n\nCâu 2. Câu tiếp?\nA) Đúng\nB) Sai\nĐáp án: A",
    );
    expect(result.items).toHaveLength(2);
    expect(result.items[0].question.options).toEqual([
      "Đáp án dài\nxuống dòng",
      "Đáp án hai",
    ]);
    expect(result.items[0].question.correctIndex).toBe(1);
    expect(result.items[0].inferred).toBe(true);
    expect(result.items[1].startLine).toBe(7);
    expect(
      result.items.flatMap((item) => [
        ...item.issues,
        ...importQuestionIssues(item.question),
      ]),
    ).toEqual([]);
  });
  it("keeps comma-containing text answers intact", () => {
    const result = parseQuizText(
      "1. Điền địa danh\nLoại: Điền đáp án\nĐáp án: Lam Sơn, Thanh Hóa\nChấp nhận thêm: Lam Sơn\nGiải thích: Địa danh trong tập.",
    );
    expect(result.items[0].question.options).toEqual([
      "Lam Sơn, Thanh Hóa",
      "Lam Sơn",
    ]);
    expect(result.items[0].issues).toEqual([]);
  });
  it("requires correction for missing answers, type conflicts and unknown options", () => {
    const result = parseQuizText(
      "Câu 1: Thiếu đáp án\nA. Một\nB. Hai\nCâu 2: Mâu thuẫn\nLoại: Chọn một\nA. Một\nB. Hai\nĐáp án: A, B\nCâu 3: Sai nhãn\nA. Một\nB. Hai\nĐáp án: E",
    );
    expect(result.items).toHaveLength(3);
    expect(
      result.items.every(
        (item) =>
          [...item.issues, ...importQuestionIssues(item.question)].length > 0,
      ),
    ).toBe(true);
  });
  it("flags duplicate labels, conflicting answer text and unknown type rather than guessing", () => {
    const result = parseQuizText(
      "Câu 1: Hỏi?\nLoại: Ghép cặp\nA. Một\nA. Hai\nĐáp án: A. Sai nội dung",
    );
    expect(result.items[0].issues.length).toBeGreaterThanOrEqual(3);
  });
  it("does not discard a preamble or invent questions from prose", () => {
    expect(parseQuizText("Bài học lịch sử không có câu hỏi").items).toEqual([]);
    expect(
      parseQuizText("Tiêu đề tài liệu\nCâu 1: Hỏi?\nĐáp án: Nội dung").issues,
    ).toHaveLength(1);
  });
});
