import { STEP_OUTPUT_SCHEMAS, type StepType } from "@repo/shared";
import { logger } from "../../../core/logger";
import type { AgentJobPayload, AgentJobQueue, NarrativeSelectionPayload } from "../domain/agent-job-queue";
import type { ScriptWorkflowRepository } from "../domain/script-workflow.repository";
import { getDownstreamStepTypes, getNextStepType } from "../domain/step-order";
import type { LineageService } from "./lineage.service";
import type { PublicationService } from "./publication.service";

export type TransitionResult<T = unknown> =
  | { success: true; data?: T }
  | { success: false; error: string; status: 400 | 404 | 409; details?: unknown };

const log = logger.child({ scope: "workflow-transition" });

export class WorkflowCommandService {
  constructor(
    private readonly repo: ScriptWorkflowRepository,
    private readonly queue: AgentJobQueue,
    private readonly lineage: LineageService,
    private readonly publication: PublicationService
  ) {}

  async createRun(input: {
    topic: string;
    userId: string;
    seriesId?: string;
    focusHint?: string;
  }): Promise<number> {
    const run = await this.repo.createWorkflowRun({
      topic: input.topic,
      createdById: input.userId,
      seriesId: input.seriesId ?? null,
      focusHint: input.focusHint ?? null,
    });
    await this.repo.ensureWorkflowStep(run.id, "RESEARCHER", "QUEUED");
    await this.repo.updateWorkflowRun(run.id, { status: "RUNNING", currentStep: "RESEARCHER" });
    await this.repo.logEvent({
      workflowRunId: run.id,
      type: "workflow.created",
      message: `Workflow ${run.id} created for topic "${input.topic}"`,
      metadataJson: { createdById: input.userId },
    });
    await this.queue.enqueue({
      workflowRunId: run.id,
      stepType: "RESEARCHER",
      parentVersionId: null,
    } satisfies AgentJobPayload);
    log.info({ workflowRunId: run.id, userId: input.userId }, "Workflow created, RESEARCHER enqueued");
    return run.id;
  }

  /**
   * Moderator approves a node at a HITL gate: mark the step COMPLETED, then either
   * enqueue the next step with parentVersionId = the approved node (keeps the branch)
   * or, at FACT_CHECKER, write the publication and finish the run.
   */
  async continueStep(params: {
    workflowRunId: number;
    stepType: StepType;
    version: number;
    userId: string;
    incomingGuidance?: string;
    narrativeSelection?: NarrativeSelectionPayload;
  }): Promise<TransitionResult<{ nextStep: StepType | null; publicationId?: number }>> {
    const { workflowRunId, stepType, version, userId, incomingGuidance, narrativeSelection } = params;

    const run = await this.repo.getWorkflowRun(workflowRunId);
    if (!run) return { success: false, error: "Workflow not found", status: 404 };

    const step = await this.repo.getWorkflowStep(workflowRunId, stepType);
    if (!step) return { success: false, error: `Step ${stepType} not found`, status: 404 };

    const approvedNode = await this.lineage.loadNodeByStepVersion(workflowRunId, stepType, version);
    if (!approvedNode) {
      return { success: false, error: `Node ${stepType} v${version} not found`, status: 404 };
    }

    // Optimistic lock: only transitions when the step is waiting on a human at this exact version.
    const transitioned = await this.repo.atomicTransitionStepStatus(
      step.id,
      "WAITING_FOR_HUMAN",
      version,
      { status: "COMPLETED", approvedVersion: version }
    );
    if (!transitioned) {
      return {
        success: false,
        error: `Conflict: Step ${stepType} is not WAITING_FOR_HUMAN at version ${version}`,
        status: 409,
      };
    }

    await this.repo.logEvent({
      workflowRunId,
      type: `step.${stepType.toLowerCase()}.approved`,
      message: `Step ${stepType} approved v${version}`,
      metadataJson: {
        stepType,
        version,
        nodeId: approvedNode.id,
        guidance: incomingGuidance ?? null,
        narrativeSelection: narrativeSelection ?? null,
      },
    });

    const nextStepType = getNextStepType(stepType);

    if (!nextStepType) {
      // Gate 2: the FACT_CHECKER node was approved, so write the publication.
      const publication = await this.publication.publishFromApprovedNode({
        workflowRunId,
        approvedVersionId: approvedNode.id,
        approvedById: userId,
      });

      await this.repo.updateWorkflowRun(workflowRunId, {
        status: "COMPLETED",
        currentStep: null,
        completedAt: new Date(),
      });

      await this.repo.logEvent({
        workflowRunId,
        type: "workflow.completed",
        message: `Workflow ${workflowRunId} published as podcast #${publication.id}`,
        metadataJson: { publicationId: publication.id, wordCount: publication.wordCount },
      });

      log.info({ workflowRunId, publicationId: publication.id }, "Published");
      return { success: true, data: { nextStep: null, publicationId: publication.id } };
    }

    const nextStep = await this.repo.ensureWorkflowStep(workflowRunId, nextStepType, "QUEUED");
    await this.repo.updateWorkflowStep(nextStep.id, {
      status: "QUEUED",
      incomingGuidance: incomingGuidance ?? null,
    });
    await this.repo.updateWorkflowRun(workflowRunId, { status: "RUNNING", currentStep: nextStepType });

    await this.queue.enqueue({
      workflowRunId,
      stepType: nextStepType,
      parentVersionId: approvedNode.id,
      guidance: incomingGuidance,
      narrativeSelection,
    } satisfies AgentJobPayload);

    await this.repo.logEvent({
      workflowRunId,
      type: `step.${nextStepType.toLowerCase()}.queued`,
      message: `Step ${nextStepType} queued from ${stepType} v${version}`,
      metadataJson: { parentVersionId: approvedNode.id, incomingGuidance: incomingGuidance ?? null },
    });

    log.info({ workflowRunId, stepType, nextStepType }, "Step approved and next step queued");
    return { success: true, data: { nextStep: nextStepType } };
  }

  /**
   * Fork: rerun the same step as a new node that is a sibling of the current one
   * (parent = the current node's parent), so the old branch stays intact for review.
   */
  async rerunStep(params: {
    workflowRunId: number;
    stepType: StepType;
    feedback: string;
  }): Promise<TransitionResult> {
    const { workflowRunId, stepType, feedback } = params;

    const run = await this.repo.getWorkflowRun(workflowRunId);
    if (!run) return { success: false, error: "Workflow not found", status: 404 };

    const step = await this.repo.getWorkflowStep(workflowRunId, stepType);
    if (!step || step.currentVersion == null) {
      return { success: false, error: `Step ${stepType} has no existing version to rerun`, status: 400 };
    }

    const currentNode = await this.repo.getStepVersion(step.id, step.currentVersion);
    if (!currentNode) {
      return {
        success: false,
        error: `Step ${stepType} v${step.currentVersion} not found`,
        status: 404,
      };
    }

    const downstream = getDownstreamStepTypes(stepType);
    if (downstream.length > 0) {
      await this.repo.setDownstreamStepsStale(workflowRunId, downstream);
      await this.repo.logEvent({
        workflowRunId,
        type: "workflow.downstream_invalidated",
        message: `Downstream steps invalidated by fork of ${stepType} v${step.currentVersion}`,
        metadataJson: { stepType, downstream, forkFromNodeId: currentNode.id },
      });
    }

    await this.repo.updateWorkflowStep(step.id, { status: "QUEUED" });
    await this.repo.updateWorkflowRun(workflowRunId, { status: "RUNNING", currentStep: stepType });

    await this.queue.enqueue({
      workflowRunId,
      stepType,
      parentVersionId: currentNode.parentVersionId,
      guidance: feedback.trim(),
    } satisfies AgentJobPayload);

    await this.repo.logEvent({
      workflowRunId,
      type: `step.${stepType.toLowerCase()}.forked`,
      message: `Fork ${stepType} from parent ${currentNode.parentVersionId ?? "root"}`,
      metadataJson: {
        stepType,
        forkedFromNodeId: currentNode.id,
        parentVersionId: currentNode.parentVersionId,
        feedback,
      },
    });

    log.info({ workflowRunId, stepType, forkedFromNodeId: currentNode.id }, "Fork enqueued with feedback");
    return { success: true };
  }

  /** Moderator hand-edits the output: the new node inherits directly from the base node. */
  async directEditStep(params: {
    workflowRunId: number;
    stepType: StepType;
    baseVersion: number;
    editedOutputJson: unknown;
    note?: string;
  }): Promise<TransitionResult<{ newVersion: number; output: unknown }>> {
    const { workflowRunId, stepType, baseVersion, editedOutputJson, note } = params;

    const run = await this.repo.getWorkflowRun(workflowRunId);
    if (!run) return { success: false, error: "Workflow not found", status: 404 };

    const step = await this.repo.getWorkflowStep(workflowRunId, stepType);
    if (!step) return { success: false, error: `Step ${stepType} not found`, status: 404 };

    if (step.status !== "WAITING_FOR_HUMAN") {
      return {
        success: false,
        error: `Step must be WAITING_FOR_HUMAN to edit (current: ${step.status})`,
        status: 409,
      };
    }

    if (step.currentVersion !== baseVersion) {
      return {
        success: false,
        error: `Conflict: Step version mismatch (expected ${baseVersion}, current: ${step.currentVersion})`,
        status: 409,
      };
    }

    const parseResult = STEP_OUTPUT_SCHEMAS[stepType].safeParse(editedOutputJson);
    if (!parseResult.success) {
      return {
        success: false,
        error: "Invalid edited output schema",
        details: parseResult.error,
        status: 400,
      };
    }

    const baseNode = await this.repo.getStepVersion(step.id, baseVersion);
    const nextVersion = baseVersion + 1;
    await this.repo.insertStepVersion({
      workflowStepId: step.id,
      version: nextVersion,
      parentVersionId: baseNode?.id ?? null,
      inputJson: { directEdit: true, baseVersion, note: note ?? null },
      outputJson: parseResult.data,
      humanFeedback: note ? `[Direct Edit] ${note}` : "[Direct Edit]",
      validationStatus: "valid",
    });

    await this.repo.updateWorkflowStep(step.id, { currentVersion: nextVersion });

    await this.repo.logEvent({
      workflowRunId,
      type: `step.${stepType.toLowerCase()}.direct_edited`,
      message: `Step ${stepType} directly edited to v${nextVersion}`,
      metadataJson: { baseVersion, newVersion: nextVersion, note: note ?? null },
    });

    return { success: true, data: { newVersion: nextVersion, output: parseResult.data } };
  }

  /** Explicit publish of an approved node (idempotent per approvedVersionId). */
  async publish(workflowRunId: number, approvedVersionId: number, userId: string) {
    return this.publication.publishFromApprovedNode({
      workflowRunId,
      approvedVersionId,
      approvedById: userId,
    });
  }
}
