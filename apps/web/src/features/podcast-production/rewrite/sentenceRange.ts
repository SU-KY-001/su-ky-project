const SENTENCE_END = /[.!?…]/;
const CLOSERS = /["'”’)\]]/;

const isSpace = (char: string | undefined): boolean => char !== undefined && /\s/.test(char);

/** Start of the sentence containing `offset`: just after the previous terminator (+ whitespace) or the block start. */
export function sentenceStart(text: string, offset: number): number {
  let index = Math.min(Math.max(offset, 0), text.length);
  while (index > 0) {
    const previous = text[index - 1]!;
    if (isSpace(previous)) {
      let cursor = index - 1;
      while (cursor > 0 && isSpace(text[cursor - 1])) cursor -= 1;
      let terminator = cursor - 1;
      while (terminator >= 0 && CLOSERS.test(text[terminator]!)) terminator -= 1;
      if (terminator >= 0 && SENTENCE_END.test(text[terminator]!)) break;
    }
    index -= 1;
  }
  while (index < text.length && isSpace(text[index])) index += 1;
  return index;
}

/** End (exclusive) of the sentence that contains the char before `offset`; stays put when `offset` already ends one. */
export function sentenceEnd(text: string, offset: number): number {
  let index = Math.min(Math.max(offset, 0), text.length);
  while (index > 0 && isSpace(text[index - 1])) index -= 1;
  if (index > 0) {
    let terminator = index - 1;
    while (terminator >= 0 && CLOSERS.test(text[terminator]!)) terminator -= 1;
    if (terminator >= 0 && SENTENCE_END.test(text[terminator]!)) return index;
  }
  while (index < text.length) {
    if (SENTENCE_END.test(text[index]!)) {
      index += 1;
      while (index < text.length && CLOSERS.test(text[index]!)) index += 1;
      return index;
    }
    index += 1;
  }
  return text.length;
}

/** Number of sentences in a fragment, for the "N câu" line of the dialog. */
export function sentenceCount(text: string): number {
  const matches = text.match(/[^.!?…]+[.!?…]+["'”’)\]]*|[^.!?…]+$/g);
  return matches?.filter((part) => part.trim()).length ?? 0;
}
