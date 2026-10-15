import {
  GetWorkflowResponseSchema,
  STEP_ORDER,
  ScriptPublicationSchema,
  WorkflowTreeResponseSchema,
  reviewPolicyFor,
  reviewerFor,
  type GetWorkflowEventsResponse,
  type GetWorkflowResponse,
  type ScriptPublication,
  type ScriptWorkflowSummary,
  type WorkflowTreeResponse,
} from "@repo/shared";
import type {
  WorkflowEventEntity,
  WorkflowRunEntity,
} from "../domain/script-workflow.entity";
import type { ScriptWorkflowRepository } from "../domain/script-workflow.repository";

function toEventDto(event: WorkflowEventEntity) {
  return {
    id: event.id,
    type: event.type,
    message: event.message,
    metadataJson: event.metadataJson,
    createdAt: event.createdAt.toISOString(),
  };
}

export class WorkflowQueryService {
  constructor(private readonly repo: ScriptWorkflowRepository) {}

  /** Returns the run only when the user owns it; other users' ids are indistinguishable from missing. */
  requireOwnedRun(id: number, userId: string): Promise<WorkflowRunEntity | null> {
    return this.repo.getOwnedWorkflowRun(id, userId);
  }

  async listRuns(userId: string, page: number, limit: number, seriesId?: string) {
    const { items, total } = await this.repo.listWorkflowRuns(userId, page, limit, seriesId);
    const data: ScriptWorkflowSummary[] = items.map((run) => ({
      id: run.id,
      topic: run.topic,
      seriesId: run.seriesId,
      status: run.status,
      currentStep: run.currentStep,
      createdAt: run.createdAt.toISOString(),
      updatedAt: run.updatedAt.toISOString(),
      completedAt: run.completedAt?.toISOString() ?? null,
    }));
    return { data, total };
  }

  /** All 7 steps in STEP_ORDER, with PENDING placeholders, so the dashboard can always draw the pipeline. */
  async getDetail(run: WorkflowRunEntity): Promise<GetWorkflowResponse> {
    const full = await this.repo.getRunWithStepsAndVersions(run.id);
    const byType = new Map((full?.steps ?? []).map((step) => [step.stepType, step]));

    const steps = STEP_ORDER.map((stepType, sortOrder) => {
      const step = byType.get(stepType);
      const base = {
        type: stepType,
        reviewPolicy: reviewPolicyFor(stepType),
        reviewer: reviewerFor(stepType),
        sortOrder,
      };
      if (!step) {
        return {
          ...base,
          status: "PENDING" as const,
          currentVersion: null,
          approvedVersion: null,
          errorMessage: null,
          incomingGuidance: null,
          versions: [],
        };
      }
      return {
        ...base,
        status: step.status,
        currentVersion: step.currentVersion,
        approvedVersion: step.approvedVersion,
        errorMessage: step.errorMessage,
        incomingGuidance: step.incomingGuidance,
        versions: step.versions.map((v) => ({
          id: v.id,
          version: v.version,
          parentVersionId: v.parentVersionId,
          inputJson: v.inputJson,
          outputJson: v.outputJson,
          humanFeedback: v.humanFeedback,
          validationStatus: v.validationStatus,
          createdAt: v.createdAt.toISOString(),
        })),
      };
    });

    return GetWorkflowResponseSchema.parse({
      id: run.id,
      status: run.status,
      topic: run.topic,
      currentStep: run.currentStep,
      steps,
    });
  }

  /** Execution tree: every immutable node of the run plus its publications. */
  async getTree(run: WorkflowRunEntity): Promise<WorkflowTreeResponse> {
    const [nodes, publications] = await Promise.all([
      this.repo.listRunNodes(run.id),
      this.repo.listPublications(run.id),
    ]);

    return WorkflowTreeResponseSchema.parse({
      workflowRunId: run.id,
      nodes: nodes.map((row) => ({
        id: row.node.id,
        stepType: row.stepType,
        version: row.node.version,
        parentVersionId: row.node.parentVersionId,
        status: row.stepStatus,
        approved: row.stepApprovedVersion === row.node.version,
        createdAt: row.node.createdAt.toISOString(),
      })),
      publications: publications.map((row) => ({
        id: row.id,
        approvedVersionId: row.approvedVersionId,
        approvedById: row.approvedById,
        totalWords: row.wordCount,
        estimatedDurationSeconds: row.estimatedDurationSeconds,
        publishedAt: row.publishedAt.toISOString(),
      })),
    });
  }

  async listPublications(workflowRunId: number): Promise<ScriptPublication[]> {
    const rows = await this.repo.listPublications(workflowRunId);
    return rows.map((row) =>
      ScriptPublicationSchema.parse({
        id: row.id,
        approvedVersionId: row.approvedVersionId,
        approvedById: row.approvedById,
        finalScript: row.finalScript,
        totalWords: row.wordCount,
        estimatedDurationSeconds: row.estimatedDurationSeconds,
        publishedAt: row.publishedAt.toISOString(),
      })
    );
  }

  async listEvents(
    workflowRunId: number,
    typePrefix: string | undefined,
    limit: number
  ): Promise<GetWorkflowEventsResponse> {
    const rows = await this.repo.listEvents(workflowRunId, typePrefix, limit);
    return { workflowRunId, count: rows.length, events: rows.map(toEventDto) };
  }

  async listEventsAfter(workflowRunId: number, afterId: number, limit: number) {
    const rows = await this.repo.listEventsAfter(workflowRunId, afterId, limit);
    return rows.map(toEventDto);
  }

  async getRunStatus(workflowRunId: number) {
    const run = await this.repo.getWorkflowRun(workflowRunId);
    return run?.status ?? null;
  }
}
