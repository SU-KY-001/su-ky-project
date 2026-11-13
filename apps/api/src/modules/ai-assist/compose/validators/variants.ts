import type { RewriteResponse } from "@repo/shared";
import { REWRITE_MAX_LENGTH_RATIO, REWRITE_MIN_LENGTH_RATIO } from "../constants";
import type { RewriteOutput } from "../schemas/rewrite.schema";
import { cleanProse, normalizeKey, novelNumbers } from "./text";

export type RewriteVariant = RewriteResponse["variants"][number];

export interface VariantsValidation {
  variants: RewriteVariant[];
  /** Counts for the structured log (never content). */
  dropped: { empty: number; identical: number; duplicate: number; ratio: number };
}

/** spec-prompts-compose.md 5.4. Returning zero variants is the caller's decision (502 AI_NO_VARIANTS). */
export function validateVariants(args: {
  output: RewriteOutput;
  original: string;
  count: number;
  newId: () => string;
}): VariantsValidation {
  const dropped = { empty: 0, identical: 0, duplicate: 0, ratio: 0 };
  const originalKey = normalizeKey(args.original);
  const originalLength = args.original.trim().length;
  const seen = new Set<string>([originalKey]);
  const variants: RewriteVariant[] = [];

  for (const raw of args.output.variants) {
    const { paragraphs } = cleanProse(raw.text);
    if (paragraphs.length === 0) {
      dropped.empty++;
      continue;
    }
    const joined = paragraphs.join("\n\n");
    const key = normalizeKey(joined);
    if (key === originalKey) {
      dropped.identical++;
      continue;
    }
    if (seen.has(key)) {
      dropped.duplicate++;
      continue;
    }
    const ratio = originalLength > 0 ? joined.length / originalLength : 1;
    if (ratio < REWRITE_MIN_LENGTH_RATIO || ratio > REWRITE_MAX_LENGTH_RATIO) {
      dropped.ratio++;
      continue;
    }
    seen.add(key);
    variants.push({ id: args.newId(), paragraphs, novelNumbers: novelNumbers(joined, args.original) });
  }
  return { variants: variants.slice(0, args.count), dropped };
}
