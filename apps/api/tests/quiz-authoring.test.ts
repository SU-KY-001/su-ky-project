import { describe, expect, it } from "bun:test";
import { QuizDraftDataSchema, GenerateQuizSchema, validateReadyQuiz } from "@repo/shared";
import { validateGeneratedQuiz } from "../src/modules/ai-assist/quiz/quiz-validation";

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
  });
  it("only accepts a full generation of 5–10 or one regeneration", () => {
    expect(GenerateQuizSchema.safeParse({ count: 4 }).success).toBe(false);
    expect(GenerateQuizSchema.safeParse({ count: 5, scriptHash: "abc" }).success).toBe(true);
    expect(GenerateQuizSchema.safeParse({ count: 1, scriptHash: "abc", exclude: [question.text] }).success).toBe(true);
    expect(GenerateQuizSchema.safeParse({ count: 11 }).success).toBe(false);
  });
});

describe("generated quiz validation", () => {
  const script = "Chiến dịch kéo dài 56 ngày đêm. Quân ta giành thắng lợi.";
  const generated = { text: question.text, options: question.options, correctIndex: 2, explanation: question.explanation, quote: question.evidence.quote };
  it("keeps source-backed questions and rejects invented evidence", () => {
    expect(validateGeneratedQuiz([generated], script, 1, []).length).toBe(1);
    expect(() => validateGeneratedQuiz([{ ...generated, quote: "Một sự kiện không có trong kịch bản." }], script, 1, [])).toThrow();
    expect(() => validateGeneratedQuiz([{ ...generated, quote: generated.quote.toLocaleLowerCase("vi") }], script, 1, [])).toThrow();
  });
  it("rejects repeated questions, exclusions and wrong count", () => {
    expect(() => validateGeneratedQuiz([generated, generated], script, 2, [])).toThrow();
    expect(() => validateGeneratedQuiz([generated], script, 1, [generated.text])).toThrow();
    expect(() => validateGeneratedQuiz([generated], script, 5, [])).toThrow();
  });
});
