import { Clock3, Play } from "lucide-react";

export function PlayerDock() {
  return (
    <section aria-label="Trình phát thu gọn" className="border-t border-slate-800 bg-[#0F1420]/95 px-4 py-3 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400" aria-hidden="true">
            <Play className="size-4 fill-current" aria-hidden="true" />
          </span>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-200">Bạch Đằng 938: Ngô Quyền</p>
            <p className="text-[11px] font-mono text-slate-500">Trình phát sẽ được hoàn thiện trong bước tiếp theo</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2 text-xs font-mono text-slate-500">
          <Clock3 className="size-3.5" aria-hidden="true" />
          <span>00:00 / 19:00</span>
        </div>
      </div>
    </section>
  );
}
