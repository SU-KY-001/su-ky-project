export type DiffPart = { kind: "same" | "add" | "del"; text: string };

/** Above this many token pairs the LCS table gets large; show a plain replace instead. */
const MAX_LCS_CELLS = 250_000;

const tokenize = (text: string): string[] => text.split(/(\s+)/).filter(Boolean);

function push(parts: DiffPart[], kind: DiffPart["kind"], text: string): void {
  const last = parts.at(-1);
  if (last?.kind === kind) last.text += text;
  else parts.push({ kind, text });
}

/** Word-level diff (whitespace kept) of `before` → `after`, via LCS. */
export function wordDiff(before: string, after: string): DiffPart[] {
  const a = tokenize(before);
  const b = tokenize(after);
  const parts: DiffPart[] = [];
  if (a.length * b.length > MAX_LCS_CELLS) {
    if (before) parts.push({ kind: "del", text: before });
    if (after) parts.push({ kind: "add", text: after });
    return parts;
  }
  const width = b.length + 1;
  const lcs = new Uint32Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lcs[i * width + j] = a[i] === b[j] ? lcs[(i + 1) * width + j + 1]! + 1 : Math.max(lcs[(i + 1) * width + j]!, lcs[i * width + j + 1]!);
    }
  }
  let i = 0;
  let j = 0;
  while (i < a.length && j < b.length) {
    if (a[i] === b[j]) push(parts, "same", a[i++]!), j++;
    else if (lcs[(i + 1) * width + j]! >= lcs[i * width + j + 1]!) push(parts, "del", a[i++]!);
    else push(parts, "add", b[j++]!);
  }
  while (i < a.length) push(parts, "del", a[i++]!);
  while (j < b.length) push(parts, "add", b[j++]!);
  return parts;
}
