import { useEffect, useState } from "react";
import type { GetWorkflowResponse, StepStatus, StepType } from "@repo/shared";
import { STEP_LABELS } from "../../labels";
import { useWorkflowUiStore } from "../../store";
import { needsAttention, pickAttentionStep, sortedSteps } from "./workspaceModel";

type StatusSnapshot = ReadonlyMap<StepType, StepStatus>;

function snapshotOf(workflow: GetWorkflowResponse): StatusSnapshot {
  return new Map(workflow.steps.map((step) => [step.type, step.status]));
}

/** "Bước X đã sẵn sàng để duyệt" for steps that just started waiting, "… thất bại" for new failures. */
function announce(workflow: GetWorkflowResponse, previous: StatusSnapshot): string {
  const messages: string[] = [];
  for (const step of sortedSteps(workflow)) {
    const before = previous.get(step.type);
    if (before === step.status) continue;
    if (step.status === "WAITING_FOR_HUMAN") messages.push(`Bước ${STEP_LABELS[step.type]} đã sẵn sàng để duyệt`);
    if (step.status === "FAILED") messages.push(`Bước ${STEP_LABELS[step.type]} đã thất bại`);
  }
  return messages.join(". ");
}

/**
 * Which step is open. The first load pins the step that needs attention; later data updates
 * never move it. Steps that newly need attention get a dot (and a polite announcement)
 * instead. Must be used under a parent that has already called `enterWorkflow(workflow.id)`.
 */
export function useWorkspaceView(workflow: GetWorkflowResponse) {
  const storedStep = useWorkflowUiStore((state) => state.viewedStep);
  const viewStep = useWorkflowUiStore((state) => state.viewStep);
  const attentionStep = pickAttentionStep(workflow.steps);

  useEffect(() => {
    if (storedStep === null && attentionStep !== null) viewStep(attentionStep);
  }, [storedStep, attentionStep, viewStep]);

  const [snapshot, setSnapshot] = useState<StatusSnapshot>(() => snapshotOf(workflow));
  const [announcement, setAnnouncement] = useState("");
  const current = snapshotOf(workflow);
  const changed = workflow.steps.some((step) => snapshot.get(step.type) !== step.status);
  if (changed) {
    // Adjusting state during render (not an effect) avoids a frame with a stale message.
    setSnapshot(current);
    setAnnouncement(announce(workflow, snapshot));
  }

  const viewedType = storedStep ?? attentionStep;
  const attentionSteps = new Set(
    workflow.steps.filter((step) => needsAttention(step) && step.type !== viewedType).map((step) => step.type),
  );

  return { viewedType, viewStep, attentionSteps, announcement };
}
