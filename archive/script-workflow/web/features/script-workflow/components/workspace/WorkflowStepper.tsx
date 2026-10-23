import { Diamond } from "@phosphor-icons/react";
import type { StepType, WorkflowStep } from "@repo/shared";
import { cn } from "@/lib/utils";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { GATE_LABELS, STEP_LABELS, STEP_STATUS } from "../../labels";
import { StatusIcon, TONE_TEXT_CLASS } from "./StatusBadge";
import { isOpenable } from "./workspaceModel";

const PENDING_HINT = "Chưa đến bước này";

type WorkflowStepperProps = {
  /** All steps in execution order. */
  steps: readonly WorkflowStep[];
  viewedStep: StepType;
  /** Steps that need attention but are not the one being viewed (shown with a dot). */
  attentionSteps: ReadonlySet<StepType>;
  onSelect: (step: StepType) => void;
};

function stepNumber(steps: readonly WorkflowStep[], type: StepType): number {
  return steps.findIndex((step) => step.type === type) + 1;
}

function StepItem({
  step,
  index,
  viewed,
  attention,
  onSelect,
}: {
  step: WorkflowStep;
  index: number;
  viewed: boolean;
  attention: boolean;
  onSelect: (step: StepType) => void;
}) {
  const descriptor = STEP_STATUS[step.status];
  const openable = isOpenable(step);
  const isGate = step.reviewPolicy === "REVIEW_REQUIRED";
  const isStale = step.status === "STALE";

  const waiting = step.status === "WAITING_FOR_HUMAN";
  const completed = step.status === "COMPLETED";
  const failed = step.status === "FAILED";
  const running = step.status === "RUNNING";

  const numberBadgeClass = viewed
    ? "border-mod-primary bg-mod-primary text-white shadow-sm"
    : waiting
      ? "border-mod-attention bg-mod-attention text-white"
      : completed
        ? "border-mod-success bg-mod-success text-white"
        : failed
          ? "border-mod-danger bg-mod-danger text-white"
          : running
            ? "border-mod-primary bg-sky-100 text-mod-primary-hover"
            : "border-mod-border bg-mod-canvas-accent text-mod-text-muted";

  return (
    <li>
      <button
        type="button"
        aria-current={viewed ? "step" : undefined}
        aria-disabled={openable ? undefined : true}
        title={openable ? undefined : PENDING_HINT}
        onClick={() => {
          if (openable) onSelect(step.type);
        }}
        className={cn(
          "relative flex min-h-11 w-full items-center gap-3 rounded-[12px] border px-3 py-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mod-primary",
          viewed
            ? "border-2 border-mod-primary bg-sky-50/90 shadow-[0_6px_16px_rgba(2,132,199,.12)]"
            : waiting
              ? "border-amber-300 bg-amber-50/70 hover:bg-amber-50"
              : completed
                ? "border-emerald-200/80 bg-emerald-50/30 hover:bg-emerald-50/60"
                : "border-mod-border/70 bg-mod-canvas/60 hover:bg-mod-canvas-accent",
          !openable && "cursor-not-allowed opacity-60 hover:bg-mod-canvas/60",
        )}
      >
        <ModeratorText
          className={cn(
            "grid size-7 shrink-0 place-items-center rounded-full border text-xs font-extrabold",
            numberBadgeClass,
          )}
        >
          {index + 1}
        </ModeratorText>
        <span className="flex min-w-0 flex-1 flex-col gap-0.5">
          <ModeratorText className={cn("flex items-center gap-1.5 text-sm font-extrabold text-mod-text", isStale && "opacity-70")}>
            <span className="truncate">{STEP_LABELS[step.type]}</span>
            {isGate ? (
              <span className="inline-flex shrink-0 items-center gap-0.5 rounded-md border border-amber-300 bg-amber-100 px-1.5 py-0.5 text-[11px] font-extrabold text-mod-attention">
                <Diamond size={11} weight="fill" aria-hidden={true} />
                {GATE_LABELS[step.type]}
                <span className="sr-only"> (cổng duyệt)</span>
              </span>
            ) : null}
          </ModeratorText>
          <ModeratorText className={cn("flex items-center gap-1 text-xs font-bold", TONE_TEXT_CLASS[descriptor.tone])}>
            <StatusIcon status={step.status} size={13} />
            {descriptor.label}
          </ModeratorText>
        </span>
        {attention ? (
          <span className="size-2.5 shrink-0 rounded-full bg-mod-attention ring-4 ring-amber-200/70" role="img" aria-label="Cần chú ý" />
        ) : null}
      </button>
    </li>
  );
}

/** Desktop: vertical list. Under 768px: a "Bước n/7" dropdown (native select keeps it accessible). */
export function WorkflowStepper({ steps, viewedStep, attentionSteps, onSelect }: WorkflowStepperProps) {
  const completedCount = steps.filter((step) => step.status === "COMPLETED").length;
  return (
    <nav
      aria-label="Các bước của kịch bản"
      className="rounded-[16px] border border-mod-border bg-mod-surface p-3.5 shadow-[0_8px_22px_rgba(15,23,42,.04)]"
    >
      <div className="mb-3 flex items-center justify-between gap-2 border-b border-mod-border pb-2.5">
        <ModeratorText className="text-xs font-extrabold uppercase tracking-wider text-mod-text">
          Tiến độ 7 bước
        </ModeratorText>
        <ModeratorText className="rounded-full bg-sky-100 px-2 py-0.5 font-mono text-xs font-extrabold text-mod-primary-hover">
          {completedCount}/{steps.length}
        </ModeratorText>
      </div>

      <div className="md:hidden">
        <label className="flex flex-col gap-1.5">
          <ModeratorText className="text-xs font-bold text-mod-text-muted">
            Bước {stepNumber(steps, viewedStep)}/{steps.length}
          </ModeratorText>
          <select
            value={viewedStep}
            onChange={(event) => {
              const chosen = steps.find((step) => step.type === event.target.value);
              if (chosen && isOpenable(chosen)) onSelect(chosen.type);
            }}
            className="min-h-11 w-full rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-sm font-semibold text-mod-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary"
          >
            {steps.map((step, index) => (
              <option key={step.type} value={step.type} disabled={!isOpenable(step)}>
                {`${index + 1}. ${STEP_LABELS[step.type]} · ${STEP_STATUS[step.status].label}${attentionSteps.has(step.type) ? " · cần chú ý" : ""}`}
              </option>
            ))}
          </select>
        </label>
      </div>

      <ol className="hidden flex-col gap-2 md:flex">
        {steps.map((step, index) => (
          <StepItem
            key={step.type}
            step={step}
            index={index}
            viewed={step.type === viewedStep}
            attention={attentionSteps.has(step.type)}
            onSelect={onSelect}
          />
        ))}
      </ol>
    </nav>
  );
}
