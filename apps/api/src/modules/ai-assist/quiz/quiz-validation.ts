import { z } from "zod";
import { DomainError } from "../../../core/errors/domain-error";

export const GeneratedQuestionSchema = z.object({
  text: z.string().trim().min(10).max(2000), options: z.array(z.string().trim().min(1).max(1000)).length(4),
  correctIndex: z.number().int().min(0).max(3), explanation: z.string().trim().min(10).max(4000),
  quote: z.string().trim().min(12).max(4000),
});
export const QuizModelOutputSchema = z.object({ questions: z.array(GeneratedQuestionSchema).min(1).max(10) });
const normalize = (s: string): string => s.normalize("NFC").toLocaleLowerCase("vi").replace(/\s+/g, " ").trim();
const quoteText = (s: string): string => s.normalize("NFC").replace(/\s+/g, " ").trim();

export function validateGeneratedQuiz(questions: z.infer<typeof GeneratedQuestionSchema>[], script: string, count: number, exclude: string[]): z.infer<typeof GeneratedQuestionSchema>[] {
  const seen = new Set(exclude.map(normalize));
  if (questions.length !== count) throw new DomainError(422, "VALIDATION_ERROR", "Kịch bản chưa tạo đủ câu hỏi hợp lệ. Hãy giảm số câu hoặc bổ sung nội dung.");
  for (const q of questions) {
    if (!quoteText(script).includes(quoteText(q.quote)) || seen.has(normalize(q.text)) || new Set(q.options.map(normalize)).size !== 4)
      throw new DomainError(422, "VALIDATION_ERROR", "Câu hỏi bị trùng, đáp án trùng hoặc căn cứ không khớp kịch bản. Vui lòng tạo lại.");
    seen.add(normalize(q.text));
  }
  return questions;
}
