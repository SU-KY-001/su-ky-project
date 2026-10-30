import { z } from "zod";
import { OUTLINE_MAX_SECTIONS, OUTLINE_MAX_WORDS, OUTLINE_MIN_WORDS, OUTLINE_POINTS_MAX, OutlineSectionSchema, type OutlineSection } from "@repo/shared";

export const DEFAULT_MINUTES = 12;
export const MINUTE_CHIPS = [8, 12, 15] as const;
export const WORD_STEP = 50;
const DEFAULT_WEIGHT = 3;
const STORAGE_PREFIX = "su-ky.draft-outline.v1.";

/** Words a script of `minutes` reads at `wordsPerMinute`, clamped to what the outline endpoint accepts. */
export function wordsForMinutes(minutes: number, wordsPerMinute: number): number {
  return clampWords(Math.round(minutes * wordsPerMinute));
}

export function clampWords(words: number): number {
  if (!Number.isFinite(words)) return OUTLINE_MIN_WORDS;
  return Math.min(OUTLINE_MAX_WORDS, Math.max(OUTLINE_MIN_WORDS, Math.round(words)));
}

export function minutesLimits(wordsPerMinute: number): { min: number; max: number } {
  return { min: Math.max(1, Math.ceil(OUTLINE_MIN_WORDS / wordsPerMinute)), max: Math.floor(OUTLINE_MAX_WORDS / wordsPerMinute) };
}

/** Splits `total` by weight; the rounding remainder goes to the heaviest section so the sum is exact. */
export function distributeWords(sections: OutlineSection[], total: number): OutlineSection[] {
  const weightSum = sections.reduce((sum, section) => sum + section.weight, 0);
  if (!sections.length || weightSum === 0) return sections;
  const shares = sections.map((section) => Math.round((total * section.weight) / weightSum));
  const heaviest = sections.reduce((best, section, index) => (section.weight > sections[best]!.weight ? index : best), 0);
  shares[heaviest]! += total - shares.reduce((sum, share) => sum + share, 0);
  return sections.map((section, index) => ({ ...section, targetWords: shares[index]! }));
}

const median = (values: number[]): number => {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted.length ? sorted[Math.floor(sorted.length / 2)]! : DEFAULT_WEIGHT;
};

export const canAddSection = (sections: OutlineSection[]): boolean => sections.length < OUTLINE_MAX_SECTIONS;

export function addSection(sections: OutlineSection[], total: number): OutlineSection[] {
  if (!canAddSection(sections)) return sections;
  const created: OutlineSection = { id: crypto.randomUUID(), title: "", goal: "", points: [""], weight: median(sections.map((section) => section.weight)), targetWords: 0 };
  return distributeWords([...sections, created], total);
}

export function removeSection(sections: OutlineSection[], id: string, total: number): OutlineSection[] {
  return sections.length <= 1 ? sections : distributeWords(sections.filter((section) => section.id !== id), total);
}

export function patchSection(sections: OutlineSection[], id: string, patch: Partial<Pick<OutlineSection, "title" | "goal">>): OutlineSection[] {
  return sections.map((section) => (section.id === id ? { ...section, ...patch } : section));
}

export function setPoint(sections: OutlineSection[], id: string, index: number, text: string): OutlineSection[] {
  return sections.map((section) => (section.id === id ? { ...section, points: section.points.map((point, at) => (at === index ? text : point)) } : section));
}

export function addPoint(sections: OutlineSection[], id: string): OutlineSection[] {
  return sections.map((section) => (section.id === id && section.points.length < OUTLINE_POINTS_MAX ? { ...section, points: [...section.points, ""] } : section));
}

export function removePoint(sections: OutlineSection[], id: string, index: number): OutlineSection[] {
  return sections.map((section) => (section.id === id ? { ...section, points: section.points.filter((_, at) => at !== index) } : section));
}

/** Sections as the draft endpoint wants them: empty points dropped, untitled sections rejected by the caller. */
export function cleanedSections(sections: OutlineSection[]): OutlineSection[] {
  return sections.map((section) => ({ ...section, title: section.title.trim(), goal: section.goal.trim(), points: section.points.map((point) => point.trim()).filter(Boolean) }));
}

export const hasUntitledSection = (sections: OutlineSection[]): boolean => sections.some((section) => !section.title.trim());

export function sectionsAreEqual(a: OutlineSection[], b: OutlineSection[]): boolean {
  return JSON.stringify(a) === JSON.stringify(b);
}

// ---- Persistence: the outline lives in the browser only (no DB table), keyed by episode --------

const SavedOutlineSchema = z.object({ topic: z.string(), angleId: z.string(), words: z.number(), sections: z.array(OutlineSectionSchema) });
export type SavedOutline = z.infer<typeof SavedOutlineSchema>;

export function loadOutline(episodeId: string): SavedOutline | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_PREFIX + episodeId);
    const parsed = raw ? SavedOutlineSchema.safeParse(JSON.parse(raw)) : null;
    return parsed?.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function saveOutline(episodeId: string, outline: SavedOutline): void {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + episodeId, JSON.stringify(outline));
  } catch {
    // Storage full or blocked: the outline only stays in memory for this session.
  }
}

export function clearOutline(episodeId: string): void {
  try {
    window.localStorage.removeItem(STORAGE_PREFIX + episodeId);
  } catch {
    // Nothing to clear when storage is unavailable.
  }
}
