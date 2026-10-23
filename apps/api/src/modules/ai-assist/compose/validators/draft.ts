import type { DraftSectionResponse } from "@repo/shared";
import { DRAFT_LENGTH_TOLERANCE_PCT } from "../constants";
import { ComposeBadOutputError } from "../errors";
import { cleanProse, countWords, novelNumbers } from "./text";

export type LengthStatus = DraftSectionResponse["lengthStatus"];

export type DraftValidation = Omit<DraftSectionResponse, "promptVersion">;

export interface DraftValidationArgs {
  text: string;
  targetWords: number;
  remainingChars?: number;
  /** Everything the model was shown (topic, outline, sources, episode): digits outside it are "new". */
  reference: string;
}

/** SHORT below target x (1 - tol), LONG above target x (1 + tol); information for the UI, never blocks. */
export function lengthStatus(wordCount: number, targetWords: number, tolerancePct = DRAFT_LENGTH_TOLERANCE_PCT): LengthStatus {
  const tol = tolerancePct / 100;
  if (wordCount < targetWords * (1 - tol)) return "SHORT";
  if (wordCount > targetWords * (1 + tol)) return "LONG";
  return "OK";
}

/** spec-prompts-compose.md 4.4. Throws ComposeBadOutputError when nothing is left after cleaning. */
export function validateDraft(args: DraftValidationArgs): DraftValidation {
  const { paragraphs, cleaned } = cleanProse(args.text);
  if (paragraphs.length === 0) throw new ComposeBadOutputError("Draft is empty after cleaning", "EMPTY_TEXT");
  const joined = paragraphs.join("\n\n");
  const wordCount = countWords(joined);
  const chars = paragraphs.reduce((sum, p) => sum + p.length, 0);
  return {
    paragraphs,
    wordCount,
    lengthStatus: lengthStatus(wordCount, args.targetWords),
    exceedsLimit: args.remainingChars !== undefined && chars > args.remainingChars,
    cleaned,
    novelNumbers: novelNumbers(joined, args.reference),
  };
}
