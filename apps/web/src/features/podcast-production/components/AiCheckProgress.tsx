import type { ReactElement } from "react";
import { X } from "lucide-react";
import type { AiCheck } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";

const PERCENT = 100;
/** Keeps the bar visibly moving before the first block returns (processed 0 of N). */
const MIN_FILL_PERCENT = 8;

export function AiCheckProgress({ check, found, onCancel }: { check: Pick<AiCheck, "processedBlocks" | "totalBlocks" | "failedBlocks">; found: number; onCancel?: () => void }): ReactElement {
  const done = check.totalBlocks > 0 ? Math.round((check.processedBlocks / check.totalBlocks) * PERCENT) : 0;
  const fill = Math.min(PERCENT, Math.max(MIN_FILL_PERCENT, done));
  return (
    <div className="space-y-3" role="status" aria-busy="true">
      <div className="flex items-center justify-between gap-2">
        <h4 className="font-bold text-mod-text">AI đang rà…</h4>
        <span className="rounded-full bg-focus/10 px-2 py-0.5 text-xs font-bold text-focus">Đang chạy</span>
      </div>
      <div role="progressbar" aria-valuemin={0} aria-valuemax={PERCENT} aria-valuenow={done} aria-label="Tiến độ rà" className="h-2 overflow-hidden rounded-full bg-mod-canvas-accent">
        <span className="block h-full rounded-full bg-mod-primary transition-[width] duration-500" style={{ width: `${fill}%` }} />
      </div>
      <p className="text-xs text-mod-text-secondary">
        Đã xét {check.processedBlocks}/{check.totalBlocks} đoạn · {found} cảnh báo
        {check.failedBlocks > 0 ? ` · ${check.failedBlocks} đoạn không rà được` : ""}
      </p>
      <p className="text-xs text-mod-text-secondary">Bạn vẫn có thể tiếp tục gõ kịch bản trong lúc chờ.</p>
      {onCancel ? <Button type="button" variant="outline" size="sm" onClick={onCancel}><X size={14} aria-hidden="true" /> Hủy</Button> : null}
    </div>
  );
}
