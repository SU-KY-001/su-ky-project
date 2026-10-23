import type { z } from "zod";
import { ResearcherAgentOutputSchema, STEP_OUTPUT_SCHEMAS, type StepPayloadMap, type StepType } from "@repo/shared";
import type { StepAgent, StepAgentContext, StepAgentRunOptions } from "../../domain/step-agent";
import type { ScriptWorkflowRepository } from "../../domain/script-workflow.repository";
import { STEP_TOOL_POLICY, buildStepPrompt } from "../prompts/step-prompt.mapper";
import { runStructuredAgent } from "./structured-agent-runner";

/**
 * One entry point for all 7 agents: they differ only in system prompt, output
 * schema and tool policy, so a generic runner replaces seven near-identical files.
 */
export class PiStepAgent implements StepAgent {
  constructor(private readonly logEvent: ScriptWorkflowRepository["logEvent"]) {}

  async run<S extends StepType>(
    stepType: S,
    ctx: StepAgentContext,
    options: StepAgentRunOptions
  ): Promise<StepPayloadMap[S]> {
    const { systemPrompt, userPrompt } = buildStepPrompt(stepType, ctx);

    const outputSchema =
      stepType === "RESEARCHER" ? ResearcherAgentOutputSchema : STEP_OUTPUT_SCHEMAS[stepType];
    // The schema map preserves StepType-to-payload correspondence; generic S cannot be narrowed here.
    const schema = outputSchema as unknown as z.ZodType<StepPayloadMap[S]>;

    return runStructuredAgent(systemPrompt, userPrompt, schema, {
      workflowRunId: options.workflowRunId,
      stepType,
      toolPolicy: STEP_TOOL_POLICY[stepType],
      logEvent: this.logEvent,
    });
  }
}
