import type { ReactElement } from "react";
import { Lightbulb } from "@phosphor-icons/react/dist/icons/Lightbulb";

export function QuizExplanation({ text }: { text: string }): ReactElement {
  return <div className="mt-4 rounded-lg border border-bronze/25 bg-paper-deep/50 p-4 sm:p-5">
    <div className="flex items-center gap-2 text-bronze-dark"><Lightbulb size={19} weight="duotone" aria-hidden="true" /><h4 className="text-sm font-semibold">Lời giải</h4></div>
    <p className="mt-2 whitespace-pre-line text-sm leading-7 text-ink-soft [overflow-wrap:anywhere]">{text}</p>
  </div>;
}
