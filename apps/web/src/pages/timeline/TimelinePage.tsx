import { TimelinePeriodList } from "../../features/timeline/TimelinePeriodList";

export function TimelinePage() {
  return (
    <>
      <header>
        <p className="mb-2 text-xs font-mono uppercase tracking-[0.2em] text-amber-400">Biên niên sử</p>
        <h1 className="font-serif text-3xl font-semibold text-white sm:text-4xl">Dòng thời gian lịch sử</h1>
        <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-400">Khám phá các thời kỳ và triều đại trong lịch sử Việt Nam.</p>
      </header>
      <TimelinePeriodList title="Các thời kỳ" description="Danh sách thời kỳ được tải từ Hono RPC." />
    </>
  );
}
