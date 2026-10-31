import { STEP_OUTPUT_SCHEMAS, type WorkflowStep } from "@repo/shared";
import { ParsedOutput } from "./stepUi";
import { InteractiveGate0Content } from "./ResearcherGate0Content";
import { ResearcherReadOnlyView } from "./ResearcherReadOnlyView";

type ResearcherPanelProps = {
  output: unknown;
  workflowId?: number;
  step?: WorkflowStep;
  interactive?: boolean;
  onConflict?: () => void;
};

/** Gate 0 view: interactive source catalogue + narrative focus selector when waiting for moderator; read-only otherwise. */
export function ResearcherPanel({
  output,
  workflowId,
  step,
  interactive = false,
  onConflict,
}: ResearcherPanelProps) {
  return (
    <ParsedOutput schema={STEP_OUTPUT_SCHEMAS.RESEARCHER} output={output}>
      {(data) => {
        if (interactive && workflowId !== undefined && step !== undefined && onConflict !== undefined) {
          return <InteractiveGate0Content workflowId={workflowId} step={step} data={data} onConflict={onConflict} />;
        }
        return <ResearcherReadOnlyView data={data} />;
      }}
    </ParsedOutput>
  );
}
