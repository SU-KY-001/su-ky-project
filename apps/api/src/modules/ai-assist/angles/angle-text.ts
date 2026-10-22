import { ANGLE_DESCRIPTION_MAX, ANGLE_GUIDE_MAX, ANGLE_NAME_MAX } from "@repo/shared";

// C0/C1 controls except tab/newline (guide may be multi-line); zero-width/bidi marks are stripped too.
const CONTROL_CHARS = /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F\u200B-\u200F\u202A-\u202E\u2066-\u2069\uFEFF]/g;
const NAME_WHITESPACE = /\s+/g;

/** NFC, drop control characters, trim. */
export function cleanText(value: string): string {
  return value.normalize("NFC").replace(CONTROL_CHARS, "").trim();
}

/** A name is one line: any whitespace run (tabs, newlines) collapses to one space. */
export function cleanName(value: string): string {
  return cleanText(value).replace(NAME_WHITESPACE, " ");
}

/** Case-insensitive identity of a name, used against built-ins; the DB index enforces the same per user. */
export function nameKey(name: string): string {
  return cleanName(name).toLowerCase();
}

export const ANGLE_FIELD_LIMITS = { name: ANGLE_NAME_MAX, description: ANGLE_DESCRIPTION_MAX, guide: ANGLE_GUIDE_MAX } as const;
