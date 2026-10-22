import type { ReactElement } from "react";
import type { AiCheck, AiCheckItem } from "@repo/shared";
import { cn } from "@/lib/utils";
import { AI_DOUBT_LABEL, describeCheckProblem } from "../aiCheck/messages";

const KIND_LABEL = { FACT_DOUBT: "nghi sai", READABILITY: "đọc thành tiếng" } as const;

export function AiIssueList({ check, items, onOpen }: { check: AiCheck; items: AiCheckItem[]; onOpen: (itemId: string) => void }): ReactElement {
  const reviewed = items.filter((item) => item.status === "REVIEWED").length;
  const problem = describeCheckProblem(check);
  const cancelled = check.status === "CANCELLED";
  return (
    <div className="space-y-3">
      <div>
        <p className="font-semibold text-mod-text">{items.length} cảnh báo, {reviewed} đã xem</p>
        <p className="text-xs text-mod-text-secondary">{AI_DOUBT_LABEL}</p>
      </div>
      {cancelled ? <p className="text-sm text-mod-text-secondary">Đã hủy lượt rà. Kết quả bên dưới chưa đầy đủ.</p> : null}
      {problem ? <p role="alert" className="text-sm text-mod-warning">{problem}</p> : null}
      {items.length === 0 && check.status === "SUCCEEDED" && !problem ? (
        <p className="text-sm text-mod-text-secondary">AI không nêu cảnh báo nào. Điều này không có nghĩa kịch bản đã đúng.</p>
      ) : null}
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
                <span className="rounded-full bg-mod-attention/10 px-2 py-0.5 text-mod-attention">{KIND_LABEL[item.kind]}</span>
                <span className="text-mod-text-secondary">{item.status === "REVIEWED" ? "đã xem" : "chưa xem"}</span>
                {item.appliedAt ? <span className="rounded-full bg-mod-success/10 px-2 py-0.5 text-mod-success">đã áp dụng</span> : null}
              </span>
              <span className="mt-1 line-clamp-2 block text-mod-text">{item.message}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
