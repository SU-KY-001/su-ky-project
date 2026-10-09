import type { ReactNode } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react";
import { isHitlGatedStep, type GetWorkflowResponse, type StepType, type WorkflowStep } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { GATE_LABELS, STEP_LABELS, STEP_STATUS } from "../../labels";
import { useWorkflowUiStore } from "../../store";
import { GateActionBar } from "./gates/GateActionBar";
import { StatusBadge } from "./StatusBadge";
import { StepPanel } from "./StepPanel";
import { VersionSwitcher } from "./VersionSwitcher";
import { isViewingOldVersion, resolveViewedVersion } from "./workspaceModel";

const ICON_SIZE_SM = 16;

type StepContentSectionProps = {
  workflow: GetWorkflowResponse;
  /** Step currently viewed in the flow tab; the section renders empty while none is resolved. */
  step: WorkflowStep | undefined;
  editingStep: StepType | null;
  /** Overrides the default gate action bar; see `WorkflowWorkspace`'s `actions` prop. */
  actions?: ReactNode;
  /** Overrides the default failed-step retry button. */
  failureAction?: ReactNode;
  onToggleEdit: () => void;
  onExitEdit: () => void;
  onRequestRerun: (stepType: StepType, initialFeedback?: string) => void;
  onConflict: () => void;
};

/** Flow-tab card for the viewed step: gate/status header, version switcher, step panel, and sticky action bar. */
export function StepContentSection({
  workflow,
  step,
  editingStep,
  actions,
  failureAction,
  onToggleEdit,
  onExitEdit,
  onRequestRerun,
  onConflict,
}: StepContentSectionProps) {
  const viewedVersions = useWorkflowUiStore((state) => state.viewedVersions);
  const viewVersion = useWorkflowUiStore((state) => state.viewVersion);

  const chosenVersion = step ? viewedVersions[step.type] : undefined;
  const viewedVersion = step ? resolveViewedVersion(step, chosenVersion) : null;
  const viewingOld = step ? isViewingOldVersion(step, viewedVersion) : false;
  const gate = step ? GATE_LABELS[step.type] : undefined;

  const showGateActions =
    step !== undefined && isHitlGatedStep(step.type) && step.status === "WAITING_FOR_HUMAN";

  const resolvedActions =
    actions ??
    (showGateActions && step ? (
      <GateActionBar
        workflow={workflow}
        step={step}
        editing={editingStep === step.type}
        onRequestRerun={(stepType) => onRequestRerun(stepType)}
        onToggleEdit={onToggleEdit}
        onConflict={onConflict}
      />
    ) : null);

  const stepFailureAction =
    failureAction ??
    (step && step.status === "FAILED" && step.versions.length > 0 ? (
      <div>
        <button
          type="button"
          onClick={() => onRequestRerun(step.type)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-mod-danger bg-mod-surface px-3.5 font-moderator text-xs font-bold text-mod-danger hover:bg-mod-danger/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
        >
          <ArrowsClockwise size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
          Làm lại
        </button>
      </div>
    ) : null);

  const stepHeaderTint =
    step?.status === "WAITING_FOR_HUMAN"
      ? "bg-gradient-to-r from-amber-50/90 via-sky-50/60 to-mod-canvas"
      : step?.status === "COMPLETED"
        ? "bg-gradient-to-r from-emerald-50/80 via-mod-canvas to-mod-surface"
        : "bg-gradient-to-r from-sky-50/80 via-mod-canvas to-mod-surface";

  return (
    <section
      aria-label={step ? `Nội dung bước ${STEP_LABELS[step.type]}` : "Nội dung bước"}
      className="flex min-w-0 flex-col gap-5 rounded-[16px] border border-mod-border bg-mod-surface p-4 shadow-[0_10px_28px_rgba(15,23,42,.045)] sm:p-5"
    >
      {step ? (
        <>
          <div
            className={`-mx-4 -mt-4 flex flex-col gap-3 rounded-t-[15px] border-b border-mod-border px-4 py-4 sm:-mx-5 sm:-mt-5 sm:px-5 ${stepHeaderTint}`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2.5">
                {gate ? (
                  <span className="inline-flex items-center rounded-[8px] bg-mod-primary px-2.5 py-1 font-moderator text-xs font-extrabold uppercase tracking-wider text-white shadow-sm">
                    {gate}
                  </span>
                ) : null}
                <ModeratorText as="h2" className="text-lg font-extrabold text-mod-text sm:text-xl">
                  {STEP_LABELS[step.type]}
                </ModeratorText>
              </div>
              <StatusBadge
                status={step.status}
                label={STEP_STATUS[step.status].label}
                tone={STEP_STATUS[step.status].tone}
              />
            </div>

            {viewedVersion ? (
              <VersionSwitcher
                step={step}
                viewedVersion={viewedVersion}
                onChoose={(version) => viewVersion(step.type, version === step.currentVersion ? null : version)}
              />
            ) : null}
          </div>

          <StepPanel
            workflow={workflow}
            step={step}
            version={viewedVersion}
            versionChosen={chosenVersion !== undefined}
            viewingOld={viewingOld}
            editing={editingStep === step.type}
            onExitEdit={onExitEdit}
            onRequestRerun={onRequestRerun}
            onConflict={onConflict}
            failureAction={stepFailureAction}
          />

          {resolvedActions ? (
            <fieldset
              disabled={viewingOld}
              className="sticky bottom-0 z-10 -mx-4 -mb-4 min-w-0 rounded-b-[15px] border-0 border-t-2 border-mod-primary bg-slate-900 px-4 py-3.5 text-white shadow-[0_-10px_28px_rgba(15,23,42,.18)] sm:-mx-5 sm:-mb-5 sm:px-5"
            >
              {resolvedActions}
            </fieldset>
          ) : null}
        </>
      ) : null}
    </section>
  );
}
