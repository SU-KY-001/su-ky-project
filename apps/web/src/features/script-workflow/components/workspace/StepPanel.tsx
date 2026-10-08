import type { ReactNode } from "react";
import { ArrowsClockwise, Prohibit } from "@phosphor-icons/react";
import type { GetWorkflowResponse, StepType, StepVersion, WorkflowStep } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { STEP_LABELS } from "../../labels";
import { PendingStepPanel } from "./PendingStepPanel";
import { FactCheckerPanel } from "./steps/FactCheckerPanel";
import { FactExtractorPanel } from "./steps/FactExtractorPanel";
import { OralizerPanel } from "./steps/OralizerPanel";
import { ResearcherPanel } from "./steps/ResearcherPanel";
import { ScriptWriterPanel } from "./steps/ScriptWriterPanel";
import { SourceEvaluatorPanel } from "./steps/SourceEvaluatorPanel";
import { StoryPlannerPanel } from "./steps/StoryPlannerPanel";
import { Callout, EmptyNote } from "./steps/stepUi";
import { findAncestorVersion, isInProgress } from "./workspaceModel";

type StepPanelProps = {
  workflow: GetWorkflowResponse;
  step: WorkflowStep;
  /** Version to render; null when the step has none yet. */
  version: StepVersion | null;
  /** True when the moderator picked a specific version tab. */
  versionChosen: boolean;
  /** True when viewing a historical version rather than `step.currentVersion`. */
  viewingOld?: boolean;
  /** True when manual edit mode is toggled on for the active gated step. */
  editing?: boolean;
  onExitEdit?: () => void;
  onRequestRerun?: (stepType: StepType, prefillFeedback?: string) => void;
  onConflict?: () => void;
  /** Shown next to a failed step's error (the retry button, supplied by the rerun phase). */
  failureAction?: ReactNode;
};

type StepContentProps = {
  workflow: GetWorkflowResponse;
  step: WorkflowStep;
  version: StepVersion;
  interactive: boolean;
  editing: boolean;
  onExitEdit?: () => void;
  onRequestRerun?: (stepType: StepType, prefillFeedback?: string) => void;
  onConflict?: () => void;
};

function StepContent({
  workflow,
  step,
  version,
  interactive,
  editing,
  onExitEdit,
  onRequestRerun,
  onConflict,
}: StepContentProps) {
  const output = version.outputJson;
  switch (step.type) {
    case "RESEARCHER":
      return (
        <ResearcherPanel
          output={output}
          workflowId={workflow.id}
          step={step}
          interactive={interactive}
          onConflict={onConflict}
        />
      );
    case "SOURCE_EVALUATOR":
      return <SourceEvaluatorPanel output={output} />;
    case "FACT_EXTRACTOR":
      return <FactExtractorPanel output={output} />;
    case "STORY_PLANNER":
      return (
        <StoryPlannerPanel
          output={output}
          workflowId={workflow.id}
          step={step}
          editing={interactive && editing}
          onExitEdit={onExitEdit}
          onConflict={onConflict}
        />
      );
    case "SCRIPT_WRITER":
      return <ScriptWriterPanel output={output} />;
    case "ORALIZER":
      return <OralizerPanel output={output} />;
    case "FACT_CHECKER":
      return (
        <FactCheckerPanel
          output={output}
          oralized={findAncestorVersion(workflow, version, "ORALIZER")}
          workflowId={workflow.id}
          step={step}
          interactive={interactive}
          editing={interactive && editing}
          onExitEdit={onExitEdit}
          onRequestRerun={onRequestRerun}
          onConflict={onConflict}
        />
      );
  }
}

/** Chooses what the centre panel shows for the viewed step and version. */
export function StepPanel({
  workflow,
  step,
  version,
  versionChosen,
  viewingOld = false,
  editing = false,
  onExitEdit,
  onRequestRerun,
  onConflict,
  failureAction,
}: StepPanelProps) {
  if (step.status === "PENDING") {
    return (
      <div className="flex items-center gap-2 py-6">
        <Prohibit size={20} className="text-mod-text-secondary" aria-hidden={true} />
        <ModeratorText className="text-sm font-semibold text-mod-text-secondary">Chưa đến bước này</ModeratorText>
      </div>
    );
  }

  if (isInProgress(step) && !versionChosen) {
    return <PendingStepPanel key={`${step.type}-${step.status}`} step={step} />;
  }

  const interactive = step.status === "WAITING_FOR_HUMAN" && !viewingOld;

  const failed =
    step.status === "FAILED" ? (
      <Callout tone="danger" title={`Bước “${STEP_LABELS[step.type]}” thất bại`} role="alert">
        <div className="flex flex-col gap-3">
          <span>{step.errorMessage ?? "Không có thông tin lỗi."}</span>
          {failureAction}
        </div>
      </Callout>
    ) : null;

  const stale =
    step.status === "STALE" ? (
      <Callout tone="neutral" title="Cần chạy lại" role="status">
        <span className="flex items-start gap-1.5">
          <ArrowsClockwise size={16} className="mt-0.5 shrink-0" aria-hidden={true} />
          Bước trước đã đổi, kết quả này không còn khớp. Bạn chỉ xem được, không chỉnh sửa.
        </span>
      </Callout>
    ) : null;

  return (
    <div className="flex flex-col gap-5">
      {failed}
      {stale}
      {version ? (
        <StepContent
          workflow={workflow}
          step={step}
          version={version}
          interactive={interactive}
          editing={editing}
          onExitEdit={onExitEdit}
          onRequestRerun={onRequestRerun}
          onConflict={onConflict}
        />
      ) : (
        <EmptyNote>Bước này chưa có kết quả để xem.</EmptyNote>
      )}
    </div>
  );
}
