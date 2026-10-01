import { BookOpen, Sparkles } from "lucide-react";
import { SystemHealthGrid } from "../../features/system-health/SystemHealthGrid";
import { TimelinePeriodList } from "../../features/timeline/TimelinePeriodList";

export function HomePage() {
  return (
    <>
      <section className="relative overflow-hidden rounded-2xl border border-slate-800 bg-gradient-to-br from-[#131B2A] via-[#0E1522] to-[#0B0F17] p-6 shadow-2xl sm:p-8">
        <div className="pointer-events-none absolute -right-8 -top-8 size-72 rounded-full bg-amber-500/10 blur-3xl" />
        <div className="relative max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
            <Sparkles className="size-3.5" aria-hidden="true" />
            <span>Khung dự án WDP301</span>
          </div>
          <h1 className="font-serif text-3xl font-bold tracking-tight text-white sm:text-4xl">Nền tảng podcast kể chuyện lịch sử Việt Nam</h1>
          <p className="text-sm leading-relaxed text-slate-400 sm:text-base">
            Kết nối dữ liệu lịch sử với những câu chuyện âm thanh, tư liệu và nguồn tham khảo đáng tin cậy.
          </p>
        </div>
      </section>

      <SystemHealthGrid />

      <TimelinePeriodList
        title="Dữ liệu dòng thời gian mẫu"
        description="Được truy vấn tự động thông qua Hono Client client.api.timeline.$get()."
      />

      <section className="space-y-4 rounded-xl border border-dashed border-slate-800 bg-[#0C111A] p-6">
        <h2 className="flex items-center gap-2 text-sm font-bold font-mono uppercase tracking-wider text-slate-300">
          <BookOpen className="size-4 text-indigo-400" aria-hidden="true" />
          Hướng dẫn dành cho frontend team
        </h2>
        <div className="grid grid-cols-1 gap-4 text-xs text-slate-400 md:grid-cols-2">
          <div className="space-y-1.5">
            <h3 className="font-semibold text-slate-200">Tài liệu thiết kế và wireframe</h3>
            <p>Tham khảo <code>docs/design-guidelines.md</code> và wireframe tại <code>docs/wireframe/index.html</code> để áp dụng màu sắc, kiểu chữ và bố cục trình phát podcast.</p>
          </div>
          <div className="space-y-1.5">
            <h3 className="font-semibold text-slate-200">Gọi API với type safety</h3>
            <p>Dùng typed Hono client từ <code>src/shared/api/client.ts</code>; DTO và schema dùng chung được xuất từ <code>@repo/shared</code>.</p>
          </div>
        </div>
      </section>
    </>
  );
}
