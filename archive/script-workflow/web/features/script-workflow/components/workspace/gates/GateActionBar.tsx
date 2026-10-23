import { useState } from "react";
import { ArrowsClockwise, CheckCircle, CircleNotch, PencilSimple } from "@phosphor-icons/react";
import { STEP_OUTPUT_SCHEMAS, type GetWorkflowResponse, type StepType, type WorkflowStep } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { RateLimitNotice } from "../../create/Notices";
import { ConfirmDialog } from "../dialogs/ConfirmDialog";
import { Callout } from "../steps/stepUi";
import { resolveViewedVersion } from "../workspaceModel";
import { useGateContinue } from "./useGateContinue";

const ICON_SIZE = 18;

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
  const currentVersionObj = resolveViewedVersion(step, step.currentVersion ?? undefined);
  const currentOutput = currentVersionObj?.outputJson;

  const parsedResearcher =
    step.type === "RESEARCHER" ? STEP_OUTPUT_SCHEMAS.RESEARCHER.safeParse(currentOutput) : null;
  const consultation = parsedResearcher?.success ? parsedResearcher.data : null;

  const parsedFactChecker =
    step.type === "FACT_CHECKER" ? STEP_OUTPUT_SCHEMAS.FACT_CHECKER.safeParse(currentOutput) : null;
  const reviewReport = parsedFactChecker?.success ? parsedFactChecker.data : null;

  const baseVersion = step.currentVersion;
  const {
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
  } = useGateContinue({ workflowId: workflow.id, baseVersion, consultation, onConflict });

  const [confirmEmptySources, setConfirmEmptySources] = useState(false);
  const [confirmUnpassedPublish, setConfirmUnpassedPublish] = useState(false);

  const canContinueGate0 =
    step.type !== "RESEARCHER" || (consultation !== null && focusDraft.isValid);
  const canContinue =
    baseVersion !== null &&
    !isBusy &&
    rateLimit === null &&
    canContinueGate0 &&
    !(editing && step.type !== "RESEARCHER");

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
      return;
    }

    executeStepContinue(step.type);
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
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-slate-600 bg-slate-800 px-3.5 font-moderator text-sm font-bold text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-50"
          >
            <ArrowsClockwise size={ICON_SIZE} weight="bold" aria-hidden={true} />
            Làm lại…
          </button>

          <button
            type="button"
            disabled={isBusy || rateLimit !== null}
            title={editTooltip}
            onClick={onToggleEdit}
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] border border-slate-600 bg-slate-800 px-3.5 font-moderator text-sm font-bold text-white hover:bg-slate-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary disabled:opacity-50"
          >
            <PencilSimple size={ICON_SIZE} weight="bold" aria-hidden={true} />
            {editing && step.type !== "RESEARCHER" ? "Đóng sửa tay" : "Sửa tay"}
          </button>

          {editTooltip ? (
            <ModeratorText className="text-xs text-slate-300">
              ({editTooltip})
            </ModeratorText>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {step.type === "RESEARCHER" && !focusDraft.isValid ? (
            <button
              type="button"
              onClick={() => {
                document.getElementById("gate0-focus-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
              className="inline-flex min-h-10 items-center gap-1.5 rounded-[10px] border border-amber-400/80 bg-amber-500/20 px-3 font-moderator text-xs font-extrabold text-amber-200 hover:bg-amber-500/30 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
            >
              Chưa chọn trọng tâm kể · Cuộn tới phần chọn ↓
            </button>
          ) : null}
          <button
            type="button"
            disabled={!canContinue}
            onClick={handleContinueClick}
            className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-mod-primary px-5 font-moderator text-sm font-extrabold text-white shadow-[0_4px_14px_rgba(2,132,199,.38)] hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary disabled:opacity-50"
          >
            {isBusy ? (
              <CircleNotch size={ICON_SIZE} weight="bold" className="motion-safe:animate-spin" aria-hidden={true} />
            ) : (
              <CheckCircle size={ICON_SIZE} weight="bold" aria-hidden={true} />
            )}
            <ModeratorText>{primaryLabel}</ModeratorText>
          </button>
        </div>
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
