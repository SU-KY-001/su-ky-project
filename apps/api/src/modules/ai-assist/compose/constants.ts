/**
 * Named constants of the compose prompts and validators (spec-prompts-compose.md). Limits shared with the web live in
 * @repo/shared (OUTLINE_*, DRAFT_PREV_MAX_CHARS, REWRITE_*); the values below are server-only.
 */

/** Bump on any wording change of the matching prompt and re-run the golden cases. Returned to the client. */
export const OUTLINE_PROMPT_VERSION = 1;
export const DRAFT_PROMPT_VERSION = 1;
export const REWRITE_PROMPT_VERSION = 1;

/** Cheap enough for compose and keeps latency in the 2-15 s window of the spec. */
export const COMPOSE_THINKING = "low" as const;

/** A sentence longer than this many syllables is hard to read aloud. */
export const LONG_SENTENCE_SYLLABLES = 35;

/** suggestedSections = clamp(round(targetWords / OUTLINE_WORDS_PER_SECTION), MIN, MAX). */
export const OUTLINE_WORDS_PER_SECTION = 350;

/** Characters per spoken word, to compare an outline target with script.max_chars (Vietnamese: ~4 letters + space). */
export const APPROX_CHARS_PER_WORD = 5;

export const DRAFT_LENGTH_TOLERANCE_PCT = 25;

export const SERIES_DESC_MAX_CHARS = 800;
export const EPISODE_DESC_MAX_CHARS = 800;
export const NARRATOR_SUMMARY_MAX_CHARS = 600;

/** Stop adding a source whose remaining budget is smaller than this: a stub of a few words only misleads. */
export const MIN_SOURCE_SLICE_CHARS = 200;

/** A rewritten variant must be within [MIN, MAX] x the original length (characters). */
export const REWRITE_MIN_LENGTH_RATIO = 0.3;
export const REWRITE_MAX_LENGTH_RATIO = 2.5;

export const COMPOSE_LOG_SCOPE = "ai-compose";
