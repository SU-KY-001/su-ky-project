import {
  STEP_OUTPUT_SCHEMAS,
  type StepType,
  type StepVersion,
  type WorkflowStep,
} from "@repo/shared";
import { FallbackJsonEditor } from "../gates/FallbackJsonEditor";
import { FactCheckerReportView } from "./FactCheckerReportView";
import { OralizerPanel } from "./OralizerPanel";
import { Callout, ParsedOutput } from "./stepUi";

type FactCheckerPanelProps = {
  output: unknown;
  /** The ORALIZER version on the same branch as the viewed report; null when it cannot be found. */
  oralized: StepVersion | null;
  workflowId?: number;
  step?: WorkflowStep;
  interactive?: boolean;
  editing?: boolean;
  onExitEdit?: () => void;
  onRequestRerun?: (stepType: StepType, prefillFeedback?: string) => void;
  onConflict?: () => void;
};

/** Gate 2: spoken script on the left, review report (or JSON editor) on the right. */
export function FactCheckerPanel({
  output,
  oralized,
  workflowId,
  step,
  interactive = false,
  editing = false,
  onExitEdit,
  onRequestRerun,
  onConflict,
}: FactCheckerPanelProps) {
  return (
    <div className="grid gap-8 xl:grid-cols-2">
      <section aria-label="Văn nói 3 tập" className="min-w-0">
        {oralized ? (
          <OralizerPanel output={oralized.outputJson} />
        ) : (
          <Callout tone="attention" title="Chưa tìm thấy văn nói tương ứng" role="status">
            Không xác định được bản văn nói cùng nhánh với báo cáo này.
          </Callout>
        )}
      </section>
      <section aria-label="Báo cáo kiểm định" className="min-w-0">
        {editing && workflowId !== undefined && step !== undefined && onExitEdit && onConflict ? (
          <FallbackJsonEditor
            workflowId={workflowId}
            step={step}
            output={output}
            onSaved={onExitEdit}
            onCancel={onExitEdit}
            onConflict={onConflict}
          />
        ) : (
          <ParsedOutput schema={STEP_OUTPUT_SCHEMAS.FACT_CHECKER} output={output}>
            {(report) => (
              <FactCheckerReportView
                report={report}
                interactive={interactive}
                onRequestRerun={onRequestRerun}
              />
            )}
          </ParsedOutput>
        )}
      </section>
    </div>
  );
}
