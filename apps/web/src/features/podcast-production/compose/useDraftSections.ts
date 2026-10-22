import { useCallback, useEffect, useRef, useState } from "react";
import { DRAFT_PREV_MAX_CHARS, type OutlineSection, type ToneInput } from "@repo/shared";
import { composeService } from "./composeService";
import { describeComposeError, isAbort } from "./composeMessages";

export type SectionStatus = "waiting" | "writing" | "done" | "error";

export interface SectionDraft {
  status: SectionStatus;
  /** Editable text; paragraphs are separated by one blank line. */
  text: string;
  lengthStatus: "OK" | "SHORT" | "LONG" | null;
  wordCount: number;
  novelNumbers: string[];
  exceedsLimit: boolean;
  error: string;
  dropped: boolean;
}

const PARAGRAPH_SEPARATOR = "\n\n";
const emptyDraft = (): SectionDraft => ({ status: "waiting", text: "", lengthStatus: null, wordCount: 0, novelNumbers: [], exceedsLimit: false, error: "", dropped: false });

export const draftParagraphs = (draft: SectionDraft): string[] => draft.text.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean);

interface Params {
  episodeId: string;
  sections: OutlineSection[];
  tone: ToneInput;
  angleId: string;
  topic: string;
  narration: "THIRD_PERSON" | "FIRST_PERSON";
  /** Characters the script can still take; read on every call because the moderator may type meanwhile. */
  remainingChars: () => number;
}

/**
 * Writes the outline one section at a time: section i needs the closing text of section i-1 to keep the thread.
 * A failed section stops the run and keeps the finished ones; `run(i)` resumes from it.
 */
export function useDraftSections(params: Params) {
  const [drafts, setDrafts] = useState<SectionDraft[]>(() => params.sections.map(emptyDraft));
  const [running, setRunning] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const live = useRef(drafts);
  live.current = drafts;

  const patch = useCallback((index: number, change: Partial<SectionDraft>) => {
    setDrafts((current) => current.map((draft, at) => (at === index ? { ...draft, ...change } : draft)));
  }, []);

  const write = useCallback(async (index: number, signal: AbortSignal): Promise<boolean> => {
    const { sections, tone, angleId, topic, narration, episodeId, remainingChars } = params;
    const previous = live.current.slice(0, index).reverse().find((draft) => draft.status === "done" && !draft.dropped);
    patch(index, { status: "writing", error: "" });
    try {
      const response = await composeService.draftSection(
        episodeId,
        {
          outline: sections.map(({ title, goal, points, targetWords }) => ({ title, goal, points, targetWords })),
          index,
          tone,
          angleId,
          topic,
          narration,
          previousText: previous ? previous.text.slice(-DRAFT_PREV_MAX_CHARS) : undefined,
          remainingChars: remainingChars(),
        },
        signal,
      );
      patch(index, {
        status: "done",
        text: response.paragraphs.join(PARAGRAPH_SEPARATOR),
        lengthStatus: response.lengthStatus,
        wordCount: response.wordCount,
        novelNumbers: response.novelNumbers,
        exceedsLimit: response.exceedsLimit,
      });
      return true;
    } catch (error) {
      if (isAbort(error)) patch(index, { status: "waiting" });
      else patch(index, { status: "error", error: describeComposeError(error, "Không viết được phần này.") });
      return false;
    }
  }, [params, patch]);

  /** Writes every section from `from` on that is not done yet, in order; stops at the first failure. */
  const run = useCallback(async (from = 0): Promise<void> => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setRunning(true);
    for (let index = from; index < params.sections.length; index += 1) {
      if (live.current[index]?.status === "done") continue;
      if (!(await write(index, current.signal))) break;
    }
    if (controller.current === current) setRunning(false);
  }, [params.sections.length, write]);

  /** "Viết lại phần này": same section, same previous text, replaces only this one. */
  const regenerate = useCallback(async (index: number): Promise<void> => {
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setRunning(true);
    await write(index, current.signal);
    if (controller.current === current) setRunning(false);
  }, [write]);

  const abort = useCallback(() => {
    controller.current?.abort();
    controller.current = null;
    setRunning(false);
  }, []);

  useEffect(() => () => controller.current?.abort(), []);

  return { drafts, running, run, regenerate, abort, patch };
}
