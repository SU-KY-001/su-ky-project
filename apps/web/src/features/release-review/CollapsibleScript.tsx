import { useState, type ReactElement } from "react";
import { cn } from "@/lib/utils";
import { paragraphCount } from "./readinessLabels";

/** Collapsed to ~150px with a fade so the reviewer sees it is cut; expanded it scrolls inside 360px. */
export function CollapsibleScript({ text }: { text: string }): ReactElement {
  const [open, setOpen] = useState(false);
  const toggleLabel = open ? "Thu gọn" : `Xem hết ${paragraphCount(text)} đoạn`;
  return (
    <div className="space-y-2">
      <div className={cn("relative overflow-hidden", open ? "max-h-[360px] overflow-y-auto" : "max-h-[150px]")} data-testid="script-body">
        <p className="whitespace-pre-wrap text-sm leading-7 [overflow-wrap:anywhere]">{text}</p>
        {open ? null : <div className="pointer-events-none absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-mod-surface to-transparent" aria-hidden="true" />}
      </div>
      <button type="button" className="text-xs font-semibold text-mod-primary hover:underline" aria-expanded={open} onClick={() => setOpen((value) => !value)}>
        {toggleLabel}
      </button>
    </div>
  );
}
