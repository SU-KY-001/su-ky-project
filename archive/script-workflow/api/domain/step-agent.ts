import type { StepPayloadMap, StepType } from "@repo/shared";

export interface StepAgentContext {
  topic: string;
  focusHint: string | null;
  /** Latest output of each earlier step on the ancestor branch. */
  predecessorOutputs: Partial<Record<StepType, unknown>>;
  /** This step's previous output, used when rerunning or regenerating. */
  ownPreviousOutput?: unknown;
  incomingGuidance?: string | null;
  selectedFocusType?: string | null;
  narrativeSelection?: {
    seriesTitle: string;
    episodeTitles: [string, string, string];
    editorialNotes?: string;
  } | null;
}

export interface StepAgentRunOptions {
  workflowRunId: number;
}

export interface StepAgent {
  run<S extends StepType>(
    stepType: S,
    ctx: StepAgentContext,
    options: StepAgentRunOptions
  ): Promise<StepPayloadMap[S]>;
}

/** Agent output was invalid after the self-correction retry: content error, not transient. */
export class AgentValidationError extends Error {
  readonly errors: string;
  constructor(message: string, errors: string) {
    super(message);
    this.name = "AgentValidationError";
    this.errors = errors;
  }
}
