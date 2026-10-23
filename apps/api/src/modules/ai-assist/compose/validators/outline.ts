import {
  OUTLINE_GOAL_MAX,
  OUTLINE_MAX_SECTIONS,
  OUTLINE_MIN_SECTIONS,
  OUTLINE_POINT_MAX,
  OUTLINE_POINTS_MAX,
  OUTLINE_TITLE_MAX,
  OUTLINE_WEIGHT_MAX,
  OUTLINE_WEIGHT_MIN,
  type OutlineSection,
} from "@repo/shared";
import { ComposeBadOutputError } from "../errors";
import type { OutlineOutput } from "../schemas/outline.schema";
import { cleanInline, cutAtWord, normalizeKey } from "./text";

export interface OutlineValidation {
  sections: OutlineSection[];
  /** Counts for the structured log (never content). */
  dropped: { noTitle: number; duplicateTitle: number; emptyPoints: number };
}

const clamp = (n: number, min: number, max: number): number => Math.min(max, Math.max(min, n));

/**
 * Splits `total` words by weight. Each part is rounded; the rounding remainder goes to the section with the largest
 * weight (the first one on a tie) so the sum is exactly `total`.
 */
export function distributeTargetWords(weights: number[], total: number): number[] {
  const sum = weights.reduce((a, b) => a + b, 0);
  if (sum === 0) return weights.map(() => 0);
  const parts = weights.map((w) => Math.round((total * w) / sum));
  const remainder = total - parts.reduce((a, b) => a + b, 0);
  const largest = weights.indexOf(Math.max(...weights));
  parts[largest] = parts[largest]! + remainder;
  return parts;
}

/** spec-prompts-compose.md 2.4. Throws ComposeBadOutputError when the section count falls outside [MIN, MAX]. */
export function validateOutline(output: OutlineOutput, targetWords: number, newId: () => string): OutlineValidation {
  const dropped = { noTitle: 0, duplicateTitle: 0, emptyPoints: 0 };
  const seen = new Set<string>();
  const kept: Array<Omit<OutlineSection, "id" | "targetWords">> = [];

  for (const raw of output.sections) {
    const title = cutAtWord(cleanInline(raw.title), OUTLINE_TITLE_MAX);
    if (!title) {
      dropped.noTitle++;
      continue;
    }
    const key = normalizeKey(title);
    if (seen.has(key)) {
      dropped.duplicateTitle++;
      continue;
    }
    seen.add(key);
    const cleanedPoints = raw.points.map((p) => cutAtWord(cleanInline(p), OUTLINE_POINT_MAX));
    const points = cleanedPoints.filter((p) => p.length > 0);
    dropped.emptyPoints += cleanedPoints.length - points.length;
    kept.push({
      title,
      goal: cutAtWord(cleanInline(raw.goal), OUTLINE_GOAL_MAX),
      points: points.slice(0, OUTLINE_POINTS_MAX),
      weight: clamp(raw.weight, OUTLINE_WEIGHT_MIN, OUTLINE_WEIGHT_MAX),
    });
  }

  if (kept.length < OUTLINE_MIN_SECTIONS || kept.length > OUTLINE_MAX_SECTIONS) {
    throw new ComposeBadOutputError(`Outline has ${kept.length} sections after cleaning`, "SECTION_COUNT");
  }
  const words = distributeTargetWords(kept.map((s) => s.weight), targetWords);
  return { sections: kept.map((s, i) => ({ id: newId(), ...s, targetWords: words[i]! })), dropped };
}
