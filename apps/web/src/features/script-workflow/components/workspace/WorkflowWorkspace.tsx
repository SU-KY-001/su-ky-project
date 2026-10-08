import { useCallback, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowsClockwise } from "@phosphor-icons/react";
import { isHitlGatedStep, type GetWorkflowResponse, type StepType } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { SCRIPT_WORKFLOWS_PATH } from "@/features/moderator/navItems";
import { workflowKeys } from "../../api/queryKeys";
import { GATE_LABELS, STEP_LABELS, STEP_STATUS, WORKFLOW_STATUS } from "../../labels";
import { useWorkflowUiStore } from "../../store";
import { ConflictDialog } from "./dialogs/ModalDialog";
import { RerunDialog } from "./dialogs/RerunDialog";
import { WorkflowEventLogTab } from "./events/WorkflowEventLogTab";
import { GateActionBar } from "./gates/GateActionBar";
import { StatusBadge } from "./StatusBadge";
import { StepPanel } from "./StepPanel";
import { TabList, TabPanel, type TabDefinition } from "./Tabs";
import { WorkflowTreeTab } from "./tree/WorkflowTreeTab";
import { VersionSwitcher } from "./VersionSwitcher";
import { RealtimeLostBanner, RunFailedBanner } from "./WorkspaceBanners";
import { WorkflowStepper } from "./WorkflowStepper";
import { useWorkspaceView } from "./useWorkspaceView";
import { findStep, isViewingOldVersion, resolveViewedVersion, sortedSteps } from "./workspaceModel";

type WorkspaceTab = "flow" | "tree" | "log";
type RerunDialogState = { stepType: StepType; initialFeedback?: string };

const TAB_ID_PREFIX = "workspace";
const ICON_SIZE_SM = 16;

type WorkflowWorkspaceProps = {
  workflow: GetWorkflowResponse;
  /**
   * Sticky action bar under the step panel (approve, rerun, edit). Rendered only when provided
   * or when viewing a gated step waiting for the moderator, and disabled while viewing an older version.
   */
  actions?: ReactNode;
  /** Retry button shown inside the failed-run banner and the failed-step block. */
  failureAction?: ReactNode;
  /** Optional extra tabs next to "Quy trình"; a tab appears only when its content is provided. */
  treeTab?: ReactNode;
  logTab?: ReactNode;
};

/** S3 layout: title bar, stepper, version switcher, step panel, and gate action bar. */
export function WorkflowWorkspace({ workflow, actions, failureAction, treeTab, logTab }: WorkflowWorkspaceProps) {
  const queryClient = useQueryClient();
  const streamConnection = useWorkflowUiStore((state) => state.streamConnection);
  const viewedVersions = useWorkflowUiStore((state) => state.viewedVersions);
  const viewVersion = useWorkflowUiStore((state) => state.viewVersion);
  const { viewedType, viewStep, attentionSteps, announcement } = useWorkspaceView(workflow);
  const [tab, setTab] = useState<WorkspaceTab>("flow");
  const [editingStep, setEditingStep] = useState<StepType | null>(null);
  const [rerunDialog, setRerunDialog] = useState<RerunDialogState | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [reloadingConflict, setReloadingConflict] = useState(false);

  const steps = sortedSteps(workflow);
  const step = viewedType ? findStep(workflow, viewedType) : undefined;
  const status = WORKFLOW_STATUS[workflow.status];
  const failedStep =
    steps.find((entry) => entry.status === "FAILED") ??
    (workflow.currentStep ? findStep(workflow, workflow.currentStep) : undefined);

  const resolvedTreeTab = treeTab ?? (
    <WorkflowTreeTab
      workflowId={workflow.id}
      onSelectNode={(stepType, version) => {
        viewStep(stepType);
        viewVersion(stepType, version);
        setTab("flow");
      }}
    />
  );
  const resolvedLogTab = logTab ?? <WorkflowEventLogTab workflowId={workflow.id} />;
  const tabs: TabDefinition<WorkspaceTab>[] = [
    { id: "flow", label: "Quy trình" },
    { id: "tree", label: "Cây lịch sử" },
    { id: "log", label: "Nhật ký" },
  ];

  const chosenVersion = step ? viewedVersions[step.type] : undefined;
  const viewedVersion = step ? resolveViewedVersion(step, chosenVersion) : null;
  const viewingOld = step ? isViewingOldVersion(step, viewedVersion) : false;
  const gate = step ? GATE_LABELS[step.type] : undefined;

  const openRerun = useCallback((stepType: StepType, initialFeedback?: string) => {
    setRerunDialog({ stepType, initialFeedback });
  }, []);

  const openConflict = useCallback(() => {
    setConflictOpen(true);
  }, []);

  const exitEdit = useCallback(() => {
    setEditingStep(null);
  }, []);

  const handleToggleEdit = () => {
    if (!step) return;
    if (step.type === "RESEARCHER") {
      const sectionEl = document.getElementById("gate0-sources-section");
      sectionEl?.scrollIntoView({ behavior: "smooth", block: "start" });
      const addBtn = document.getElementById("gate0-add-source-btn");
      if (addBtn instanceof HTMLElement) addBtn.focus();
      return;
    }
    setEditingStep((current) => (current === step.type ? null : step.type));
  };

  const handleReloadConflict = async () => {
    setReloadingConflict(true);
    try {
      await queryClient.refetchQueries({ queryKey: workflowKeys.detail(workflow.id) });
      setConflictOpen(false);
    } finally {
      setReloadingConflict(false);
    }
  };

  const showGateActions =
    step !== undefined && isHitlGatedStep(step.type) && step.status === "WAITING_FOR_HUMAN";

  const resolvedActions =
    actions ??
    (showGateActions && step ? (
      <GateActionBar
        workflow={workflow}
        step={step}
        editing={editingStep === step.type}
        onRequestRerun={(stepType) => openRerun(stepType)}
        onToggleEdit={handleToggleEdit}
        onConflict={openConflict}
      />
    ) : null);

  const runBannerFailureAction =
    failureAction ??
    (failedStep && failedStep.versions.length > 0 ? (
      <div>
        <button
          type="button"
          onClick={() => openRerun(failedStep.type)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-mod-danger bg-mod-surface px-3.5 font-moderator text-xs font-bold text-mod-danger hover:bg-mod-danger/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
        >
          <ArrowsClockwise size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
          Làm lại bước {STEP_LABELS[failedStep.type]}
        </button>
      </div>
    ) : null);

  const stepFailureAction =
    failureAction ??
    (step && step.status === "FAILED" && step.versions.length > 0 ? (
      <div>
        <button
          type="button"
          onClick={() => openRerun(step.type)}
          className="inline-flex min-h-11 items-center gap-1.5 rounded-[10px] border border-mod-danger bg-mod-surface px-3.5 font-moderator text-xs font-bold text-mod-danger hover:bg-mod-danger/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
        >
          <ArrowsClockwise size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
          Làm lại
        </button>
      </div>
    ) : null);

  const heroAccentClass =
    workflow.status === "WAITING_FOR_HUMAN"
      ? "border-l-mod-attention"
      : workflow.status === "COMPLETED"
        ? "border-l-mod-success"
        : workflow.status === "FAILED"
          ? "border-l-mod-danger"
          : "border-l-mod-primary";

  const stepHeaderTint =
    step?.status === "WAITING_FOR_HUMAN"
      ? "bg-gradient-to-r from-amber-50/90 via-sky-50/60 to-mod-canvas"
      : step?.status === "COMPLETED"
        ? "bg-gradient-to-r from-emerald-50/80 via-mod-canvas to-mod-surface"
        : "bg-gradient-to-r from-sky-50/80 via-mod-canvas to-mod-surface";

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <header
        className={`flex flex-col gap-3 rounded-[16px] border border-mod-border border-l-4 ${heroAccentClass} bg-mod-surface p-4 shadow-[0_8px_22px_rgba(15,23,42,.045)] sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:px-5`}
      >
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
          <Link
            to={SCRIPT_WORKFLOWS_PATH}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-[10px] border border-mod-border bg-mod-canvas px-3 text-xs font-extrabold text-mod-primary-hover no-underline hover:border-mod-primary hover:bg-sky-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
          >
            <ArrowLeft size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
            Danh sách
          </Link>
          <ModeratorText as="h1" className="min-w-0 flex-1 text-xl font-extrabold tracking-tight text-mod-text sm:text-2xl">
            {workflow.topic}
          </ModeratorText>
          <StatusBadge status={workflow.status} label={status.label} tone={status.tone} />
        </div>
        <TabList label="Khu vực kịch bản" idPrefix={TAB_ID_PREFIX} tabs={tabs} value={tab} onChange={setTab} />
      </header>

      {workflow.status === "FAILED" ? (
        <RunFailedBanner
          stepName={failedStep ? STEP_LABELS[failedStep.type] : null}
          errorMessage={failedStep?.errorMessage ?? null}
          action={runBannerFailureAction}
        />
      ) : null}
      {streamConnection === "degraded" ? <RealtimeLostBanner /> : null}

      <TabPanel idPrefix={TAB_ID_PREFIX} id="flow" value={tab} className="pt-1">
        <div className="grid min-w-0 items-start gap-5 md:grid-cols-[276px_minmax(0,1fr)]">
          <aside className="min-w-0 md:sticky md:top-0">
            {viewedType ? (
              <WorkflowStepper
                steps={steps}
                viewedStep={viewedType}
                attentionSteps={attentionSteps}
                onSelect={viewStep}
              />
            ) : null}
          </aside>

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
                  onExitEdit={exitEdit}
                  onRequestRerun={openRerun}
                  onConflict={openConflict}
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
        </div>
      </TabPanel>

      <TabPanel idPrefix={TAB_ID_PREFIX} id="tree" value={tab}>
        {resolvedTreeTab}
      </TabPanel>
      <TabPanel idPrefix={TAB_ID_PREFIX} id="log" value={tab}>
        {resolvedLogTab}
      </TabPanel>

      {rerunDialog ? (
        <RerunDialog
          open={true}
          workflow={workflow}
          stepType={rerunDialog.stepType}
          initialFeedback={rerunDialog.initialFeedback}
          onClose={() => setRerunDialog(null)}
          onConflict={() => {
            setRerunDialog(null);
            setConflictOpen(true);
          }}
        />
      ) : null}

      <ConflictDialog
        open={conflictOpen}
        reloading={reloadingConflict}
        onClose={() => setConflictOpen(false)}
        onReload={() => void handleReloadConflict()}
      />
    </div>
  );
}
