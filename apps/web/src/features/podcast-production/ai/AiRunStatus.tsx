import { useEffect, useRef, type ReactElement } from "react";
import { Check, ChevronRight, CircleAlert, TriangleAlert, X } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { formatOffset, useNow, type AiLogEntry, type AiLogKind } from "./aiRunLog";
import { AI_RUN_TEXT } from "./aiRunMessages";

const PERCENT = 100;
/** Keeps the bar visibly moving before the first unit finishes. */
const MIN_FILL_PERCENT = 6;

const KIND_STYLE: Record<AiLogKind, { icon: typeof Check; className: string }> = {
  step: { icon: ChevronRight, className: "text-mod-text-secondary" },
  found: { icon: TriangleAlert, className: "text-mod-attention" },
  done: { icon: Check, className: "text-mod-success" },
  warn: { icon: CircleAlert, className: "text-mod-attention" },
  error: { icon: X, className: "text-mod-danger" },
};

interface Props {
  title: string;
  /** What is being worked on right now. */
  step?: string;
  /** Known progress; omit both for an indeterminate request. */
  done?: number;
  total?: number;
  log?: AiLogEntry[];
  /** Epoch ms the run began; drives the elapsed clock and log offsets. */
  startedAt: number;
  hint?: string;
  onCancel?: () => void;
}

/** The one "AI is running" block: thinking dots, elapsed time, progress, Pi-style event log, cancel. */
export function AiRunStatus({ title, step, done, total, log = [], startedAt, hint, onCancel }: Props): ReactElement {
  const now = useNow(true);
  const tail = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const list = tail.current;
    if (list) list.scrollTop = list.scrollHeight;
  }, [log.length]);
  const known = total !== undefined && total > 0 && done !== undefined;
  const percent = known ? Math.round((done / total) * PERCENT) : 0;
  return (
    <div className="space-y-3 rounded-xl bg-mod-canvas-accent p-3" role="status" aria-busy="true">
      <div className="flex items-center gap-2.5 text-sm font-bold text-mod-text">
        <span className="flex h-4 items-center gap-1" aria-hidden="true">
          {[0, 1, 2].map((dot) => <i key={dot} className="ai-think-dot size-1.5 rounded-full bg-mod-primary" />)}
        </span>
        <span className="min-w-0 flex-1">{title}</span>
        <span className="text-xs font-semibold tabular-nums text-mod-text-secondary">{formatOffset(now - startedAt)}</span>
      </div>
      {step ? <p className="text-sm text-mod-text-secondary">{step}</p> : null}
      {known ? (
        <div className="h-1.5 overflow-hidden rounded-full bg-mod-border" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={done}>
          <div className="h-full rounded-full bg-mod-primary transition-[width] duration-500" style={{ width: `${Math.max(MIN_FILL_PERCENT, percent)}%` }} />
        </div>
      ) : null}
      {log.length > 0 ? (
        <ol ref={tail} aria-label={AI_RUN_TEXT.logLabel} className="max-h-32 space-y-1 overflow-y-auto text-xs">
          {log.map((entry) => {
            const { icon: Icon, className } = KIND_STYLE[entry.kind];
            return (
              <li key={entry.id} className="flex items-start gap-1.5">
                <span className="w-9 shrink-0 tabular-nums text-mod-text-low">{formatOffset(entry.at - startedAt)}</span>
                <Icon size={13} className={cn("mt-0.5 shrink-0", className)} aria-hidden="true" />
                <span className="min-w-0 text-mod-text-muted">{entry.text}</span>
              </li>
            );
          })}
        </ol>
      ) : null}
      {hint ? <p className="text-xs text-mod-text-secondary">{hint}</p> : null}
      {onCancel ? <Button type="button" variant="outline" size="sm" onClick={onCancel}><X size={14} aria-hidden="true" /> {AI_RUN_TEXT.cancel}</Button> : null}
    </div>
  );
}
