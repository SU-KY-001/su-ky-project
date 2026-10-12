import { useCallback, useState } from "react";
import { STEP_OUTPUT_SCHEMAS, type StoryOutline, type WorkflowStep } from "@repo/shared";
import { useModeratorToastStore } from "@/features/moderator/toastStore";
import { errorMessage, errorRequestId, isApiError } from "@/lib/apiError";
import { useStepDecision } from "../../../hooks/useWorkflowMutations";
import { useWorkflowUiStore } from "../../../store";
import {
  DEFAULT_RATE_LIMIT_SECONDS,
  HTTP_BAD_REQUEST,
  HTTP_CONFLICT,
  HTTP_TOO_MANY_REQUESTS,
  type RateLimitState,
} from "./gateDrafts";
import { validateStoryOutlineClient } from "./storyOutlineForm";

const NEXT_VERSION_OFFSET = 1;

type UseStoryPlannerSaveOptions = {
  workflowId: number;
  step: WorkflowStep;
  outline: StoryOutline;
  note: string;
  clearDraft: () => void;
  onSaved: () => void;
  onConflict: () => void;
};

/** Gate 1 direct-edit save flow: client validation, DIRECT_EDIT mutation and error-to-UI mapping. */
export function useStoryPlannerSave({
  workflowId,
  step,
  outline,
  note,
  clearDraft,
  onSaved,
  onConflict,
}: UseStoryPlannerSaveOptions) {
  const viewVersion = useWorkflowUiStore((state) => state.viewVersion);
  const showToast = useModeratorToastStore((state) => state.show);
  const mutation = useStepDecision(workflowId);

  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null);

  const clearRateLimit = useCallback(() => setRateLimit(null), []);

  const handleSave = () => {
    if (step.currentVersion === null || mutation.isPending || rateLimit !== null) return;
    setValidationErrors([]);
    setServerError(null);

    const clientErrors = validateStoryOutlineClient(outline);
    if (clientErrors.length > 0) {
      setValidationErrors(clientErrors);
      return;
    }

    const parsed = STEP_OUTPUT_SCHEMAS.STORY_PLANNER.safeParse(outline);
    if (!parsed.success) {
      setValidationErrors(parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`));
      return;
    }

    const currentBaseVersion = step.currentVersion;
    const trimmedNote = note.trim();

    mutation.mutate(
      {
        action: "DIRECT_EDIT",
        stepType: "STORY_PLANNER",
        baseVersion: currentBaseVersion,
        editedOutputJson: parsed.data,
        ...(trimmedNote.length > 0 ? { note: trimmedNote } : {}),
      },
      {
        onSuccess: (res) => {
          const nextVer = res.newVersion ?? currentBaseVersion + NEXT_VERSION_OFFSET;
          clearDraft();
          viewVersion("STORY_PLANNER", null);
          showToast(`Đã lưu v${nextVer}. Chưa duyệt.`);
          onSaved();
        },
        onError: (error) => {
          if (isApiError(error, HTTP_CONFLICT)) {
            onConflict();
          } else if (isApiError(error, HTTP_BAD_REQUEST)) {
            setServerError(error.message);
          } else if (isApiError(error, HTTP_TOO_MANY_REQUESTS)) {
            setRateLimit({ seconds: error.retryAfterSeconds ?? DEFAULT_RATE_LIMIT_SECONDS, startedAt: Date.now() });
          } else {
            showToast(errorMessage(error), errorRequestId(error));
          }
        },
      },
    );
  };

  return {
    isPending: mutation.isPending,
    validationErrors,
    setValidationErrors,
    serverError,
    rateLimit,
    clearRateLimit,
    handleSave,
  };
}
