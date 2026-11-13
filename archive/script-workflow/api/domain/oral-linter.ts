import type { OralLintError } from "@repo/shared";

/**
 * Kiểm tra tất định cho văn nói TTS (Text-for-Ear).
 * Cố ý KHÔNG giao cho LLM: lỗi dấu câu phải là kết quả fail-fast, không phải lời phán.
 *
 * ponytail: ngưỡng là nút hiệu chỉnh, không phải luật cứng. Sửa ở đây khi
 * nghe thử TTS thấy linter báo sai.
 */
export const ORAL_LINT_THRESHOLDS = {
  /**
   * Câu dưới ngưỡng này bị coi là câu cụt (plan: câu ≤3 từ).
   * Không nâng lên 5: "Nước rút rất nhanh." là câu hợp lệ 4 từ, báo lỗi chỉ tốn
   * một vòng regenerate vô ích. Thà bỏ sót câu cụt hơn là chặn câu đúng.
   */
  minWordsPerSentence: 4,
} as const;

const BULLET_OR_DASH_RE = /(^|\n)\s*[-–—•]|\s[-–—]\s/;
const COLON_RE = /[:：]/;
const PAREN_RE = /[()（）]/;

/** Câu chào/kết hợp lệ dù rất ngắn — plan liệt kê sẵn, đừng bắt agent viết dài ra. */
const GREETING_RE = /^(chào|cảm ơn|xin chào|kính chào|hết tập)\b/i;

function splitSentences(text: string): string[] {
  return text
    .split(/[.!?…]+|\n+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function countWords(text: string): number {
  return text.split(/\s+/).filter((w) => w.length > 0).length;
}

export interface OralLintResult {
  passed: boolean;
  hasForbiddenHyphens: boolean;
  hasForbiddenColons: boolean;
  hasForbiddenParentheses: boolean;
  hasFragmentedSentences: boolean;
  errorDetails: string[];
  detailErrors: OralLintError[];
  sentences: number;
  words: number;
}

export function lintOralText(rawText: string): OralLintResult {
  const text = rawText ?? "";
  const sentences = splitSentences(text);
  const words = countWords(text);

  const hasForbiddenHyphens = BULLET_OR_DASH_RE.test(text);
  const hasForbiddenColons = COLON_RE.test(text);
  const hasForbiddenParentheses = PAREN_RE.test(text);

  const fragments = sentences.filter(
    (sentence) =>
      countWords(sentence) < ORAL_LINT_THRESHOLDS.minWordsPerSentence && !GREETING_RE.test(sentence)
  );
  const hasFragmentedSentences = fragments.length > 0;

  const errorDetails: string[] = [];
  const detailErrors: OralLintError[] = [];

  if (hasForbiddenHyphens) {
    const excerpt = text.match(new RegExp(BULLET_OR_DASH_RE.source))?.[0]?.trim() ?? "-";
    errorDetails.push("Văn nói còn gạch đầu dòng hoặc gạch ngang giữa câu.");
    detailErrors.push({ kind: "HYPHEN", detail: "Gạch đầu dòng/gạch ngang bị cấm trong lời đọc.", excerpt });
  }
  if (hasForbiddenColons) {
    errorDetails.push('Văn nói còn dấu hai chấm. Thay bằng "đó là" hoặc "gồm có".');
    detailErrors.push({ kind: "COLON", detail: "Dấu hai chấm bị cấm trong lời đọc.", excerpt: ":" });
  }
  if (hasForbiddenParentheses) {
    errorDetails.push("Văn nói còn dấu ngoặc đơn.");
    detailErrors.push({ kind: "PARENTHESIS", detail: "Dấu ngoặc đơn bị cấm trong lời đọc." });
  }
  if (hasFragmentedSentences) {
    errorDetails.push(
      `Có ${fragments.length} câu cụt dưới ${ORAL_LINT_THRESHOLDS.minWordsPerSentence} từ.`
    );
    for (const fragment of fragments.slice(0, 5)) {
      detailErrors.push({ kind: "FRAGMENT", detail: "Câu cụt, cần diễn đạt trọn vẹn hơn.", excerpt: fragment });
    }
  }

  return {
    passed: errorDetails.length === 0,
    hasForbiddenHyphens,
    hasForbiddenColons,
    hasForbiddenParentheses,
    hasFragmentedSentences,
    errorDetails,
    detailErrors,
    sentences: sentences.length,
    words,
  };
}

/** Ghép kết quả linter tất định vào lỗi báo về cho agent khi regenerate. */
export function describeLintFailure(result: OralLintResult): string {
  return result.errorDetails.join(" ");
}
