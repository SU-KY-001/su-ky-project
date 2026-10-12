import { OralizedScriptSchema, type OralizedScript } from "@repo/shared";
import type { ScriptPublicationEntity } from "../domain/script-workflow.entity";
import type { ScriptWorkflowRepository } from "../domain/script-workflow.repository";
import type { LineageService } from "./lineage.service";

/** Business-rule failure while publishing (maps to HTTP 400). */
export class PublicationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PublicationError";
  }
}

/** Published script = the 3 spoken episodes joined, keeping each episode title as a marker. */
export function buildFinalScript(script: OralizedScript): string {
  return script.episodes
    .map((episode) => `# ${episode.episodeTitle}\n\n${episode.spokenNarration}`)
    .join("\n\n---\n\n");
}

export function totalEstimatedSeconds(script: OralizedScript): number {
  return script.episodes.reduce((sum, episode) => sum + episode.estimatedDurationSeconds, 0);
}

export class PublicationService {
  constructor(
    private readonly repo: ScriptWorkflowRepository,
    private readonly lineage: LineageService
  ) {}

  /**
   * Gate 2: writes an immutable publication pointing at the node the Moderator
   * approved. Idempotent per approvedVersionId so a double click cannot duplicate it.
   */
  async publishFromApprovedNode(params: {
    workflowRunId: number;
    approvedVersionId: number;
    approvedById: string;
  }): Promise<ScriptPublicationEntity> {
    const approvedNode = await this.lineage.getNodeWithType(params.approvedVersionId);
    if (!approvedNode) {
      throw new PublicationError(`Node ${params.approvedVersionId} không tồn tại`);
    }
    if (approvedNode.workflowRunId !== params.workflowRunId) {
      throw new PublicationError("Node không thuộc workflow này");
    }

    // Only a FACT_CHECKER node the Moderator approved at Gate 2 may be published.
    if (approvedNode.stepType !== "FACT_CHECKER") {
      throw new PublicationError("Chỉ node FACT_CHECKER đã duyệt mới được xuất bản");
    }
    const factCheckerStep = await this.repo.getWorkflowStep(params.workflowRunId, "FACT_CHECKER");
    if (!factCheckerStep || factCheckerStep.approvedVersion !== approvedNode.version) {
      throw new PublicationError("Node chưa được Moderator duyệt ở Gate 2");
    }

    const existing = await this.repo.findPublicationByApprovedVersionId(params.approvedVersionId);
    if (existing) {
      return existing;
    }

    const { ancestors } = await this.lineage.getAncestryLineage(params.approvedVersionId);
    const oralizerNode = this.lineage.findAncestorNode(ancestors, "ORALIZER");
    if (!oralizerNode) {
      throw new PublicationError(
        "Không tìm thấy bản kịch bản văn nói (ORALIZER) trên nhánh được duyệt"
      );
    }

    const script = OralizedScriptSchema.parse(oralizerNode.outputJson);
    return this.repo.insertPublication({
      workflowRunId: params.workflowRunId,
      approvedVersionId: params.approvedVersionId,
      approvedById: params.approvedById,
      finalScript: buildFinalScript(script),
      wordCount: script.totalWordCount,
      estimatedDurationSeconds: totalEstimatedSeconds(script),
    });
  }
}
