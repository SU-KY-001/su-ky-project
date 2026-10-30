import type { ReactElement } from "react";
import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle";
import { Circle } from "@phosphor-icons/react/dist/icons/Circle";

export function QuizCompletionBadge({ completed }: { completed: boolean }): ReactElement {
  const Icon = completed ? CheckCircle : Circle;
  return <span className={`inline-flex w-fit items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold ${completed ? "border-mod-success/30 bg-mod-success/10 text-mod-success" : "border-bronze/40 bg-paper-deep text-ink-soft"}`}><Icon size={16} weight={completed ? "fill" : "regular"} aria-hidden="true" />{completed ? "Đã hoàn thành" : "Chưa hoàn thành"}</span>;
}
