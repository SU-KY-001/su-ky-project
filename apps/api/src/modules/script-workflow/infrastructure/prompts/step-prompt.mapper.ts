import type { EvaluatedSource, StepType } from "@repo/shared";
import type { StepAgentContext } from "../../domain/step-agent";
import {
  RESEARCHER_SYSTEM_PROMPT,
  buildResearcherPrompt,
} from "./researcher.prompt";
import {
  SOURCE_EVALUATOR_SYSTEM_PROMPT,
  buildSourceEvaluatorPrompt,
} from "./source-evaluator.prompt";
import {
  FACT_EXTRACTOR_SYSTEM_PROMPT,
  buildFactExtractorPrompt,
} from "./fact-extractor.prompt";
import {
  STORY_PLANNER_SYSTEM_PROMPT,
  buildStoryPlannerPrompt,
} from "./story-planner.prompt";
import {
  SCRIPT_WRITER_SYSTEM_PROMPT,
  buildScriptWriterPrompt,
} from "./script-writer.prompt";
import { ORALIZER_SYSTEM_PROMPT, buildOralizerPrompt } from "./oralizer.prompt";
import {
  FACT_CHECKER_SYSTEM_PROMPT,
  buildFactCheckerPrompt,
} from "./fact-checker.prompt";

/** Chỉ RESEARCHER được cầm công cụ web; 6 bước còn lại là thuần LLM. */
export type AgentToolPolicy = "WEB" | "NONE";

export const STEP_TOOL_POLICY: Record<StepType, AgentToolPolicy> = {
  RESEARCHER: "WEB",
  SOURCE_EVALUATOR: "NONE",
  FACT_EXTRACTOR: "NONE",
  STORY_PLANNER: "NONE",
  SCRIPT_WRITER: "NONE",
  ORALIZER: "NONE",
  FACT_CHECKER: "NONE",
};

function json(value: unknown): string {
  return JSON.stringify(value ?? null, null, 2);
}

/** Rút các nguồn Tier 1 từ Evaluated Corpus để Script Writer trích dẫn nguyên văn. */
function tierOneSources(evaluatedCorpus: unknown): EvaluatedSource[] {
  if (!evaluatedCorpus || typeof evaluatedCorpus !== "object") return [];
  const sources = (evaluatedCorpus as { evaluatedSources?: unknown }).evaluatedSources;
  if (!Array.isArray(sources)) return [];
  return sources.filter(
    (source): source is EvaluatedSource =>
      !!source &&
      typeof source === "object" &&
      (source as { tier?: string }).tier === "TIER_1_CHINH_SU"
  );
}

export interface BuiltStepPrompt {
  systemPrompt: string;
  userPrompt: string;
}

export function buildStepPrompt(stepType: StepType, ctx: StepAgentContext): BuiltStepPrompt {
  const own = ctx.ownPreviousOutput ? json(ctx.ownPreviousOutput) : null;

  switch (stepType) {
    case "RESEARCHER":
      return {
        systemPrompt: RESEARCHER_SYSTEM_PROMPT,
        userPrompt: buildResearcherPrompt({
          topic: ctx.topic,
          incomingGuidance: ctx.incomingGuidance,
          previousOutputJson: own,
        }),
      };
    case "SOURCE_EVALUATOR":
      return {
        systemPrompt: SOURCE_EVALUATOR_SYSTEM_PROMPT,
        userPrompt: buildSourceEvaluatorPrompt({
          topic: ctx.topic,
          sourceListJson: json(ctx.predecessorOutputs.RESEARCHER),
          incomingGuidance: ctx.incomingGuidance,
          previousOutputJson: own,
        }),
      };
    case "FACT_EXTRACTOR":
      return {
        systemPrompt: FACT_EXTRACTOR_SYSTEM_PROMPT,
        userPrompt: buildFactExtractorPrompt({
          topic: ctx.topic,
          sourceMatrixJson: json(ctx.predecessorOutputs.SOURCE_EVALUATOR),
          incomingGuidance: ctx.incomingGuidance,
          previousOutputJson: own,
        }),
      };
    case "STORY_PLANNER":
      return {
        systemPrompt: STORY_PLANNER_SYSTEM_PROMPT,
        userPrompt: buildStoryPlannerPrompt({
          topic: ctx.topic,
          researchPackJson: json(ctx.predecessorOutputs.FACT_EXTRACTOR),
          selectedFocusType: ctx.selectedFocusType ?? "DIEN_BIEN",
          narrativeSelection: ctx.narrativeSelection ?? null,
          incomingGuidance: ctx.incomingGuidance,
          previousOutputJson: own,
        }),
      };
    case "SCRIPT_WRITER":
      return {
        systemPrompt: SCRIPT_WRITER_SYSTEM_PROMPT,
        userPrompt: buildScriptWriterPrompt({
          topic: ctx.topic,
          storyOutlineJson: json(ctx.predecessorOutputs.STORY_PLANNER),
          researchPackJson: json(ctx.predecessorOutputs.FACT_EXTRACTOR),
          constSourceJson: json(tierOneSources(ctx.predecessorOutputs.SOURCE_EVALUATOR)),
          selectedFocusType: ctx.selectedFocusType ?? "DIEN_BIEN",
          incomingGuidance: ctx.incomingGuidance,
          previousOutputJson: own,
        }),
      };
    case "ORALIZER":
      return {
        systemPrompt: ORALIZER_SYSTEM_PROMPT,
        userPrompt: buildOralizerPrompt({
          topic: ctx.topic,
          scriptDraftJson: json(ctx.predecessorOutputs.SCRIPT_WRITER),
          incomingGuidance: ctx.incomingGuidance,
          previousOutputJson: own,
        }),
      };
    case "FACT_CHECKER":
      return {
        systemPrompt: FACT_CHECKER_SYSTEM_PROMPT,
        userPrompt: buildFactCheckerPrompt({
          topic: ctx.topic,
          oralizedScriptJson: json(ctx.predecessorOutputs.ORALIZER),
          researchPackJson: json(ctx.predecessorOutputs.FACT_EXTRACTOR),
          incomingGuidance: ctx.incomingGuidance,
          previousOutputJson: own,
        }),
      };
    default: {
      const exhaustive: never = stepType;
      throw new Error(`No prompt mapped for step ${String(exhaustive)}`);
    }
  }
}
