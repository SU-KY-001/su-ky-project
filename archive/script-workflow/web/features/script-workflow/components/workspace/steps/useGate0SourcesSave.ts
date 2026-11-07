import { useCallback, useState } from "react";
import { STEP_OUTPUT_SCHEMAS, type ResearchConsultation, type WorkflowStep } from "@repo/shared";
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
} from "../gates/gateDrafts";

const NEXT_VERSION_OFFSET = 1;

type UseGate0SourcesSaveOptions = {
  workflowId: number;
  step: WorkflowStep;
  data: ResearchConsultation;
  sources: ResearchConsultation["sourcesCatalogue"];
  note: string;
  clearDraft: () => void;
  onConflict: () => void;
};

/** Gate 0 source catalogue save flow: schema validation, DIRECT_EDIT mutation and error-to-UI mapping. */
export function useGate0SourcesSave({
  workflowId,
  step,
  data,
  sources,
  note,
  clearDraft,
  onConflict,
}: UseGate0SourcesSaveOptions) {
  const viewVersion = useWorkflowUiStore((state) => state.viewVersion);
  const showToast = useModeratorToastStore((state) => state.show);
  const mutation = useStepDecision(workflowId);

  const [serverError, setServerError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null);

  const clearRateLimit = useCallback(() => setRateLimit(null), []);

  const handleSave = () => {
    if (step.currentVersion === null || mutation.isPending || rateLimit !== null) return;
    setServerError(null);

    const updatedConsultation: ResearchConsultation = {
      ...data,
      sourcesCatalogue: sources,
    };
    const parsed = STEP_OUTPUT_SCHEMAS.RESEARCHER.safeParse(updatedConsultation);
    if (!parsed.success) {
      setServerError("Danh mục nguồn không hợp lệ. Vui lòng kiểm tra lại.");
      return;
    }

    const currentBaseVersion = step.currentVersion;
    const trimmedNote = note.trim();

    mutation.mutate(
      {
        action: "DIRECT_EDIT",
        stepType: "RESEARCHER",
        baseVersion: currentBaseVersion,
        editedOutputJson: parsed.data,
        ...(trimmedNote.length > 0 ? { note: trimmedNote } : {}),
      },
      {
        onSuccess: (res) => {
          const nextVer = res.newVersion ?? currentBaseVersion + NEXT_VERSION_OFFSET;
          clearDraft();
          viewVersion("RESEARCHER", null);
          showToast(`Đã lưu v${nextVer}. Chưa duyệt.`);
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
    serverError,
    rateLimit,
    clearRateLimit,
    handleSave,
  };
}
