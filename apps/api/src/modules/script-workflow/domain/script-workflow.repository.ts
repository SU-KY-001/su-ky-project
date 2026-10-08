import type { StepStatus, StepType, WorkflowStatus } from "@repo/shared";
import type {
  RunNodeEntity,
  ScriptPublicationEntity,
  StepVersionEntity,
  StepVersionWithRun,
  StepVersionWithType,
  WorkflowEventEntity,
  WorkflowRunEntity,
  WorkflowRunWithSteps,
  WorkflowStepEntity,
} from "./script-workflow.entity";

export interface WorkflowRunPatch {
  status?: WorkflowStatus;
  currentStep?: StepType | null;
  completedAt?: Date | null;
}

export interface WorkflowStepPatch {
  status?: StepStatus;
  currentVersion?: number | null;
  approvedVersion?: number | null;
  errorMessage?: string | null;
  incomingGuidance?: string | null;
}

export interface InsertStepVersionInput {
  workflowStepId: number;
  version: number;
  parentVersionId?: number | null;
  inputJson: unknown;
  outputJson: unknown;
  humanFeedback?: string | null;
  validationStatus?: "valid" | "invalid";
}

export interface InsertPublicationInput {
  workflowRunId: number;
  approvedVersionId: number;
  approvedById: string;
  finalScript: string;
  wordCount: number;
  estimatedDurationSeconds: number;
}

export interface LogEventInput {
  workflowRunId: number;
  type: string;
  message: string;
  metadataJson?: unknown;
}

export interface ScriptWorkflowRepository {
  createWorkflowRun(topic: string, createdById: string): Promise<WorkflowRunEntity>;
  getWorkflowRun(id: number): Promise<WorkflowRunEntity | null>;
  getOwnedWorkflowRun(id: number, userId: string): Promise<WorkflowRunEntity | null>;
  listWorkflowRuns(
    userId: string,
    page: number,
    limit: number
  ): Promise<{ items: WorkflowRunEntity[]; total: number }>;
  updateWorkflowRun(id: number, patch: WorkflowRunPatch): Promise<void>;

  getWorkflowStep(workflowRunId: number, stepType: StepType): Promise<WorkflowStepEntity | null>;
  ensureWorkflowStep(
    workflowRunId: number,
    stepType: StepType,
    status?: StepStatus
  ): Promise<WorkflowStepEntity>;
  updateWorkflowStep(id: number, patch: WorkflowStepPatch): Promise<void>;
  /** Optimistic lock: returns null when status/version no longer match. */
  atomicTransitionStepStatus(
    stepId: number,
    expectedStatus: StepStatus,
    expectedVersion: number,
    patch: { status: StepStatus; approvedVersion?: number | null; incomingGuidance?: string | null }
  ): Promise<WorkflowStepEntity | null>;
  setDownstreamStepsStale(workflowRunId: number, downstreamTypes: StepType[]): Promise<void>;

  getStepVersion(workflowStepId: number, version: number): Promise<StepVersionEntity | null>;
  getStepVersionById(id: number): Promise<StepVersionWithRun | null>;
  /** Node + all its ancestors, root first, in a single query. */
  getAncestry(nodeId: number): Promise<StepVersionWithType[]>;
  listRunNodes(workflowRunId: number): Promise<RunNodeEntity[]>;
  getRunWithStepsAndVersions(workflowRunId: number): Promise<WorkflowRunWithSteps | null>;
  insertStepVersion(input: InsertStepVersionInput): Promise<StepVersionEntity>;

  insertPublication(input: InsertPublicationInput): Promise<ScriptPublicationEntity>;
  listPublications(workflowRunId: number): Promise<ScriptPublicationEntity[]>;
  findPublicationByApprovedVersionId(approvedVersionId: number): Promise<ScriptPublicationEntity | null>;

  logEvent(input: LogEventInput): Promise<void>;
  /** Oldest-first window of the latest `limit` events. */
  listEvents(
    workflowRunId: number,
    typePrefix: string | undefined,
    limit: number
  ): Promise<WorkflowEventEntity[]>;
  listEventsAfter(workflowRunId: number, afterId: number, limit: number): Promise<WorkflowEventEntity[]>;
}
