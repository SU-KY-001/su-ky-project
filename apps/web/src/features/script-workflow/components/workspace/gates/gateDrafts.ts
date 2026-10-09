import { useCallback, useMemo } from "react";
import { z } from "zod";
import {
  STEP_OUTPUT_SCHEMAS,
  type ClaimVerificationItem,
  type StepType,
  type StoryOutline,
} from "@repo/shared";
import { useWorkflowUiStore } from "../../../store";

export const HTTP_BAD_REQUEST = 400;
export const HTTP_CONFLICT = 409;
export const HTTP_TOO_MANY_REQUESTS = 429;
export const DEFAULT_RATE_LIMIT_SECONDS = 30;

export type RateLimitState = { seconds: number; startedAt: number };

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

export function parseStoredJson<S extends z.ZodType>(raw: string | undefined, schema: S): z.output<S> | null {
  if (!raw) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    const result = schema.safeParse(parsed);
    return result.success ? result.data : null;
  } catch {
    return null;
  }
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
