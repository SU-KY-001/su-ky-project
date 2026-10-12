import { useCallback, useMemo } from "react";
import { z } from "zod";
import {
  NARRATIVE_FOCUS_TYPES,
  SourceItemSchema,
  type NarrativeFocusSelection,
  type NarrativeFocusType,
  type NarrativeMenuOption,
  type ResearchConsultation,
  type SourceItem,
} from "@repo/shared";
import { useWorkflowUiStore } from "../../../store";
import { parseStoredJson } from "./gateDrafts";

const CUSTOM_SOURCE_PREFIX = "custom-src-";
const INITIAL_CUSTOM_INDEX = 1;

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
