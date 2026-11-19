import {
  STEP_OUTPUT_SCHEMAS,
  type StepPayloadMap,
  type StepType,
} from "@repo/shared";
import type { StepVersionEntity, WorkflowStepEntity } from "../domain/script-workflow.entity";
import type { ScriptWorkflowRepository } from "../domain/script-workflow.repository";

export interface LineageNode {
  id: number;
  stepType: StepType;
  version: number;
  parentVersionId: number | null;
  outputJson: unknown;
  humanFeedback: string | null;
  createdAt: Date;
}

export interface LineageNodeWithRun extends LineageNode {
  workflowRunId: number;
}

export interface AncestryLineage {
  /** Ancestors in chronological order (root first, ending with the node itself). */
  ancestors: LineageNode[];
  /** stepType -> latest output on the ancestor branch. */
  predecessorOutputs: Partial<Record<StepType, unknown>>;
}

export class LineageService {
  constructor(private readonly repo: ScriptWorkflowRepository) {}

  /**
   * Walks parentVersionId up to the root so a node only sees its own branch;
   * forking never contaminates sibling branches. One recursive query, no per-hop loop.
   */
  async getAncestryLineage(nodeId: number | null): Promise<AncestryLineage> {
    if (nodeId === null) return { ancestors: [], predecessorOutputs: {} };

    const rows = await this.repo.getAncestry(nodeId);
    const ancestors: LineageNode[] = rows.map(({ node, stepType }) => ({
      id: node.id,
      stepType,
      version: node.version,
      parentVersionId: node.parentVersionId,
      outputJson: node.outputJson,
      humanFeedback: node.humanFeedback,
      createdAt: node.createdAt,
    }));

    const predecessorOutputs: Partial<Record<StepType, unknown>> = {};
    for (const node of ancestors) {
      if (node.outputJson != null) predecessorOutputs[node.stepType] = node.outputJson;
    }
    return { ancestors, predecessorOutputs };
  }

  async getNodeWithType(id: number): Promise<LineageNodeWithRun | null> {
    const row = await this.repo.getStepVersionById(id);
    if (!row) return null;
    return {
      id: row.node.id,
      stepType: row.stepType,
      version: row.node.version,
      parentVersionId: row.node.parentVersionId,
      outputJson: row.node.outputJson,
      humanFeedback: row.node.humanFeedback,
      createdAt: row.node.createdAt,
      workflowRunId: row.workflowRunId,
    };
  }

  /**
   * A node only sees ancestors from its own branch. A missing predecessor means
   * a broken fork, so fail loudly instead of running with empty context.
   */
  async loadPredecessorOutput<K extends StepType>(
    parentVersionId: number | null,
    stepType: K
  ): Promise<StepPayloadMap[K]> {
    const { predecessorOutputs } = await this.getAncestryLineage(parentVersionId);
    const output = predecessorOutputs[stepType];
    if (output == null) {
      throw new Error(
        `Lineage thiếu output của bước ${stepType} (parent=${parentVersionId ?? "root"})`
      );
    }
    return STEP_OUTPUT_SCHEMAS[stepType].parse(output) as StepPayloadMap[K];
  }

  findAncestorNode(ancestors: LineageNode[], stepType: StepType): LineageNode | null {
    for (let i = ancestors.length - 1; i >= 0; i -= 1) {
      const node = ancestors[i];
      if (node && node.stepType === stepType) return node;
    }
    return null;
  }

  /**
   * Writes a new immutable node for the running step and points the step's
   * currentVersion at it. Versions count per workflow_step; branches are
   * identified by parentVersionId.
   */
  async saveStepNode<T extends StepType>(params: {
    workflowRunId: number;
    stepType: T;
    parentVersionId: number | null;
    input: unknown;
    output: StepPayloadMap[T];
    humanFeedback?: string | null;
  }): Promise<{ step: WorkflowStepEntity; node: StepVersionEntity }> {
    const step = await this.repo.ensureWorkflowStep(params.workflowRunId, params.stepType);
    const nextVersion = (step.currentVersion ?? 0) + 1;
    const node = await this.repo.insertStepVersion({
      workflowStepId: step.id,
      version: nextVersion,
      parentVersionId: params.parentVersionId,
      inputJson: params.input,
      outputJson: params.output,
      humanFeedback: params.humanFeedback ?? null,
    });
    await this.repo.updateWorkflowStep(step.id, { currentVersion: nextVersion });
    return { step, node };
  }

  /** The (step, version) node: the unit a Moderator approves. */
  async loadNodeByStepVersion(
    workflowRunId: number,
    stepType: StepType,
    version: number
  ): Promise<StepVersionEntity | null> {
    const step = await this.repo.ensureWorkflowStep(workflowRunId, stepType);
    return this.repo.getStepVersion(step.id, version);
  }
}
