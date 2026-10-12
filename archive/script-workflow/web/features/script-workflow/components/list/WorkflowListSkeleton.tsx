const SKELETON_ROWS = 5;
const SKELETON_KEYS = Array.from({ length: SKELETON_ROWS }, (_, index) => `skeleton-${index}`);

/** pulse is suppressed by the global prefers-reduced-motion rule; `motion-safe` keeps it explicit. */
export function WorkflowListSkeleton() {
  return (
    <ul className="flex flex-col gap-3" aria-busy={true} aria-label="Đang tải danh sách kịch bản">
      {SKELETON_KEYS.map((key) => (
        <li key={key} className="flex min-h-[76px] items-center justify-between gap-4 rounded-[12px] border border-mod-border bg-mod-surface p-4 motion-safe:animate-pulse">
          <div className="flex w-full max-w-[420px] flex-col gap-2">
            <div className="h-4 w-3/4 rounded bg-mod-canvas-accent" />
            <div className="h-3 w-1/3 rounded bg-mod-canvas-accent" />
          </div>
          <div className="h-6 w-24 rounded-full bg-mod-canvas-accent" />
        </li>
      ))}
    </ul>
  );
}
