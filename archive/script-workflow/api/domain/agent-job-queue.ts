import type { StepType } from "@repo/shared";

export interface NarrativeSelectionPayload {
  selectedFocusType: string;
  seriesTitle: string;
  episodeTitles: [string, string, string];
  editorialNotes?: string;
}

/** Guards an untyped value (queue payload or stored node input) and returns a valid selection or undefined. */
export function parseNarrativeSelection(value: unknown): NarrativeSelectionPayload | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const titles = raw.episodeTitles;
  if (
    typeof raw.selectedFocusType !== "string" ||
    typeof raw.seriesTitle !== "string" ||
    !Array.isArray(titles) ||
    titles.length !== 3 ||
    !titles.every((title) => typeof title === "string")
  ) {
    return undefined;
  }
  return {
    selectedFocusType: raw.selectedFocusType,
    seriesTitle: raw.seriesTitle,
    episodeTitles: [titles[0] as string, titles[1] as string, titles[2] as string],
    editorialNotes: typeof raw.editorialNotes === "string" ? raw.editorialNotes : undefined,
  };
}

/**
 * Every step now stops for the Moderator, so the Gate 0 selection no longer rides an automatic chain.
 * It is recovered from the `narrativeSelection` stored in an approved/forked node's input.
 */
export function narrativeSelectionFromNodeInput(inputJson: unknown): NarrativeSelectionPayload | undefined {
  if (!inputJson || typeof inputJson !== "object") return undefined;
  return parseNarrativeSelection((inputJson as Record<string, unknown>).narrativeSelection);
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

/** Delivery info from the queue, separate from the business payload. */
export interface AgentJobDelivery {
  /** True when pg-boss will not redeliver this job after a failure. */
  isFinalAttempt: boolean;
}

export interface AgentJobQueue {
  enqueue(payload: AgentJobPayload): Promise<void>;
}
