import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen, CalendarBlank, CheckCircle, Medal, Question, Target, XCircle } from "@phosphor-icons/react";
import { Link } from "react-router";
import { listeningService, type WeeklyMission } from "@/features/listening/services/listeningService";
import { MainHeader } from "@/shared/components/common/MainHeader";
import { APP_PATHS } from "@/shared/constants/routes";
import { cn } from "@/lib/utils";

function formatWeekDate(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit" }).format(new Date(value));
}

function currentMonthValue(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

function formatCompletedAt(value: string): string {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function MissionCard({ mission }: { mission: WeeklyMission }) {
  const completed = mission.status === "COMPLETED";
  const expired = mission.status === "EXPIRED";
  const percent = Math.min(100, (mission.progressCount / mission.targetCount) * 100);
  const Icon = mission.activityType === "COMPLETE_EPISODE" ? BookOpen : Question;

  return (
    <article className={cn(
      "rounded-xl border bg-paper-soft p-5",
      completed ? "border-emerald-500/40" : "border-line",
      expired && "opacity-60",
    )}>
      <div className="flex items-start gap-4">
        <span className={cn(
          "grid size-11 shrink-0 place-items-center rounded-full",
          completed ? "bg-emerald-100 text-emerald-700" : "bg-bronze/15 text-bronze-dark",
        )}>
          {completed ? <CheckCircle size={23} weight="fill" aria-hidden /> : <Icon size={22} weight="fill" aria-hidden />}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h2 className="font-bold text-ink">{mission.title}</h2>
            <span className="rounded-full bg-bronze/10 px-2.5 py-1 text-xs font-bold text-bronze-dark">
              +{mission.xpReward} XP
            </span>
          </div>
          <p className="mt-1 text-sm text-ink-soft">
            {mission.activityType === "COMPLETE_EPISODE" ? "Hoàn thành tập podcast" : "Vượt qua bài khảo hạch"}
          </p>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-paper-deep" role="progressbar" aria-valuemin={0} aria-valuemax={mission.targetCount} aria-valuenow={Math.min(mission.progressCount, mission.targetCount)}>
            <div className={cn("h-full rounded-full", completed ? "bg-emerald-500" : "bg-vermilion")} style={{ width: `${percent}%` }} />
          </div>
          <p className="mt-2 text-xs font-semibold text-ink-soft">
            {Math.min(mission.progressCount, mission.targetCount)} / {mission.targetCount}
            {completed ? " · Đã hoàn thành" : expired ? " · Đã kết thúc" : ""}
          </p>
          {mission.completedAt ? <p className="mt-1 text-xs text-ink-soft">Hoàn thành lúc {formatCompletedAt(mission.completedAt)}</p> : null}
        </div>
      </div>
    </article>
  );
}

function MissionSkeleton() {
  return <div className="h-40 animate-pulse rounded-xl border border-line bg-paper-soft" />;
}

export function WeeklyMissionsPage() {
  const [selectedMonth, setSelectedMonth] = useState(currentMonthValue);
  const { data, status, error, refetch } = useQuery({
    queryKey: ["weekly-missions"],
    queryFn: () => listeningService.getWeeklyMissions(),
    staleTime: 30_000,
  });
  const monthlyReview = useQuery({
    queryKey: ["monthly-mission-review", selectedMonth],
    queryFn: () => listeningService.getMonthlyMissionReview(selectedMonth),
    enabled: /^\d{4}-\d{2}$/.test(selectedMonth),
    staleTime: 30_000,
  });

  return (
    <div className="min-h-screen bg-paper">
      <MainHeader />
      <header className="bg-night py-12">
        <div className="mx-auto max-w-3xl px-5 text-center">
          <Target size={34} weight="fill" className="mx-auto text-bronze" aria-hidden />
          <p className="mt-3 text-xs font-bold uppercase tracking-widest text-bronze">Hành trình nghe sử</p>
          <h1 className="mt-1 font-serif text-3xl font-bold text-paper-soft">Nhiệm vụ tuần</h1>
          <p className="mt-2 text-sm text-paper-deep/70">
            {data ? `${formatWeekDate(data.weekStartDate)} – ${formatWeekDate(data.weekEndDate)}` : "Hoàn thành mục tiêu để nhận thêm XP."}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">
        {status === "pending" ? (
          <div className="grid gap-4 sm:grid-cols-2"><MissionSkeleton /><MissionSkeleton /></div>
        ) : status === "error" ? (
          <div className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-line p-8 text-center">
            <h2 className="font-bold text-ink">Không thể tải nhiệm vụ tuần</h2>
            <p className="text-sm text-ink-soft">{error instanceof Error ? error.message : "Lỗi không xác định"}</p>
            <button type="button" onClick={() => void refetch()} className="rounded-lg bg-vermilion px-4 py-2 text-sm font-semibold text-paper-soft hover:bg-vermilion-dark">Thử lại</button>
          </div>
        ) : (
          <>
            <section className="mb-6 flex items-center justify-between rounded-xl border border-bronze/30 bg-bronze/10 p-4" aria-label="Điểm kinh nghiệm">
              <div className="flex items-center gap-3">
                <Medal size={28} weight="fill" className="text-bronze-dark" aria-hidden />
                <div><p className="text-xs font-semibold uppercase tracking-wide text-ink-soft">Tổng điểm</p><p className="text-xl font-bold text-ink">{data.totalXp} XP</p></div>
              </div>
              <Link to={APP_PATHS.series} className="text-sm font-semibold text-vermilion hover:underline">Khám phá series</Link>
            </section>
            {data.items.length ? (
              <div className="grid gap-4 sm:grid-cols-2">{data.items.map((mission) => <MissionCard key={mission.id} mission={mission} />)}</div>
            ) : (
              <div className="rounded-xl border border-line p-8 text-center"><p className="font-semibold text-ink">Tuần này chưa có nhiệm vụ.</p><p className="mt-1 text-sm text-ink-soft">Hãy quay lại sau để nhận thử thách mới.</p></div>
            )}

            <section className="mt-10 border-t border-line pt-8" aria-labelledby="monthly-review-heading">
              <div className="mb-5 flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-xs font-bold uppercase tracking-widest text-bronze">Lịch sử nhiệm vụ</p>
                  <h2 id="monthly-review-heading" className="mt-1 font-serif text-2xl font-bold text-ink">Tổng kết theo tháng</h2>
                </div>
                <div>
                  <label htmlFor="mission-review-month" className="mb-1 block text-xs font-semibold text-ink-soft">Chọn tháng</label>
                  <div className="flex items-center gap-2 rounded-lg border border-line bg-paper-soft px-3 focus-within:border-bronze">
                    <CalendarBlank size={17} className="text-bronze" aria-hidden />
                    <input id="mission-review-month" type="month" value={selectedMonth} onChange={(event) => setSelectedMonth(event.target.value)} className="h-10 bg-transparent text-sm text-ink outline-none" />
                  </div>
                </div>
              </div>

              {monthlyReview.status === "pending" ? (
                <div className="grid gap-3 sm:grid-cols-3"><MissionSkeleton /><MissionSkeleton /><MissionSkeleton /></div>
              ) : monthlyReview.status === "error" ? (
                <div className="rounded-xl border border-line bg-paper-soft p-5 text-sm text-vermilion" role="alert">Không thể tải tổng kết tháng. Vui lòng thử lại.</div>
              ) : monthlyReview.data.totalCount === 0 ? (
                <div className="rounded-xl border border-line bg-paper-soft p-8 text-center">
                  <p className="font-semibold text-ink">Tháng này chưa có nhiệm vụ được kích hoạt.</p>
                  <p className="mt-1 text-sm text-ink-soft">Các tuần có nhiệm vụ sẽ xuất hiện tại đây.</p>
                </div>
              ) : (
                <>
                  <div className="mb-5 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-line bg-paper-soft p-4"><p className="text-xs font-semibold text-ink-soft">Tổng nhiệm vụ</p><p className="mt-1 text-2xl font-bold text-ink">{monthlyReview.data.totalCount}</p></div>
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-50 p-4"><p className="flex items-center gap-1 text-xs font-semibold text-emerald-800"><CheckCircle weight="fill" />Đã hoàn thành</p><p className="mt-1 text-2xl font-bold text-emerald-900">{monthlyReview.data.completedCount}</p></div>
                    <div className="rounded-xl border border-vermilion/25 bg-vermilion/5 p-4"><p className="flex items-center gap-1 text-xs font-semibold text-vermilion"><XCircle weight="fill" />Đã bỏ lỡ</p><p className="mt-1 text-2xl font-bold text-ink">{monthlyReview.data.expiredCount}</p></div>
                  </div>
                  <div className="space-y-5">
                    {monthlyReview.data.weeks.filter((week) => week.items.length > 0).map((week) => (
                      <section key={week.weekStartDate} aria-label={`Tuần ${formatWeekDate(week.weekStartDate)}`}>
                        <h3 className="mb-3 text-sm font-bold text-ink">Tuần {formatWeekDate(week.weekStartDate)} – {formatWeekDate(week.weekEndDate)}</h3>
                        <div className="grid gap-3 sm:grid-cols-2">{week.items.map((mission) => <MissionCard key={mission.id} mission={mission} />)}</div>
                      </section>
                    ))}
                  </div>
                </>
              )}
            </section>
          </>
        )}
      </main>
    </div>
  );
}
