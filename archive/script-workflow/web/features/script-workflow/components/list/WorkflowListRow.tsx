import { Link } from "react-router";
import { CaretRight } from "@phosphor-icons/react";
import { STEP_ORDER, type ScriptWorkflowSummary } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { cn } from "@/lib/utils";
import { workflowDetailPath } from "../../constants";
import { GATE_ACTION_HINTS, GATE_LABELS, STEP_LABELS, WORKFLOW_STATUS, formatDateTime, formatRelative } from "../../labels";
import { StatusBadge } from "../StatusBadge";

const CARET_SIZE = 18;

/** "Gate 0 · Chọn trọng tâm" while waiting on a gate, otherwise "Bước n/7 · tên bước". */
function progressLine(workflow: ScriptWorkflowSummary): string | null {
  if (workflow.status === "COMPLETED") {
    return workflow.completedAt ? `Hoàn tất lúc ${formatDateTime(workflow.completedAt)}` : null;
  }
  const step = workflow.currentStep;
  if (!step) return null;
  const gate = GATE_LABELS[step];
  if (workflow.status === "WAITING_FOR_HUMAN" && gate) return `${gate} · ${GATE_ACTION_HINTS[step] ?? STEP_LABELS[step]}`;
  const position = `Bước ${STEP_ORDER.indexOf(step) + 1}/${STEP_ORDER.length} · ${STEP_LABELS[step]}`;
  return workflow.status === "FAILED" ? `Dừng ở ${position.toLowerCase()}` : position;
}

export function WorkflowListRow({ workflow }: { workflow: ScriptWorkflowSummary }) {
  const waiting = workflow.status === "WAITING_FOR_HUMAN";
  const progress = progressLine(workflow);

  return (
    <li>
      <Link
        to={workflowDetailPath(workflow.id)}
        className={cn(
          "grid min-h-11 grid-cols-[1fr_auto] items-center gap-x-4 gap-y-2 rounded-[12px] border bg-mod-surface p-4 no-underline transition-colors hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary",
          waiting ? "border-2 border-mod-attention" : "border-mod-border",
        )}
      >
        <div className="flex min-w-0 flex-col gap-1">
          <ModeratorText className="line-clamp-2 break-words text-sm font-bold text-mod-text">{workflow.topic}</ModeratorText>
          {progress ? <ModeratorText className="text-xs text-mod-text-muted">{progress}</ModeratorText> : null}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex flex-col items-end gap-1.5 sm:flex-row sm:items-center sm:gap-3">
            <StatusBadge status={WORKFLOW_STATUS[workflow.status]} />
            <ModeratorText className="whitespace-nowrap text-xs text-mod-text-secondary sm:w-24 sm:text-right">
              <time dateTime={workflow.updatedAt} title={formatDateTime(workflow.updatedAt)}>
                {formatRelative(workflow.updatedAt)}
              </time>
            </ModeratorText>
          </div>
          <CaretRight size={CARET_SIZE} className="hidden text-mod-text-low sm:block" aria-hidden={true} />
        </div>
      </Link>
    </li>
  );
}
