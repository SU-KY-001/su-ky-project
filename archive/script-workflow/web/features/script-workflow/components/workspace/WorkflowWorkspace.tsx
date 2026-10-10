import { useCallback, useState, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowsClockwise } from "@phosphor-icons/react";
import type { GetWorkflowResponse, StepType } from "@repo/shared";
import { workflowKeys } from "../../api/queryKeys";
import { STEP_LABELS } from "../../labels";
import { useWorkflowUiStore } from "../../store";
import { ConflictDialog } from "./dialogs/ConflictDialog";
import { RerunDialog } from "./dialogs/RerunDialog";
import { WorkflowEventLogTab } from "./events/WorkflowEventLogTab";
import { StepContentSection } from "./StepContentSection";
import { TabList, TabPanel, type TabDefinition } from "./Tabs";
import { WorkflowTreeTab } from "./tree/WorkflowTreeTab";
import { RealtimeLostBanner, RunFailedBanner } from "./WorkspaceBanners";
import { WorkspaceHeader } from "./WorkspaceHeader";
import { WorkflowStepper } from "./WorkflowStepper";
import { useWorkspaceView } from "./useWorkspaceView";
import { findStep, sortedSteps } from "./workspaceModel";

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
  const viewVersion = useWorkflowUiStore((state) => state.viewVersion);
  const { viewedType, viewStep, attentionSteps, announcement } = useWorkspaceView(workflow);
  const [tab, setTab] = useState<WorkspaceTab>("flow");
  const [editingStep, setEditingStep] = useState<StepType | null>(null);
  const [rerunDialog, setRerunDialog] = useState<RerunDialogState | null>(null);
  const [conflictOpen, setConflictOpen] = useState(false);
  const [reloadingConflict, setReloadingConflict] = useState(false);

  const steps = sortedSteps(workflow);
  const step = viewedType ? findStep(workflow, viewedType) : undefined;
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

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div role="status" aria-live="polite" className="sr-only">
        {announcement}
      </div>

      <WorkspaceHeader workflow={workflow}>
        <TabList label="Khu vực kịch bản" idPrefix={TAB_ID_PREFIX} tabs={tabs} value={tab} onChange={setTab} />
      </WorkspaceHeader>

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

          <StepContentSection
            workflow={workflow}
            step={step}
            editingStep={editingStep}
            actions={actions}
            failureAction={failureAction}
            onToggleEdit={handleToggleEdit}
            onExitEdit={exitEdit}
            onRequestRerun={openRerun}
            onConflict={openConflict}
          />
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
