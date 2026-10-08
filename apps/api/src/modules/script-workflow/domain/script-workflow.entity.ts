import type { StepStatus, StepType, WorkflowStatus } from "@repo/shared";

export interface WorkflowRunEntity {
  id: number;
  topic: string;
  status: WorkflowStatus;
  currentStep: StepType | null;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
  completedAt: Date | null;
}

export interface WorkflowStepEntity {
  id: number;
  workflowRunId: number;
  stepType: StepType;
  status: StepStatus;
  currentVersion: number | null;
  approvedVersion: number | null;
  errorMessage: string | null;
  incomingGuidance: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface StepVersionEntity {
  id: number;
  workflowStepId: number;
  parentVersionId: number | null;
  version: number;
  inputJson: unknown;
  outputJson: unknown;
  humanFeedback: string | null;
  validationStatus: "valid" | "invalid";
  createdAt: Date;
}

export interface StepVersionWithType {
  node: StepVersionEntity;
  stepType: StepType;
}

/** A node plus the run that owns it (used to reject cross-run publication). */
export interface StepVersionWithRun extends StepVersionWithType {
  workflowRunId: number;
}

export interface RunNodeEntity extends StepVersionWithType {
  stepStatus: StepStatus;
  stepApprovedVersion: number | null;
}

export interface WorkflowStepWithVersions extends WorkflowStepEntity {
  versions: StepVersionEntity[];
}

export interface WorkflowRunWithSteps extends WorkflowRunEntity {
  steps: WorkflowStepWithVersions[];
}

export interface WorkflowEventEntity {
  id: number;
  workflowRunId: number;
  type: string;
  message: string;
  metadataJson: unknown;
  createdAt: Date;
}

export interface ScriptPublicationEntity {
  id: number;
  workflowRunId: number;
  approvedVersionId: number;
  approvedById: string;
  finalScript: string;
  wordCount: number;
  estimatedDurationSeconds: number;
  publishedAt: Date;
}
