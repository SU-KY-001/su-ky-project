import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { STEP_OUTPUT_SCHEMAS, type ResearchConsultation, type StepType } from "@repo/shared";
import { useModeratorToastStore } from "@/features/moderator/toastStore";
import { errorMessage, errorRequestId, isApiError } from "@/lib/apiError";
import { workflowPublicationPath } from "../../../constants";
import { useStepDecision } from "../../../hooks/useWorkflowMutations";
import { STEP_LABELS } from "../../../labels";
import { useWorkflowUiStore } from "../../../store";
import { toNarrativeFocusSelection, useGate0FocusDraft, useGate0SourcesDraft } from "./gate0Drafts";
import {
  DEFAULT_RATE_LIMIT_SECONDS,
  HTTP_BAD_REQUEST,
  HTTP_CONFLICT,
  HTTP_TOO_MANY_REQUESTS,
  type RateLimitState,
} from "./gateDrafts";

const NEXT_VERSION_OFFSET = 1;

type UseGateContinueOptions = {
  workflowId: number;
  baseVersion: number | null;
  consultation: ResearchConsultation | null;
  onConflict: () => void;
};

/**
 * CONTINUE submissions for the HITL gates (every step), sharing one mutation and one error/rate-limit state.
 * Gate 0 first saves dirty source-catalogue edits as a DIRECT_EDIT, then continues from the new version.
 */
export function useGateContinue({ workflowId, baseVersion, consultation, onConflict }: UseGateContinueOptions) {
  const navigate = useNavigate();
  const showToast = useModeratorToastStore((state) => state.show);
  const viewVersion = useWorkflowUiStore((state) => state.viewVersion);
  const clearDraft = useWorkflowUiStore((state) => state.clearDraft);
  const mutation = useStepDecision(workflowId);

  const sourcesDraft = useGate0SourcesDraft(workflowId, consultation);
  const focusDraft = useGate0FocusDraft(workflowId);

  const [serverError, setServerError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null);
  const [savingAndContinuing, setSavingAndContinuing] = useState(false);

  const clearRateLimit = useCallback(() => setRateLimit(null), []);

  const isBusy = mutation.isPending || savingAndContinuing;

  const handleMutationError = (error: unknown) => {
    if (isApiError(error, HTTP_CONFLICT)) {
      onConflict();
    } else if (isApiError(error, HTTP_BAD_REQUEST)) {
      setServerError(error.message);
    } else if (isApiError(error, HTTP_TOO_MANY_REQUESTS)) {
      setRateLimit({ seconds: error.retryAfterSeconds ?? DEFAULT_RATE_LIMIT_SECONDS, startedAt: Date.now() });
    } else {
      showToast(errorMessage(error), errorRequestId(error));
    }
  };

  const executeGate0Continue = async () => {
    if (baseVersion === null || !consultation) return;
    const narrativeSelection = toNarrativeFocusSelection(focusDraft.draft);
    if (!narrativeSelection) return;

    setServerError(null);
    setSavingAndContinuing(true);

    try {
      let targetBaseVersion = baseVersion;

      if (sourcesDraft.isDirty) {
        const editedConsultation = {
          ...consultation,
          sourcesCatalogue: sourcesDraft.sources,
        };
        const validated = STEP_OUTPUT_SCHEMAS.RESEARCHER.safeParse(editedConsultation);
        if (!validated.success) {
          setServerError("Danh mục nguồn chưa hợp lệ, vui lòng kiểm tra lại trước khi duyệt.");
          setSavingAndContinuing(false);
          return;
        }
        const trimmedNote = sourcesDraft.note.trim();
        const directEditRes = await mutation.mutateAsync({
          action: "DIRECT_EDIT",
          stepType: "RESEARCHER",
          baseVersion: targetBaseVersion,
          editedOutputJson: validated.data,
          ...(trimmedNote.length > 0 ? { note: trimmedNote } : {}),
        });
        sourcesDraft.reset();
        viewVersion("RESEARCHER", null);
        targetBaseVersion = directEditRes.newVersion ?? targetBaseVersion + NEXT_VERSION_OFFSET;
      }

      const trimmedGuidance = focusDraft.draft.incomingGuidance.trim();
      await mutation.mutateAsync({
        action: "CONTINUE",
        stepType: "RESEARCHER",
        baseVersion: targetBaseVersion,
        narrativeSelection,
        ...(trimmedGuidance.length > 0 ? { incomingGuidance: trimmedGuidance } : {}),
      });

      focusDraft.clear();
      showToast("Đã duyệt bước Tư vấn biên tập. AI đang xử lý bước tiếp theo.");
    } catch (error) {
      handleMutationError(error);
    } finally {
      setSavingAndContinuing(false);
    }
  };

  const executeGate1Continue = () => {
    if (baseVersion === null) return;
    setServerError(null);
    mutation.mutate(
      {
        action: "CONTINUE",
        stepType: "STORY_PLANNER",
        baseVersion,
      },
      {
        onSuccess: () => {
          clearDraft(`gate1:edit:${workflowId}`);
          showToast("Đã duyệt dàn ý. AI đang viết kịch bản.");
        },
        onError: handleMutationError,
      },
    );
  };

  /** Approves a step without a step-specific payload (every gate except Gate 0 focus selection). */
  const executeStepContinue = (stepType: StepType) => {
    if (baseVersion === null) return;
    setServerError(null);
    mutation.mutate(
      { action: "CONTINUE", stepType, baseVersion },
      {
        onSuccess: () => {
          clearDraft(`json-edit:${workflowId}:${stepType}`);
          showToast(`Đã duyệt bước ${STEP_LABELS[stepType]}. AI đang xử lý bước tiếp theo.`);
        },
        onError: handleMutationError,
      },
    );
  };

  const executeGate2Continue = () => {
    if (baseVersion === null) return;
    setServerError(null);
    mutation.mutate(
      {
        action: "CONTINUE",
        stepType: "FACT_CHECKER",
        baseVersion,
      },
      {
        onSuccess: () => {
          clearDraft(`json-edit:${workflowId}:FACT_CHECKER`);
          showToast("Đã duyệt và xuất bản kịch bản.");
          void navigate(workflowPublicationPath(workflowId));
        },
        onError: handleMutationError,
      },
    );
  };

  return {
    sourcesDraft,
    focusDraft,
    serverError,
    rateLimit,
    clearRateLimit,
    isBusy,
    executeGate0Continue,
    executeGate1Continue,
    executeStepContinue,
    executeGate2Continue,
  };
}
