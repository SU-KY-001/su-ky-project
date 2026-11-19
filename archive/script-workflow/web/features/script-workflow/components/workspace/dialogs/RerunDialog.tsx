import { useCallback, useEffect, useId, useRef, useState } from "react";
import { CircleNotch, PaperPlaneTilt } from "@phosphor-icons/react";
import type { GetWorkflowResponse, StepType } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { useModeratorToastStore } from "@/features/moderator/toastStore";
import { errorMessage, errorRequestId, isApiError } from "@/lib/apiError";
import { useStepDecision } from "../../../hooks/useWorkflowMutations";
import { STEP_LABELS } from "../../../labels";
import { useWorkflowUiStore } from "../../../store";
import { RateLimitNotice } from "../../create/Notices";
import { Callout } from "../steps/stepUi";
import { findStep, sortedSteps } from "../workspaceModel";
import {
  DEFAULT_RATE_LIMIT_SECONDS,
  HTTP_BAD_REQUEST,
  HTTP_CONFLICT,
  HTTP_TOO_MANY_REQUESTS,
  type RateLimitState,
} from "../gates/gateDrafts";
import { ModalDialog } from "./ModalDialog";

const SUGGESTION_CHIPS = ["Ngắn gọn hơn", "Nhấn mạnh nhân vật", "Bám sát chính sử hơn"] as const;
const TEXTAREA_ROWS = 4;
const ICON_SIZE = 18;

type RerunDialogProps = {
  open: boolean;
  workflow: GetWorkflowResponse;
  stepType: StepType;
  initialFeedback?: string;
  onClose: () => void;
  onConflict: () => void;
};

export function RerunDialog({
  open,
  workflow,
  stepType,
  initialFeedback,
  onClose,
  onConflict,
}: RerunDialogProps) {
  const textareaId = useId();
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const draftKey = `rerun:${workflow.id}:${stepType}`;
  const feedback = useWorkflowUiStore((state) => state.drafts[draftKey] ?? "");
  const setDraft = useWorkflowUiStore((state) => state.setDraft);
  const clearDraft = useWorkflowUiStore((state) => state.clearDraft);
  const viewStep = useWorkflowUiStore((state) => state.viewStep);
  const viewVersion = useWorkflowUiStore((state) => state.viewVersion);
  const showToast = useModeratorToastStore((state) => state.show);
  const mutation = useStepDecision(workflow.id);

  const [serverError, setServerError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null);
  const clearRateLimit = useCallback(() => setRateLimit(null), []);

  useEffect(() => {
    if (!open) return;
    setServerError(null);
    if (!feedback.trim() && initialFeedback && initialFeedback.trim().length > 0) {
      setDraft(draftKey, initialFeedback);
    }
  }, [open, initialFeedback, draftKey, feedback, setDraft]);

  const targetStep = findStep(workflow, stepType);
  const downstreamSteps = targetStep
    ? sortedSteps(workflow).filter((step) => step.sortOrder > targetStep.sortOrder && step.versions.length > 0)
    : [];
  const downstreamNames = downstreamSteps.map((step) => STEP_LABELS[step.type]).join(", ");

  const trimmed = feedback.trim();
  const canSubmit = trimmed.length > 0 && !mutation.isPending && rateLimit === null;

  const handleAppendChip = (chip: string) => {
    const next = feedback.trim().length === 0 ? chip : `${feedback.trimEnd()}\n${chip}`;
    setDraft(draftKey, next);
    setServerError(null);
    textareaRef.current?.focus();
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    setServerError(null);
    mutation.mutate(
      { action: "RERUN", stepType, feedback: trimmed },
      {
        onSuccess: () => {
          clearDraft(draftKey);
          viewStep(stepType);
          viewVersion(stepType, null);
          showToast(`Đã gửi yêu cầu làm lại bước ${STEP_LABELS[stepType]}.`);
          onClose();
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

  return (
    <ModalDialog
      open={open}
      title={`Làm lại · ${STEP_LABELS[stepType]}`}
      description="Nhập yêu cầu cụ thể để AI tạo phiên bản mới cho bước này."
      busy={mutation.isPending}
      initialFocusRef={textareaRef}
      onClose={onClose}
    >
      <div className="flex flex-col gap-4">
        {downstreamSteps.length > 0 ? (
          <Callout tone="attention" title={`Các bước sau (${downstreamNames}) sẽ cần chạy lại`} role="status">
            Các phiên bản cũ vẫn được giữ nguyên trong lịch sử để bạn đối chiếu khi cần.
          </Callout>
        ) : null}

        {serverError ? (
          <Callout tone="danger" title="Không thể gửi yêu cầu" role="alert">
            {serverError}
          </Callout>
        ) : null}

        {rateLimit ? (
          <RateLimitNotice key={rateLimit.startedAt} seconds={rateLimit.seconds} onElapsed={clearRateLimit} />
        ) : null}

        <div className="flex flex-col gap-2">
          <label htmlFor={textareaId} className="font-moderator text-sm font-bold text-mod-text">
            Bạn muốn AI sửa điều gì?
          </label>
          <textarea
            ref={textareaRef}
            id={textareaId}
            rows={TEXTAREA_ROWS}
            disabled={mutation.isPending}
            value={feedback}
            onChange={(event) => {
              setDraft(draftKey, event.target.value);
              if (serverError) setServerError(null);
            }}
            placeholder="Mô tả những điểm cần chỉnh sửa hoặc bổ sung…"
            className="w-full resize-y rounded-[12px] border border-mod-border bg-mod-surface p-3 font-moderator text-sm text-mod-text placeholder:text-mod-text-low focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-60"
          />
          <div className="flex flex-wrap items-center gap-2">
            <ModeratorText className="text-xs font-semibold text-mod-text-secondary">Gợi ý:</ModeratorText>
            {SUGGESTION_CHIPS.map((chip) => (
              <button
                key={chip}
                type="button"
                disabled={mutation.isPending}
                onClick={() => handleAppendChip(chip)}
                className="inline-flex min-h-11 items-center rounded-full border border-mod-border bg-mod-canvas px-3 font-moderator text-xs font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-50"
              >
                + {chip}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-wrap justify-end gap-3 pt-1">
          <button
            type="button"
            disabled={mutation.isPending}
            onClick={onClose}
            className="inline-flex min-h-11 items-center rounded-[10px] border border-mod-border bg-mod-surface px-4 font-moderator text-sm font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            disabled={!canSubmit}
            onClick={handleSubmit}
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-mod-primary px-4 font-moderator text-sm font-bold text-white hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary disabled:opacity-50"
          >
            {mutation.isPending ? (
              <CircleNotch size={ICON_SIZE} weight="bold" className="motion-safe:animate-spin" aria-hidden={true} />
            ) : (
              <PaperPlaneTilt size={ICON_SIZE} weight="bold" aria-hidden={true} />
            )}
            Gửi cho AI
          </button>
        </div>
      </div>
    </ModalDialog>
  );
}
