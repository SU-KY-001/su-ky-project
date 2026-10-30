const MIN_QUOTE_FRAGMENT_CHARS = 12;
const norm = (s: string) => s.normalize("NFC").replace(/\s+/g, " ").trim();

/** Comparison form: the scan has page markers like [19b] and glued footnote numbers (Nguyệt533) that a faithful quote may omit. */
export const quoteForm = (s: string) => norm(s.normalize("NFC").replace(/\[\d+[ab]\]/g, " ").replace(/(?<=\p{L})\d{1,4}(?!\d)/gu, ""));

/**
 * A quote is accepted when every fragment (split on "..." or "…") is verbatim on the page, in order.
 * A non-empty fragment shorter than MIN_QUOTE_FRAGMENT_CHARS rejects the whole quote: otherwise
 * "<real excerpt> … <invented words>" would pass with the invented words silently dropped.
 */
export function quoteInPage(quote: string, page: string): boolean {
  const hay = quoteForm(page);
  const fragments = quote.split(/\.{2,}|…/).map(quoteForm).filter((f) => f.length > 0);
  if (!fragments.length || fragments.some((f) => f.length < MIN_QUOTE_FRAGMENT_CHARS)) return false;
  let from = 0;
  for (const f of fragments) {
    const at = hay.indexOf(f, from);
    if (at < 0) return false;
    from = at + f.length;
  }
  return true;
}
