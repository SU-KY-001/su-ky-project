import type { GetWorkflowResponse, StepType, StepVersion, WorkflowStep } from "@repo/shared";

export function sortedSteps(workflow: GetWorkflowResponse): WorkflowStep[] {
  return [...workflow.steps].sort((a, b) => a.sortOrder - b.sortOrder);
}

export function findStep(workflow: GetWorkflowResponse, type: StepType): WorkflowStep | undefined {
  return workflow.steps.find((step) => step.type === type);
}

/** A step the moderator must look at: waiting for a decision, or failed. */
export function needsAttention(step: WorkflowStep): boolean {
  return step.status === "WAITING_FOR_HUMAN" || step.status === "FAILED";
}

export function isInProgress(step: WorkflowStep): boolean {
  return step.status === "QUEUED" || step.status === "RUNNING";
}

/** PENDING steps have nothing to show yet, so they cannot be opened. */
export function isOpenable(step: WorkflowStep): boolean {
  return step.status !== "PENDING";
}

/**
 * Step to open first: waiting for the moderator, then failed, then the latest step still
 * working, then the latest finished one, then the first step.
 */
export function pickAttentionStep(steps: readonly WorkflowStep[]): StepType | null {
  const ordered = [...steps].sort((a, b) => a.sortOrder - b.sortOrder);
  const waiting = ordered.find((step) => step.status === "WAITING_FOR_HUMAN");
  if (waiting) return waiting.type;
  const failed = ordered.find((step) => step.status === "FAILED");
  if (failed) return failed.type;
  const inProgress = ordered.filter(isInProgress).at(-1);
  if (inProgress) return inProgress.type;
  const openable = ordered.filter(isOpenable);
  return (openable.at(-1) ?? ordered[0])?.type ?? null;
}

/** Versions oldest first (the API returns newest first). */
export function versionsAscending(step: WorkflowStep): StepVersion[] {
  return [...step.versions].sort((a, b) => a.version - b.version);
}

/** Version being viewed: the explicit choice when it still exists, else the current one. */
export function resolveViewedVersion(step: WorkflowStep, chosen: number | undefined): StepVersion | null {
  const wanted = chosen ?? step.currentVersion;
  return (
    step.versions.find((version) => version.version === wanted) ??
    step.versions.find((version) => version.version === step.currentVersion) ??
    null
  );
}

/** True when the viewed version is not the one decisions apply to. */
export function isViewingOldVersion(step: WorkflowStep, viewed: StepVersion | null): boolean {
  return viewed !== null && step.currentVersion !== null && viewed.version !== step.currentVersion;
}

/** Walks up `parentVersionId` from a version until it reaches a version of `target`. */
export function findAncestorVersion(
  workflow: GetWorkflowResponse,
  from: StepVersion,
  target: StepType,
): StepVersion | null {
  const owners = new Map<number, { type: StepType; version: StepVersion }>();
  for (const step of workflow.steps) {
    for (const version of step.versions) owners.set(version.id, { type: step.type, version });
  }
  let cursor = from.parentVersionId;
  const visited = new Set<number>();
  while (cursor !== null && !visited.has(cursor)) {
    visited.add(cursor);
    const owner = owners.get(cursor);
    if (!owner) return null;
    if (owner.type === target) return owner.version;
    cursor = owner.version.parentVersionId;
  }
  return null;
}
