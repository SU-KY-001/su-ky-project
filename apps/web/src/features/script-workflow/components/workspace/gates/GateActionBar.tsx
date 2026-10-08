import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { ArrowsClockwise, CheckCircle, CircleNotch, PencilSimple } from "@phosphor-icons/react";
import { STEP_OUTPUT_SCHEMAS, type GetWorkflowResponse, type StepType, type WorkflowStep } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { useModeratorToastStore } from "@/features/moderator/toastStore";
import { errorMessage, errorRequestId, isApiError } from "@/lib/apiError";
import { workflowPublicationPath } from "../../../constants";
import { useStepDecision } from "../../../hooks/useWorkflowMutations";
import { useWorkflowUiStore } from "../../../store";
import { RateLimitNotice } from "../../create/Notices";
import { ConfirmDialog } from "../dialogs/ModalDialog";
import { Callout } from "../steps/stepUi";
import { resolveViewedVersion } from "../workspaceModel";
import {
  DEFAULT_RATE_LIMIT_SECONDS,
  HTTP_BAD_REQUEST,
  HTTP_CONFLICT,
  HTTP_TOO_MANY_REQUESTS,
  toNarrativeFocusSelection,
  useGate0FocusDraft,
  useGate0SourcesDraft,
  type RateLimitState,
} from "./gateDrafts";

const ICON_SIZE = 18;
const NEXT_VERSION_OFFSET = 1;

type GateActionBarProps = {
  workflow: GetWorkflowResponse;
  step: WorkflowStep;
  editing: boolean;
  onRequestRerun: (stepType: StepType) => void;
  onToggleEdit: () => void;
  onConflict: () => void;
};

export function GateActionBar({
  workflow,
  step,
  editing,
  onRequestRerun,
  onToggleEdit,
  onConflict,
}: GateActionBarProps) {
  const navigate = useNavigate();
  const showToast = useModeratorToastStore((state) => state.show);
  const viewVersion = useWorkflowUiStore((state) => state.viewVersion);
  const clearDraft = useWorkflowUiStore((state) => state.clearDraft);
  const mutation = useStepDecision(workflow.id);

  const currentVersionObj = resolveViewedVersion(step, step.currentVersion ?? undefined);
  const currentOutput = currentVersionObj?.outputJson;

  const parsedResearcher =
    step.type === "RESEARCHER" ? STEP_OUTPUT_SCHEMAS.RESEARCHER.safeParse(currentOutput) : null;
  const consultation = parsedResearcher?.success ? parsedResearcher.data : null;

  const parsedFactChecker =
    step.type === "FACT_CHECKER" ? STEP_OUTPUT_SCHEMAS.FACT_CHECKER.safeParse(currentOutput) : null;
  const reviewReport = parsedFactChecker?.success ? parsedFactChecker.data : null;

  const sourcesDraft = useGate0SourcesDraft(workflow.id, consultation);
  const focusDraft = useGate0FocusDraft(workflow.id);

  const [serverError, setServerError] = useState<string | null>(null);
  const [rateLimit, setRateLimit] = useState<RateLimitState | null>(null);
  const [confirmEmptySources, setConfirmEmptySources] = useState(false);
  const [confirmUnpassedPublish, setConfirmUnpassedPublish] = useState(false);
  const [savingAndContinuing, setSavingAndContinuing] = useState(false);

  const clearRateLimit = useCallback(() => setRateLimit(null), []);

  const isBusy = mutation.isPending || savingAndContinuing;
  const baseVersion = step.currentVersion;

  const canContinueGate0 =
    step.type !== "RESEARCHER" || (consultation !== null && focusDraft.isValid);
  const canContinue =
    baseVersion !== null &&
    !isBusy &&
    rateLimit === null &&
    canContinueGate0 &&
    !(editing && step.type !== "RESEARCHER");

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
      showToast("Đã duyệt Gate 0. AI đang xử lý bước tiếp theo.");
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
          clearDraft(`gate1:edit:${workflow.id}`);
          showToast("Đã duyệt dàn ý. AI đang viết kịch bản.");
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
          clearDraft(`json-edit:${workflow.id}:FACT_CHECKER`);
          showToast("Đã duyệt và xuất bản kịch bản.");
          void navigate(workflowPublicationPath(workflow.id));
        },
        onError: handleMutationError,
      },
    );
  };

  const handleContinueClick = () => {
    if (!canContinue) return;

    if (step.type === "RESEARCHER") {
      if (sourcesDraft.sources.length === 0) {
        setConfirmEmptySources(true);
        return;
      }
      void executeGate0Continue();
      return;
    }

    if (step.type === "STORY_PLANNER") {
      executeGate1Continue();
      return;
    }

    if (step.type === "FACT_CHECKER") {
      if (reviewReport && !reviewReport.passed) {
        setConfirmUnpassedPublish(true);
        return;
      }
      executeGate2Continue();
    }
  };

  const primaryLabel = step.type === "FACT_CHECKER" ? "Duyệt & xuất bản" : "Duyệt & tiếp tục";
  const editTooltip =
    step.type === "FACT_CHECKER"
      ? "Chỉnh báo cáo kiểm định, không chỉnh văn bản kịch bản"
      : undefined;

  return (
    <div className="flex flex-col gap-3">
      {serverError ? (
        <Callout tone="danger" title="Không thể thực hiện thao tác" role="alert">
          {serverError}
        </Callout>
      ) : null}

      {rateLimit ? (
        <RateLimitNotice key={rateLimit.startedAt} seconds={rateLimit.seconds} onElapsed={clearRateLimit} />
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            disabled={isBusy || rateLimit !== null}
            onClick={() => onRequestRerun(step.type)}
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-mod-border bg-mod-surface px-3.5 font-moderator text-sm font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-50"
          >
            <ArrowsClockwise size={ICON_SIZE} weight="bold" aria-hidden={true} />
            Làm lại…
          </button>

          <button
            type="button"
            disabled={isBusy || rateLimit !== null}
            title={editTooltip}
            onClick={onToggleEdit}
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-mod-border bg-mod-surface px-3.5 font-moderator text-sm font-bold text-mod-text hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-50"
          >
            <PencilSimple size={ICON_SIZE} weight="bold" aria-hidden={true} />
            {editing && step.type !== "RESEARCHER" ? "Đóng sửa tay" : "Sửa tay"}
          </button>

          {editTooltip ? (
            <ModeratorText className="text-xs text-mod-text-secondary">
              ({editTooltip})
            </ModeratorText>
          ) : null}
        </div>

        <button
          type="button"
          disabled={!canContinue}
          onClick={handleContinueClick}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-mod-primary px-4 font-moderator text-sm font-bold text-white hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary disabled:opacity-50"
        >
          {isBusy ? (
            <CircleNotch size={ICON_SIZE} weight="bold" className="motion-safe:animate-spin" aria-hidden={true} />
          ) : (
            <CheckCircle size={ICON_SIZE} weight="bold" aria-hidden={true} />
          )}
          <ModeratorText>{primaryLabel}</ModeratorText>
        </button>
      </div>

      <ConfirmDialog
        open={confirmEmptySources}
        title="Không còn nguồn nào"
        description="Danh mục nguồn tham khảo hiện đang trống. Bạn có chắc chắn muốn duyệt và tiếp tục mà không có nguồn tham khảo nào?"
        confirmLabel="Vẫn duyệt & tiếp tục"
        tone="danger"
        busy={isBusy}
        onCancel={() => setConfirmEmptySources(false)}
        onConfirm={() => {
          setConfirmEmptySources(false);
          void executeGate0Continue();
        }}
      />

      <ConfirmDialog
        open={confirmUnpassedPublish}
        title="Bạn chắc chắn xuất bản dù báo cáo chưa đạt?"
        description="Báo cáo kiểm định hiện chưa đạt yêu cầu (passed = false). Vui lòng xác nhận nếu bạn đã kiểm tra kỹ và vẫn muốn xuất bản kịch bản này."
        confirmLabel="Duyệt & xuất bản"
        tone="danger"
        busy={isBusy}
        onCancel={() => setConfirmUnpassedPublish(false)}
        onConfirm={() => {
          setConfirmUnpassedPublish(false);
          executeGate2Continue();
        }}
      />
    </div>
  );
}
