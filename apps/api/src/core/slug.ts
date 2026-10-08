import { getSystemConfig } from "./config/system-config";
import { DomainError } from "./errors/domain-error";

const SLUG_SUFFIX_LENGTH = 4;
const SLUG_ALPHABET = "abcdefghijklmnopqrstuvwxyz0123456789";

export function toSlug(text: string, maxLength: number): string {
  const normalized = text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[đĐ]/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, maxLength)
    .replace(/-+$/g, "");
  return normalized || "n-a";
}

export function randomSlugSuffix(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(SLUG_SUFFIX_LENGTH));
  return Array.from(bytes, (byte) => SLUG_ALPHABET[byte % SLUG_ALPHABET.length]).join("");
}

export async function insertWithUniqueSlug(
  text: string,
  tryInsert: (slug: string) => Promise<boolean>
): Promise<string> {
  const maxLength = await getSystemConfig("slug.max_length");
  const maxAttempts = await getSystemConfig("slug.max_attempts");
  const base = toSlug(text, maxLength);
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const slug =
      attempt === 0
        ? base
        : `${base.slice(0, maxLength - SLUG_SUFFIX_LENGTH - 1)}-${randomSlugSuffix()}`;
    if (await tryInsert(slug)) return slug;
  }
  throw new DomainError(409, "SLUG_CONFLICT", "Unable to allocate a unique slug");
}
