import { describe, expect, it } from "bun:test";
import { parseQuizDocument, toReadyQuizQuestions, type QuizImportPreview } from "@repo/shared";

function parse(text: string): QuizImportPreview {
  return parseQuizDocument({ fileName: "quiz.md", format: "md", blocks: text.split("\n").map((text, i) => ({ text, line: i + 1, page: null })) }, 20);
}
describe("structured quiz import", () => {
  it("reads mixed types with title, inline choices and accepted answers", () => {
    const r = parse("BỘ CÂU HỎI ÔN TẬP\nCâu 1: Hai cộng hai?\nA. Ba    B. Bốn\nĐáp án: B\nCâu 2: Chọn số\nLoại: Chọn nhiều\nA. Hai\nB. Ba\nĐáp án: A, B\nCâu 3: Địa danh?\nLoại: Điền đáp án\nĐáp án: Lam Sơn, Thanh Hóa\nChấp nhận thêm: Lam Sơn");
    expect(r.status).toBe("ready");
    expect(r.summary).toMatchObject({ total: 3, valid: 3, invalid: 0, single: 1, multiple: 1, text: 1 });
    expect(toReadyQuizQuestions(r).map(q => q.kind)).toEqual(["SINGLE", "MULTIPLE", "TEXT"]);
    expect(r.questions[2].options).toEqual(["Lam Sơn, Thanh Hóa", "Lam Sơn"]);
  });
  it("reads a separate answer key without inventing questions", () => {
    const r = parse("Câu 1: Một?\nA. A1\nB. B1\nCâu 2: Hai?\nA. A2\nB. B2\nBẢNG ĐÁP ÁN\n1. A\n2. B");
    expect(r.status).toBe("ready"); expect(r.questions).toHaveLength(2);
    expect(r.questions.map(q => q.correctIndex)).toEqual([0, 1]);
  });
  it("links restarted numbering using explicit sections", () => {
    const r = parse("Phần I\nCâu 1: Một?\nA. A1\nB. B1\nPhần II\nCâu 1: Hai?\nA. A2\nB. B2\nBẢNG ĐÁP ÁN\nPhần I\n1. A\nPhần II\n1. B");
    expect(r.status).toBe("ready"); expect(r.questions.map(q => q.correctIndex)).toEqual([0, 1]);
  });
  it.each([
    ["missing", "Câu 1: Hỏi?\nA. Một\nB. Hai"],
    ["kind conflict", "Câu 1: Hỏi?\nLoại: Chọn một\nA. Một\nB. Hai\nĐáp án: A, B"],
    ["unknown kind", "Câu 1: Hỏi?\nLoại: Ghép cặp\nĐáp án: A"],
    ["unknown choice", "Câu 1: Hỏi?\nA. Một\nB. Hai\nĐáp án: D"],
    ["duplicate question", "Câu 1: Hỏi?\nĐáp án: Có\nCâu 2: Hỏi?\nĐáp án: Có"],
    ["duplicate labels", "Câu 1: Hỏi?\nA. Một\nA. Hai\nĐáp án: A"],
    ["image", "Câu 1: Xem hình dưới đây\nĐáp án: Có"],
    ["conflicting key", "Câu 1: Hỏi?\nA. Một\nB. Hai\nĐáp án: A\nĐÁP ÁN\n1. B"],
    ["unparsed source", "Câu 1: Hỏi?\nĐáp án: Có\nGHI CHÚ KHÔNG XÁC ĐỊNH"],
  ])("blocks %s without losing the source", (_name, text) => {
    const r = parse(text); expect(r.status).toBe("needs_correction");
    expect(r.diagnostics.some(d => d.severity === "error")).toBe(true);
    expect(() => toReadyQuizQuestions(r)).toThrow();
    expect(r.diagnostics.every(d => d.suggestion.length > 0)).toBe(true);
  });
  it("rejects ambiguous answer keys and keeps orphan key lines", () => {
    const r = parse("Phần I\nCâu 1: Một?\nA. Một\nB. Hai\nPhần II\nCâu 1: Hai?\nA. Ba\nB. Bốn\nBẢNG ĐÁP ÁN\n1. A\n99. B");
    expect(r.status).toBe("needs_correction"); expect(r.questions).toHaveLength(2);
    expect(r.unparsedRegions.length).toBeGreaterThan(0);
  });
  it("keeps source pages/lines and flags gaps and field limits", () => {
    const r = parseQuizDocument({ fileName: "q.pdf", format: "pdf", blocks: [{ text: "Câu 1: Hỏi?\nĐáp án: Có", page: 2, line: null }, { text: `Câu 3: ${"x".repeat(2001)}\nĐáp án: Không`, page: 3, line: null }] }, 20);
    expect(r.questions[0].source.pageStart).toBe(2);
    expect(r.status).toBe("needs_correction");
    expect(r.diagnostics.some(d => d.code === "NUMBER_GAP")).toBe(true);
  });
  it("does not claim to validate factual correctness", () => {
    expect(parse("Câu 1: Hai cộng hai?\nA. Ba\nB. Bốn\nĐáp án: A").status).toBe("ready");
  });
  it("reports invalid source numbers and extreme numeric fields without breaking the response schema", () => {
    const r = parse(`Câu 0: Hỏi?\nĐáp án: Có\nThời gian: ${"9".repeat(400)}`);
    expect(r.status).toBe("needs_correction"); expect(Number.isFinite(r.questions[0].timeLimit)).toBe(true);
  });
  it("blocks extracted image markers wherever they appear", () => {
    expect(parse("Câu 1: Hỏi?\nĐáp án: Có\nGiải thích: Căn cứ\n[Hình ảnh chưa được hỗ trợ]").status).toBe("needs_correction");
  });
  it("preserves question data before inline options instead of dropping it", () => {
    const r = parse("Câu 1: Hỏi?\nDữ kiện quan trọng    A. Một    B. Hai\nĐáp án: A");
    expect(r.status).toBe("ready"); expect(r.questions[0].text).toBe("Hỏi?\nDữ kiện quan trọng");
  });
  it("blocks unmatched content before an answer-key entry", () => {
    const r = parse("Câu 1: Hỏi?\nA. Một\nB. Hai\nĐÁP ÁN\nGHI CHÚ QUAN TRỌNG    1. A");
    expect(r.status).toBe("needs_correction"); expect(r.unparsedRegions[0]?.excerpt).toContain("GHI CHÚ QUAN TRỌNG");
  });
  it("blocks an image marker inside the question heading", () => {
    expect(parse("Câu 1: [Hình ảnh chưa được hỗ trợ]\nĐáp án: Có").status).toBe("needs_correction");
  });
  it("explains the actual missing answer instead of listing unrelated possible problems", () => {
    const r = parse("Câu 1: Hỏi?\nA. Một\nB. Hai");
    expect(r.questions[0].diagnostics.map(d => d.message).join(" ")).toContain("Chưa có đáp án đúng");
  });
});
