import { describe, expect, it } from "bun:test";
import { QuizDraftDataSchema, validateReadyQuiz } from "@repo/shared";

const question = {
  id: "q1", text: "Chiến dịch kéo dài bao nhiêu ngày?", explanation: "Kịch bản nêu 56 ngày đêm.",
  timeLimit: 20, correctIndex: 2,
  options: ["36 ngày", "46 ngày", "56 ngày", "66 ngày"],
  evidence: { quote: "Chiến dịch kéo dài 56 ngày đêm.", scriptHash: "abc" },
};
const data = { title: "Ôn tập", description: "", passScorePercent: 80, questions: [question] };

describe("quiz authoring contracts", () => {
  it("saves incomplete drafts but rejects activation", () => {
    const draft = QuizDraftDataSchema.parse({ ...data, questions: [{ ...question, text: "", correctIndex: null, options: ["", "", "", ""] }] });
    expect(draft.questions).toHaveLength(1);
    expect(() => validateReadyQuiz(draft)).toThrow();
  });
  it("rejects duplicate answers and missing correct answer", () => {
    expect(() => validateReadyQuiz({ ...data, questions: [{ ...question, options: ["A", " a ", "C", "D"] }] })).toThrow();
    expect(() => validateReadyQuiz({ ...data, questions: [{ ...question, correctIndex: null }] })).toThrow();
    expect(validateReadyQuiz(data).questions[0].options.filter(o => o.isCorrect)).toHaveLength(1);
    const fiveOptions = validateReadyQuiz({ ...data, questions: [{ ...question, options: ["A", "B", "C", "D", "E"], correctIndex: 4 }] });
    expect(fiveOptions.questions[0].options.map(option => option.label)).toEqual(["A", "B", "C", "D", "E"]);
    expect(fiveOptions.questions[0].options[4].isCorrect).toBe(true);
    expect(() => validateReadyQuiz({ ...data, questions: [{ ...question, options: ["A", "B"], correctIndex: 3 }] })).toThrow();
  });
  it("validates multi-select and accepted short answers without changing legacy questions", () => {
    const multiple = { ...question, id: "q2", kind: "MULTIPLE" as const, correctIndex: null, correctIndexes: [0, 2] };
    const text = { ...question, id: "q3", kind: "TEXT" as const, correctIndex: null, options: ["Nguyễn Huệ", "Quang Trung"] };
    const ready = validateReadyQuiz({ ...data, questions: [question, multiple, text] });
    expect(ready.questions.map(q => q.options.filter(o => o.isCorrect).length)).toEqual([1, 2, 2]);
    expect(() => validateReadyQuiz({ ...data, questions: [{ ...multiple, correctIndexes: [] }] })).toThrow();
    expect(() => validateReadyQuiz({ ...data, questions: [{ ...text, options: ["Quang Trung", " quang trung "] }] })).toThrow();
  });
});
