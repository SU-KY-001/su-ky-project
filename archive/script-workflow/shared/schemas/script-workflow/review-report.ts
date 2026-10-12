import { z } from "zod";

export const CLAIM_VERIFICATION_STATUSES = [
  "VERIFIED",
  "UNSUPPORTED_SPECULATION",
  "CONTRADICTION",
] as const;

export const OralLintErrorSchema = z.object({
  kind: z.enum(["HYPHEN", "COLON", "PARENTHESIS", "FRAGMENT", "OTHER"]),
  detail: z.string(),
  excerpt: z.string().optional(),
});

export const ClaimVerificationItemSchema = z.object({
  scriptSentence: z.string(),
  matchedFactCardId: z.string().optional(),
  status: z.enum(CLAIM_VERIFICATION_STATUSES),
  explanation: z.string(),
});

export const CoreFactCoverageItemSchema = z.object({
  factCardId: z.string(),
  claim: z.string(),
  usedInScript: z.boolean(),
});

/**
 * Phần Fact Checker THỰC SỰ kiểm tra được: chỉ khớp sự thật.
 * Lỗi punctuation (colon/dash/parenthesis/fragment) do code tất định điền —
 * xem apps/api/src/workflow/oral-linter.ts. Không giao cho LLM.
 */
export const FactCheckerOutputSchema = z.object({
  overallScore: z.number().min(0).max(100),
  claimVerification: z.array(ClaimVerificationItemSchema),
  coreFactCoverage: z.array(CoreFactCoverageItemSchema),
  moderatorSummaryFeedback: z.string(),
});

/**
 * Output cuối của bước FACT_CHECKER = kết quả agent + kết quả linter tất định
 * (job ghép lại trước khi insert, nên vẫn là một ReviewReport duy nhất).
 */
export const ReviewReportSchema = z.object({
  passed: z.boolean(),
  overallScore: z.number().min(0).max(100),
  oralLinter: z.object({
    hasForbiddenHyphens: z.boolean(),
    hasForbiddenColons: z.boolean(),
    hasForbiddenParentheses: z.boolean(),
    hasFragmentedSentences: z.boolean(),
    errorDetails: z.array(z.string()),
  }),
  claimVerification: z.array(ClaimVerificationItemSchema),
  moderatorSummaryFeedback: z.string(),
});

export type OralLintError = z.infer<typeof OralLintErrorSchema>;
export type ClaimVerificationItem = z.infer<typeof ClaimVerificationItemSchema>;
export type CoreFactCoverageItem = z.infer<typeof CoreFactCoverageItemSchema>;
export type FactCheckerOutput = z.infer<typeof FactCheckerOutputSchema>;
export type ReviewReport = z.infer<typeof ReviewReportSchema>;
