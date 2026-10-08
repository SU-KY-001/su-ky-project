import { isHitlGatedStep, type StepType } from "@repo/shared";
import { logger, type Logger } from "../../../core/logger";
import type { AgentJobDelivery, AgentJobPayload, AgentJobQueue } from "../domain/agent-job-queue";
import { lintOralText, type OralLintResult } from "../domain/oral-linter";
import type { ScriptWorkflowRepository } from "../domain/script-workflow.repository";
import {
  AgentValidationError,
  type StepAgent,
  type StepAgentContext,
} from "../domain/step-agent";
import { getNextStepType } from "../domain/step-order";
import { MAX_AGENT_RETRY_COUNT } from "../script-workflow.constants";
import type { LineageService } from "./lineage.service";

/** Failures caused by missing/invalid content: pg-boss retries cannot fix them. */
const TERMINAL_FAILURE_PATTERN = /lineage thiếu|not found|xuất bản|không tồn tại/i;

/**
 * One handler runs all 7 steps. The steps differ only in output schema (inside the
 * prompt mapper), HITL gate (`isHitlGatedStep`) and the ORALIZER spoken-text linter.
 */
export class AgentStepHandler {
  constructor(
    private readonly repo: ScriptWorkflowRepository,
    private readonly queue: AgentJobQueue,
    private readonly lineage: LineageService,
    private readonly agent: StepAgent
  ) {}

  async handle(payload: AgentJobPayload, delivery: AgentJobDelivery): Promise<void> {
    const { workflowRunId, stepType, parentVersionId } = payload;
    const jobLog = logger.child({ scope: "agent-job", workflowRunId, step: stepType });

    const run = await this.repo.getWorkflowRun(workflowRunId);
    if (!run) throw new Error(`Workflow ${workflowRunId} not found`);

    const step = await this.repo.ensureWorkflowStep(workflowRunId, stepType);
    await this.repo.updateWorkflowStep(step.id, {
      status: "RUNNING",
      errorMessage: null,
      incomingGuidance: payload.guidance ?? null,
    });
    await this.repo.updateWorkflowRun(workflowRunId, { status: "RUNNING", currentStep: stepType });
    await this.repo.logEvent({
      workflowRunId,
      type: `step.${stepType.toLowerCase()}.started`,
      message: `${stepType} started (parent=${parentVersionId ?? "root"})`,
      metadataJson: { stepType, parentVersionId, guidance: payload.guidance ?? null },
    });

    try {
      const lineage = await this.lineage.getAncestryLineage(parentVersionId);

      // Fork/rerun: this step's previous node is context to revise, not an ancestor.
      const ownPrevious =
        payload.guidance && step.currentVersion != null
          ? await this.repo.getStepVersion(step.id, step.currentVersion)
          : null;

      const ctx: StepAgentContext = {
        topic: run.topic,
        predecessorOutputs: lineage.predecessorOutputs,
        ownPreviousOutput: ownPrevious?.outputJson,
        incomingGuidance: payload.guidance ?? null,
        selectedFocusType: payload.narrativeSelection?.selectedFocusType ?? null,
        narrativeSelection: payload.narrativeSelection ?? null,
      };

      if (stepType === "ORALIZER") {
        const { output, lint } = await this.produceOralizedScript(ctx, workflowRunId, jobLog);
        const { node } = await this.lineage.saveStepNode({
          workflowRunId,
          stepType,
          parentVersionId,
          input: nodeInput(payload, lineage.predecessorOutputs),
          output,
          humanFeedback: payload.guidance ?? null,
        });
        await this.repo.logEvent({
          workflowRunId,
          type: "step.oralizer.lint_passed",
          message: `ORALIZER v${node.version} vượt qua linter văn nói (${lint.sentences} câu, ${lint.words} từ)`,
          metadataJson: {
            nodeId: node.id,
            stepType,
            lint: { sentences: lint.sentences, words: lint.words },
          },
        });
        await this.advanceOrGate({ payload, nodeId: node.id, stepId: step.id, stepType });
        return;
      }

      const output = await this.agent.run(stepType, ctx, { workflowRunId });
      const { node } = await this.lineage.saveStepNode({
        workflowRunId,
        stepType,
        parentVersionId,
        input: nodeInput(payload, lineage.predecessorOutputs),
        output,
        humanFeedback: payload.guidance ?? null,
      });
      jobLog.info({ nodeId: node.id, version: node.version }, "Agent step saved");
      await this.advanceOrGate({ payload, nodeId: node.id, stepId: step.id, stepType });
    } catch (err) {
      await this.failStep({
        workflowRunId,
        stepId: step.id,
        stepType,
        err,
        jobLog,
        isFinalAttempt: delivery.isFinalAttempt,
      });
    }
  }

  /**
   * After saving a node: stop at a HITL gate and wait for the Moderator, or auto-run
   * the next step. The next step gets parentVersionId = the node just created, so
   * the branch is preserved.
   */
  private async advanceOrGate(params: {
    payload: AgentJobPayload;
    nodeId: number;
    stepId: number;
    stepType: StepType;
  }): Promise<void> {
    const { payload, nodeId, stepId, stepType } = params;
    const { workflowRunId } = payload;

    if (isHitlGatedStep(stepType)) {
      await this.repo.updateWorkflowStep(stepId, { status: "WAITING_FOR_HUMAN" });
      await this.repo.updateWorkflowRun(workflowRunId, {
        status: "WAITING_FOR_HUMAN",
        currentStep: stepType,
      });
      await this.repo.logEvent({
        workflowRunId,
        type: `step.${stepType.toLowerCase()}.waiting_for_human`,
        message: `${stepType} chờ Moderator duyệt (node ${nodeId})`,
        metadataJson: { stepType, nodeId },
      });
      return;
    }

    const nextStepType = getNextStepType(stepType);
    await this.repo.updateWorkflowStep(stepId, { status: "COMPLETED" });

    if (!nextStepType) {
      await this.repo.updateWorkflowRun(workflowRunId, {
        status: "COMPLETED",
        currentStep: null,
        completedAt: new Date(),
      });
      return;
    }

    await this.repo.ensureWorkflowStep(workflowRunId, nextStepType, "QUEUED");
    await this.repo.updateWorkflowRun(workflowRunId, { status: "RUNNING", currentStep: nextStepType });
    await this.queue.enqueue({
      workflowRunId,
      stepType: nextStepType,
      parentVersionId: nodeId,
      narrativeSelection: payload.narrativeSelection,
    } satisfies AgentJobPayload);
    await this.repo.logEvent({
      workflowRunId,
      type: `step.${nextStepType.toLowerCase()}.queued`,
      message: `${nextStepType} auto-queued from ${stepType} node ${nodeId}`,
      metadataJson: { from: stepType, nodeId, nextStepType },
    });
  }

  /**
   * ORALIZER has a deterministic self-correction loop: when the linter catches
   * punctuation/fragment errors it reruns exactly once with those errors as guidance.
   * Still failing means FAILED (fail-fast) rather than silently publishing broken spoken text.
   */
  private async produceOralizedScript(
    ctx: StepAgentContext,
    workflowRunId: number,
    jobLog: Logger
  ) {
    let guidance = ctx.incomingGuidance ?? null;

    for (let attempt = 0; attempt <= MAX_AGENT_RETRY_COUNT; attempt += 1) {
      const output = await this.agent.run(
        "ORALIZER",
        { ...ctx, incomingGuidance: guidance },
        { workflowRunId }
      );
      const lint = lintEpisodes(output);
      if (lint.passed) return { output, lint };

      if (attempt === MAX_AGENT_RETRY_COUNT) {
        throw new AgentValidationError(
          `Văn nói vẫn lỗi sau ${attempt + 1} lần chạy: ${lint.errorDetails.join(" ")}`,
          JSON.stringify(lint.detailErrors)
        );
      }

      jobLog.warn({ attempt, errors: lint.errorDetails }, "Oral linter failed, regenerating once");
      await this.repo.logEvent({
        workflowRunId,
        type: "step.oralizer.lint_failed",
        message: `Linter văn nói bắt lỗi, chạy lại ORALIZER: ${lint.errorDetails.join(" ")}`,
        metadataJson: { attempt, errorDetails: lint.errorDetails },
      });
      guidance = [ctx.incomingGuidance, `Lỗi văn nói bắt buộc sửa: ${lint.errorDetails.join(" ")}`]
        .filter((part): part is string => !!part && part.length > 0)
        .join("\n\n");
    }

    throw new Error("produceOralizedScript: unreachable");
  }

  private async failStep(params: {
    workflowRunId: number;
    stepId: number;
    stepType: StepType;
    err: unknown;
    jobLog: Logger;
    isFinalAttempt: boolean;
  }): Promise<void> {
    const { workflowRunId, stepId, stepType, err, jobLog, isFinalAttempt } = params;
    const message = err instanceof Error ? err.message : String(err);
    jobLog.error({ err }, `${stepType} job failed`);

    const isContentError =
      err instanceof AgentValidationError || TERMINAL_FAILURE_PATTERN.test(message);

    if (!isContentError && !isFinalAttempt) {
      // pg-boss will redeliver: keep the run RUNNING so clients and the SSE stream
      // do not treat a transient failure as the end of the workflow.
      await this.repo.logEvent({
        workflowRunId,
        type: `step.${stepType.toLowerCase()}.retrying`,
        message,
      });
      throw err;
    }

    // Schema/validation and missing-context errors are content errors: a retry cannot help.
    await this.repo.updateWorkflowStep(stepId, { status: "FAILED", errorMessage: message });
    await this.repo.updateWorkflowRun(workflowRunId, { status: "FAILED", currentStep: stepType });
    await this.repo.logEvent({
      workflowRunId,
      type: `step.${stepType.toLowerCase()}.failed`,
      message,
    });

    // Retries exhausted: surface the failure to pg-boss too (job ends failed, not completed).
    if (!isContentError) throw err;
  }
}

function nodeInput(
  payload: AgentJobPayload,
  predecessorOutputs: Partial<Record<StepType, unknown>>
): Record<string, unknown> {
  // A node stores only a context pointer, not a copy of ancestor outputs:
  // walking parentVersionId rebuilds the full context.
  return {
    parentVersionId: payload.parentVersionId,
    guidance: payload.guidance ?? null,
    narrativeSelection: payload.narrativeSelection ?? null,
    predecessorSteps: Object.keys(predecessorOutputs),
  };
}

function lintEpisodes(script: {
  episodes: readonly { episodeNumber: number; spokenNarration: string }[];
}): OralLintResult {
  const results = script.episodes.map((episode) => ({
    episodeNumber: episode.episodeNumber,
    result: lintOralText(episode.spokenNarration),
  }));

  const errorDetails = results.flatMap(({ episodeNumber, result }) =>
    result.errorDetails.map((detail) => `Tập ${episodeNumber}: ${detail}`)
  );

  return {
    passed: errorDetails.length === 0,
    hasForbiddenHyphens: results.some((r) => r.result.hasForbiddenHyphens),
    hasForbiddenColons: results.some((r) => r.result.hasForbiddenColons),
    hasForbiddenParentheses: results.some((r) => r.result.hasForbiddenParentheses),
    hasFragmentedSentences: results.some((r) => r.result.hasFragmentedSentences),
    errorDetails,
    detailErrors: results.flatMap((r) => r.result.detailErrors),
    sentences: results.reduce((sum, r) => sum + r.result.sentences, 0),
    words: results.reduce((sum, r) => sum + r.result.words, 0),
  };
}
