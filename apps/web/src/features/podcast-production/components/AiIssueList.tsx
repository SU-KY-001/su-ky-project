import type { ReactElement } from "react";
import { RefreshCw } from "lucide-react";
import type { AiCheck, AiCheckItem } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { AI_DOUBT_LABEL, describeCheckProblem } from "../aiCheck/messages";
import { blockNumber, issueLabel, seenSummary, stripDoubtTail, traceLine, type IssueTone } from "../aiCheck/presentation";

export const TONE_CLASS: Record<IssueTone, string> = {
  danger: "bg-mod-danger/10 text-mod-danger",
  info: "bg-focus/10 text-focus",
  muted: "bg-mod-canvas-accent text-mod-text-secondary",
};

export function IssueKindTag({ item }: { item: Pick<AiCheckItem, "kind" | "basis"> }): ReactElement {
  const label = issueLabel(item);
  return <span className={cn("rounded-full px-2 py-0.5 text-xs font-bold", TONE_CLASS[label.tone])}>{label.text}</span>;
}

/** One checklist button per warning; also shown while the check still runs so warnings appear as they arrive. */
export function IssueRows({ items, onOpen }: { items: AiCheckItem[]; onOpen: (itemId: string) => void }): ReactElement {
  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id}>
          <button
            type="button"
            className={cn("w-full rounded-lg border border-mod-border p-3 text-left text-sm hover:border-mod-primary focus-visible:outline-2", item.status === "REVIEWED" && "bg-mod-canvas-accent")}
            aria-label={`Mở cảnh báo: ${item.message}`}
            onClick={() => onOpen(item.id)}
          >
            <span className="flex flex-wrap items-center gap-2 text-xs font-bold">
              <IssueKindTag item={item} />
              <span className="text-mod-text-secondary">Đoạn {blockNumber(item.blockRef)}</span>
              <span className="ml-auto flex items-center gap-1.5">
                {item.appliedAt ? <span className="rounded-full bg-focus/10 px-2 py-0.5 text-focus">đã áp dụng</span> : null}
                <span className={cn("rounded-full px-2 py-0.5", item.status === "REVIEWED" ? "bg-mod-success/10 text-mod-success" : "bg-mod-canvas-accent text-mod-text-secondary")}>
                  {item.status === "REVIEWED" ? "đã xem" : "chưa xem"}
                </span>
              </span>
            </span>
            <span className="mt-1 line-clamp-2 block text-mod-text">{stripDoubtTail(item.message)}</span>
          </button>
        </li>
      ))}
    </ul>
  );
}

interface Props {
  check: AiCheck;
  items: AiCheckItem[];
  onOpen: (itemId: string) => void;
  onRerun: () => void;
}

export function AiIssueList({ check, items, onOpen, onRerun }: Props): ReactElement {
  const problem = describeCheckProblem(check);
  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-lg font-bold text-mod-text">{items.length ? `${items.length} cảnh báo` : "Không có cảnh báo"}</h4>
        <span className="shrink-0 rounded-full bg-mod-attention/10 px-2 py-0.5 text-xs font-bold text-mod-attention">{AI_DOUBT_LABEL}</span>
      </div>
      <p className="text-xs text-mod-text-secondary">{seenSummary(items)}</p>
      <p className="text-xs text-mod-text-secondary">{traceLine(check, items)}</p>
      {problem ? <p role="alert" className="text-sm text-mod-attention">{problem}</p> : null}
      {items.length === 0 && check.status === "SUCCEEDED" && !problem ? (
        <p className="text-sm text-mod-text-secondary">AI không nêu cảnh báo nào. Điều này không có nghĩa kịch bản đã đúng.</p>
      ) : null}
      <IssueRows items={items} onOpen={onOpen} />
      <Button type="button" variant="outline" size="sm" onClick={onRerun}><RefreshCw size={14} aria-hidden="true" /> Rà lại</Button>
      <p className="text-xs text-mod-text-secondary">AI có thể báo nhầm hoặc bỏ sót. Bấm một dòng để xem chi tiết.</p>
    </div>
  );
}
