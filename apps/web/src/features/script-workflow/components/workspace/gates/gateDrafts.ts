import { useCallback, useMemo } from "react";
import { z } from "zod";
import {
  NARRATIVE_FOCUS_TYPES,
  STEP_OUTPUT_SCHEMAS,
  SourceItemSchema,
  type ClaimVerificationItem,
  type NarrativeFocusSelection,
  type NarrativeFocusType,
  type NarrativeMenuOption,
  type ResearchConsultation,
  type SourceItem,
  type StepType,
  type StoryOutline,
} from "@repo/shared";
import { useWorkflowUiStore } from "../../../store";

const CUSTOM_SOURCE_PREFIX = "custom-src-";
const INITIAL_CUSTOM_INDEX = 1;

export const HTTP_BAD_REQUEST = 400;
export const HTTP_CONFLICT = 409;
export const HTTP_TOO_MANY_REQUESTS = 429;
export const DEFAULT_RATE_LIMIT_SECONDS = 30;

export type RateLimitState = { seconds: number; startedAt: number };

const Gate0SourcesDraftSchema = z.object({
  sources: z.array(SourceItemSchema),
  note: z.string(),
});

export type Gate0SourcesDraft = z.infer<typeof Gate0SourcesDraftSchema>;

const Gate0FocusDraftSchema = z.object({
  selectedFocusType: z.enum(NARRATIVE_FOCUS_TYPES).or(z.literal("CUSTOM")).nullable(),
  seriesTitle: z.string(),
  episodeTitles: z.tuple([z.string(), z.string(), z.string()]),
  editorialNotes: z.string(),
  incomingGuidance: z.string(),
});

export type Gate0FocusDraft = z.infer<typeof Gate0FocusDraftSchema>;

const Gate1EditDraftSchema = z.object({
  outline: STEP_OUTPUT_SCHEMAS.STORY_PLANNER,
  note: z.string(),
});

export type Gate1EditDraft = z.infer<typeof Gate1EditDraftSchema>;

const JsonEditDraftSchema = z.object({
  rawText: z.string(),
  note: z.string(),
});

export type JsonEditDraft = z.infer<typeof JsonEditDraftSchema>;

function parseStoredJson<S extends z.ZodType>(raw: string | undefined, schema: S): z.output<S> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

/** Generates `custom-src-<n>` where `<n>` does not collide with any existing source ID. */
export function nextCustomSourceId(existingSources: readonly SourceItem[]): string {
  let index = INITIAL_CUSTOM_INDEX;
  while (existingSources.some((source) => source.id === `${CUSTOM_SOURCE_PREFIX}${index}`)) {
    index += 1;
  }
  return `${CUSTOM_SOURCE_PREFIX}${index}`;
}
export function isGate0FocusValid(draft: Gate0FocusDraft): boolean {
  return (
    draft.selectedFocusType !== null &&
    draft.seriesTitle.trim().length > 0 &&
    draft.episodeTitles.every((title) => title.trim().length > 0)
  );
}

export function toNarrativeFocusSelection(draft: Gate0FocusDraft): NarrativeFocusSelection | null {
  if (!isGate0FocusValid(draft) || draft.selectedFocusType === null) return null;
  const trimmedNotes = draft.editorialNotes.trim();
  return {
    selectedFocusType: draft.selectedFocusType,
    seriesTitle: draft.seriesTitle.trim(),
    episodeTitles: [
      draft.episodeTitles[0].trim(),
      draft.episodeTitles[1].trim(),
      draft.episodeTitles[2].trim(),
    ],
    ...(trimmedNotes.length > 0 ? { editorialNotes: trimmedNotes } : {}),
  };
}

const DEFAULT_FOCUS_DRAFT: Gate0FocusDraft = {
  selectedFocusType: null,
  seriesTitle: "",
  episodeTitles: ["", "", ""],
  editorialNotes: "",
  incomingGuidance: "",
};

export function useGate0SourcesDraft(workflowId: number, consultation: ResearchConsultation | null) {
  const key = `gate0:sources:${workflowId}`;
  const raw = useWorkflowUiStore((state) => state.drafts[key]);
  const setDraft = useWorkflowUiStore((state) => state.setDraft);
  const clearDraft = useWorkflowUiStore((state) => state.clearDraft);

  const baseSources = useMemo(() => consultation?.sourcesCatalogue ?? [], [consultation]);
  const parsed = useMemo(() => parseStoredJson(raw, Gate0SourcesDraftSchema), [raw]);

  const sources = parsed ? parsed.sources : baseSources;
  const note = parsed ? parsed.note : "";
  const isDirty =
    parsed !== null &&
    (JSON.stringify(parsed.sources) !== JSON.stringify(baseSources) || parsed.note.trim().length > 0);

  const updateSources = useCallback(
    (nextSources: SourceItem[], nextNote: string = note) => {
      if (JSON.stringify(nextSources) === JSON.stringify(baseSources) && nextNote.trim().length === 0) {
        clearDraft(key);
        return;
      }
      setDraft(key, JSON.stringify({ sources: nextSources, note: nextNote }));
    },
    [baseSources, clearDraft, key, note, setDraft],
  );

  const updateNote = useCallback(
    (nextNote: string) => {
      if (JSON.stringify(sources) === JSON.stringify(baseSources) && nextNote.trim().length === 0) {
        clearDraft(key);
        return;
      }
      setDraft(key, JSON.stringify({ sources, note: nextNote }));
    },
    [baseSources, clearDraft, key, setDraft, sources],
  );

  const reset = useCallback(() => {
    clearDraft(key);
  }, [clearDraft, key]);

  return {
    sources,
    note,
    isDirty,
    updateSources,
    updateNote,
    reset,
  };
}

export function useGate0FocusDraft(workflowId: number) {
  const key = `gate0:focus:${workflowId}`;
  const raw = useWorkflowUiStore((state) => state.drafts[key]);
  const setDraft = useWorkflowUiStore((state) => state.setDraft);
  const clearDraft = useWorkflowUiStore((state) => state.clearDraft);

  const draft = useMemo(() => parseStoredJson(raw, Gate0FocusDraftSchema) ?? DEFAULT_FOCUS_DRAFT, [raw]);
  const isValid = isGate0FocusValid(draft);

  const saveDraft = useCallback(
    (next: Gate0FocusDraft) => {
      setDraft(key, JSON.stringify(next));
    },
    [key, setDraft],
  );

  const selectMenuOption = useCallback(
    (option: NarrativeMenuOption) => {
      saveDraft({
        ...draft,
        selectedFocusType: option.focusType,
        seriesTitle: option.seriesTitle,
        episodeTitles: [option.episodeTitles[0], option.episodeTitles[1], option.episodeTitles[2]],
      });
    },
    [draft, saveDraft],
  );

  const selectCustom = useCallback(() => {
    const keepTitles = draft.selectedFocusType === "CUSTOM";
    saveDraft({
      ...draft,
      selectedFocusType: "CUSTOM",
      seriesTitle: keepTitles ? draft.seriesTitle : "",
      episodeTitles: keepTitles ? draft.episodeTitles : ["", "", ""],
    });
  }, [draft, saveDraft]);

  const updateFields = useCallback(
    (partial: Partial<Omit<Gate0FocusDraft, "selectedFocusType">> & { selectedFocusType?: NarrativeFocusType | "CUSTOM" | null }) => {
      saveDraft({ ...draft, ...partial });
    },
    [draft, saveDraft],
  );

  const clear = useCallback(() => {
    clearDraft(key);
  }, [clearDraft, key]);

  return {
    draft,
    isValid,
    selectMenuOption,
    selectCustom,
    updateFields,
    clear,
  };
}

export function useGate1EditDraft(workflowId: number, initialOutline: StoryOutline) {
  const key = `gate1:edit:${workflowId}`;
  const raw = useWorkflowUiStore((state) => state.drafts[key]);
  const setDraft = useWorkflowUiStore((state) => state.setDraft);
  const clearDraft = useWorkflowUiStore((state) => state.clearDraft);

  const parsed = useMemo(() => parseStoredJson(raw, Gate1EditDraftSchema), [raw]);
  const outline = parsed ? parsed.outline : initialOutline;
  const note = parsed ? parsed.note : "";
  const isDirty =
    parsed !== null &&
    (JSON.stringify(parsed.outline) !== JSON.stringify(initialOutline) || parsed.note.trim().length > 0);

  const update = useCallback(
    (nextOutline: StoryOutline, nextNote: string = note) => {
      setDraft(key, JSON.stringify({ outline: nextOutline, note: nextNote }));
    },
    [key, note, setDraft],
  );

  const clear = useCallback(() => {
    clearDraft(key);
  }, [clearDraft, key]);

  return { outline, note, isDirty, update, clear };
}

export function useJsonEditDraft(workflowId: number, stepType: StepType, initialOutput: unknown) {
  const key = `json-edit:${workflowId}:${stepType}`;
  const raw = useWorkflowUiStore((state) => state.drafts[key]);
  const setDraft = useWorkflowUiStore((state) => state.setDraft);
  const clearDraft = useWorkflowUiStore((state) => state.clearDraft);

  const formattedInitial = useMemo(() => JSON.stringify(initialOutput, null, 2) ?? "{}", [initialOutput]);
  const parsed = useMemo(() => parseStoredJson(raw, JsonEditDraftSchema), [raw]);
  const rawText = parsed ? parsed.rawText : formattedInitial;
  const note = parsed ? parsed.note : "";
  const isDirty = parsed !== null && (parsed.rawText.trim() !== formattedInitial.trim() || parsed.note.trim().length > 0);

  const update = useCallback(
    (nextRawText: string, nextNote: string = note) => {
      setDraft(key, JSON.stringify({ rawText: nextRawText, note: nextNote }));
    },
    [key, note, setDraft],
  );

  const clear = useCallback(() => {
    clearDraft(key);
  }, [clearDraft, key]);

  return { rawText, note, isDirty, update, clear };
}

/** Builds pre-filled feedback for STORY_PLANNER rerun from Gate 2's CONTRADICTION/UNSUPPORTED_SPECULATION claims. */
export function buildStoryPlannerFeedbackFromClaims(claims: readonly ClaimVerificationItem[]): string {
  const contradictions = claims.filter((claim) => claim.status === "CONTRADICTION");
  const targets =
    contradictions.length > 0
      ? contradictions
      : claims.filter((claim) => claim.status === "UNSUPPORTED_SPECULATION");
  if (targets.length === 0) {
    return "Cần rà soát lại dàn ý để đảm bảo mọi tình tiết đều bám sát nguồn sử liệu đã thẩm định.";
  }
  const lines = targets.map(
    (claim) => `- Câu “${claim.scriptSentence}”: ${claim.explanation}`,
  );
  return `Cần điều chỉnh dàn ý để loại bỏ các chi tiết mâu thuẫn hoặc chưa có dẫn chứng phát hiện ở bước kiểm định:\n${lines.join("\n")}`;
}
