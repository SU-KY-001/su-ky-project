import { useState } from "react";
import { ClockCountdown } from "@phosphor-icons/react/dist/icons/ClockCountdown";
import { Eye } from "@phosphor-icons/react/dist/icons/Eye";
import { NotePencil } from "@phosphor-icons/react/dist/icons/NotePencil";
import { useQuery } from "@tanstack/react-query";
import { DashboardHeader } from "@/shared/components/dashboard/DashboardOverview";
import { Button } from "@/shared/components/ui/button";
import { moderatorReleaseService } from "../services/moderatorReleaseService";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { ModeratorReviewDialog, REVIEW_QUEUE_KEY } from "./ModeratorReviewDialog";

interface ReviewQueueSchedule {
  id: string;
  title: string;
  productionDeadline: Date;
  scheduledAt: Date;
  episode: { id: string; title: string; contentRevision: number } | null;
  reviews: Array<{ status: string; revision: number }>;
}

interface ReviewTarget {
  scheduleId: string;
  title: string;
  revision: number;
}

function dateTime(value: Date) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(value);
}

export function ModeratorReviewQueueView({
  schedules,
  onReview,
}: {
  schedules: ReviewQueueSchedule[];
  onReview: (target: ReviewTarget) => void;
}) {
  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="KIỂM DUYỆT ĐỘC LẬP"
        title="Hàng chờ kiểm duyệt"
        description="Đánh giá phiên bản được gửi duyệt. Bạn không thể duyệt nội dung mình được phân công sản xuất."
      />
      {schedules.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {schedules.map((schedule) => {
            const revision = schedule.reviews[0]?.revision ?? schedule.episode?.contentRevision;
            if (!schedule.episode || !revision) return null;
            return (
              <article key={schedule.id} className="rounded-[16px] border border-mod-border bg-mod-surface p-5 shadow-[0_8px_22px_rgba(15,23,42,.03)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <CardBadge type="status" tone="info">Chờ kiểm duyệt</CardBadge>
                      <span className="text-xs font-semibold text-mod-text-secondary">Phiên bản {revision}</span>
                    </div>
                    <h2 className="mt-2 text-lg font-extrabold tracking-tight text-mod-text">{schedule.title}</h2>
                    <p className="mt-1 text-sm text-mod-text-secondary">{schedule.episode.title}</p>
                  </div>
                  <ClockCountdown size={22} className="text-mod-text-low" />
                </div>
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div><dt className="text-xs text-mod-text-secondary">Hạn sản xuất</dt><dd className="mt-1 font-semibold tabular-nums text-mod-text">{dateTime(schedule.productionDeadline)}</dd></div>
                  <div><dt className="text-xs text-mod-text-secondary">Lịch phát hành</dt><dd className="mt-1 font-semibold tabular-nums text-mod-text">{dateTime(schedule.scheduledAt)}</dd></div>
                </dl>
                <div className="mt-5 flex justify-end">
                  <Button type="button" onClick={() => onReview({ scheduleId: schedule.id, title: schedule.title, revision })} className="gap-2 bg-mod-primary text-white hover:bg-mod-primary/90">
                    <Eye size={17} /> Xem và kiểm duyệt
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="grid min-h-72 place-items-center rounded-[16px] border border-mod-border bg-mod-surface p-8 text-center">
          <div><NotePencil size={34} className="mx-auto text-mod-primary" /><h2 className="mt-3 text-base font-bold text-mod-text">Không có podcast chờ duyệt</h2><p className="mt-1 text-sm text-mod-text-secondary">Nội dung của moderator khác sẽ xuất hiện ở đây sau khi gửi duyệt.</p></div>
        </div>
      )}
    </div>
  );
}

export function ModeratorReviewQueue() {
  const queue = useQuery({ queryKey: REVIEW_QUEUE_KEY, queryFn: moderatorReleaseService.reviewQueue });
  const [open, setOpen] = useState<ReviewTarget | null>(null);
  if (queue.isPending) return <div className="ui-skeleton min-h-[360px] rounded-[16px]" aria-label="Đang tải hàng chờ kiểm duyệt" />;
  if (queue.isError) return <p role="alert" className="rounded-[16px] border border-vermilion/25 bg-mod-surface p-6 text-sm text-vermilion">Không tải được hàng chờ kiểm duyệt.</p>;
  return (
    <>
      <ModeratorReviewQueueView schedules={queue.data.items} onReview={setOpen} />
      {open ? <ModeratorReviewDialog scheduleId={open.scheduleId} title={open.title} reviewRevision={open.revision} onClose={() => setOpen(null)} /> : null}
    </>
  );
}
