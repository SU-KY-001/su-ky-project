import { Suspense, type ReactNode } from "react";
import { Skeleton } from "@/shared/components/ui/skeleton";
import type { ModeratorSection } from "../types";

const columns: Record<Exclude<ModeratorSection, "overview">, number> = { timeline: 6, events: 7, sources: 4, podcast: 5, exhibitions: 7, assignments: 4, tickets: 6, pending: 7, schedule: 4, angles: 2, quizzes: 6 };

export function ModeratorContentSkeleton({ section }: { section: Exclude<ModeratorSection, "overview"> }) {
  return <div role="status" aria-busy="true" data-skeleton-layout="table" className="flex w-full min-w-0 flex-col gap-5">
    <span className="sr-only">Đang tải danh sách nội dung…</span>
    <div aria-hidden="true" className="flex items-end justify-between gap-4 border-b border-mod-border pb-4"><div className="flex w-2/3 flex-col gap-3"><Skeleton className="h-8 w-48 max-w-full" /><Skeleton className="h-4 w-96 max-w-full" /></div><Skeleton className="h-10 w-28" /></div>
    <div aria-hidden="true" className="overflow-x-auto rounded-lg border border-mod-border">
      <div className="min-w-[720px]">
        {Array.from({ length: 7 }, (_, row) => <div key={row} className={`grid gap-5 border-b border-mod-border px-4 py-4 last:border-0 ${row === 0 ? "bg-mod-canvas-accent" : ""}`} style={{ gridTemplateColumns: `2fr repeat(${columns[section] - 1}, minmax(0, 1fr))` }}>
          {Array.from({ length: columns[section] }, (_, column) => <Skeleton key={column} className={row === 0 ? "h-4 w-3/4" : "h-5 w-full"} />)}
        </div>)}
      </div>
    </div>
  </div>;
}

export function ModeratorContentBoundary({ section, children }: { section: ModeratorSection; children: ReactNode }) {
  return <Suspense fallback={section === "overview" ? null : <ModeratorContentSkeleton section={section} />}>{children}</Suspense>;
}
