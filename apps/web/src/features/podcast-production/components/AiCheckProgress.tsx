import { useEffect, useState, type ReactElement } from "react";
import { LoaderCircle } from "lucide-react";
import type { AiCheck } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";

const CLOCK_TICK_MS = 1000;

export function AiCheckProgress({ check, found, onCancel }: { check: AiCheck; found: number; onCancel: () => void }): ReactElement {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), CLOCK_TICK_MS);
    return () => window.clearInterval(timer);
  }, []);
  const seconds = Math.max(0, Math.round((now - check.startedAt.getTime()) / 1000));
  return (
    <div className="space-y-3" role="status" aria-busy="true">
      <p className="flex items-center gap-2 font-semibold text-mod-text">
        <LoaderCircle size={16} className="animate-spin text-mod-primary" aria-hidden="true" /> AI đang chạy…
      </p>
      <p className="text-sm text-mod-text-secondary">
        Đã xét {check.processedBlocks}/{check.totalBlocks} đoạn · {seconds} giây · {found} cảnh báo
        {check.failedBlocks > 0 ? ` · ${check.failedBlocks} đoạn không rà được` : ""}
      </p>
      <p className="text-xs text-mod-text-secondary">Đóng tab vẫn không mất: AI chạy nền, mở lại tập sẽ thấy kết quả.</p>
      <Button type="button" variant="outline" size="sm" onClick={onCancel}>Hủy</Button>
    </div>
  );
}
