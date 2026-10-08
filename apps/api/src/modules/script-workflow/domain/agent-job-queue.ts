import type { StepType } from "@repo/shared";

export interface NarrativeSelectionPayload {
  selectedFocusType: string;
  seriesTitle: string;
  episodeTitles: [string, string, string];
  editorialNotes?: string;
}

/**
 * Every agent job carries its parent node in the execution tree, not a version
 * number: lineage is rebuilt by walking parentVersionId.
 */
export interface AgentJobPayload {
  workflowRunId: number;
  stepType: StepType;
  /** null = root node of the run (RESEARCHER only). */
  parentVersionId: number | null;
  guidance?: string;
  /** Gate 0 only: the narrative focus the Moderator selected. */
  narrativeSelection?: NarrativeSelectionPayload;
}

export interface AgentJobQueue {
  enqueue(payload: AgentJobPayload): Promise<void>;
}
