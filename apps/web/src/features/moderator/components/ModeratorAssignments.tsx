import { useState } from "react";
import { CalendarBlank, CheckCircle, ClockCountdown, LinkSimple, PaperPlaneTilt, WarningCircle } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { DashboardHeader } from "@/shared/components/dashboard/DashboardOverview";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { moderatorReleaseService } from "../services/moderatorReleaseService";
import { CardBadge, cardBadgeToneForStatus } from "@/shared/components/dashboard/CardBadge";

export interface ModeratorAssignmentSummary {
  id: string;
  title: string;
  status: string;
  scheduledAt: Date;
  productionDeadline: Date;
  episode: { id: string; contentRevision: number } | null;
  reviews: Array<{ status: string; revision: number; reviewNote?: string | null }>;
}

export interface AssignableEpisodeSummary {
  id: string;
  title: string;
  seriesTitle: string;
  contentRevision: number;
  updatedAt: Date;
}

interface ProductionReminderSummary {
  id: string;
  scheduleId: string;
  title: string;
  message: string;
  productionDeadline: Date;
}

const stateCopy: Record<string, string> = {
  SCHEDULED: "Đang sản xuất",
  READY_TO_PUBLISH: "Đã duyệt, chờ phát hành",
  PUBLISHING: "Đang phát hành",
  RELEASED: "Đã hoàn thành",
  BLOCKED: "Cần xử lý",
  FAILED: "Phát hành thất bại",
};

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

export function ModeratorAssignmentsView({
  assignments,
  assignableEpisodes = [],
  reminders = [],
  onLinkEpisode = () => undefined,
  onSubmitReview,
  linkingId,
  submittingId,
}: {
  assignments: ModeratorAssignmentSummary[];
  assignableEpisodes?: AssignableEpisodeSummary[];
  reminders?: ProductionReminderSummary[];
  onLinkEpisode?: (scheduleId: string, episodeId: string) => void;
  onSubmitReview: (scheduleId: string, contentRevision: number) => void;
  linkingId?: string | null;
  submittingId?: string | null;
}) {
  const [selectedEpisodes, setSelectedEpisodes] = useState<Record<string, string>>({});
  return (
    <div className="flex flex-col gap-6">
      <DashboardHeader
        eyebrow="SẢN XUẤT PODCAST"
        title="Nhiệm vụ của tôi"
        description="Theo dõi deadline, hoàn thiện toàn bộ nội dung và gửi đúng phiên bản để kiểm duyệt."
      />
      {reminders.length ? (
        <section aria-label="Nhắc việc sắp đến hạn" className="rounded-[16px] border border-amber-300 bg-amber-50 p-4 text-amber-950">
          <div className="flex items-start gap-3">
            <WarningCircle size={22} weight="fill" className="mt-0.5 shrink-0 text-amber-600" />
            <div>
              <h2 className="text-sm font-bold">Nhắc việc trước hạn 24 giờ</h2>
              <ul className="mt-2 space-y-1 text-sm">
                {reminders.slice(0, 3).map((reminder) => (
                  <li key={reminder.id}>{reminder.message}. Hạn {dateTime(reminder.productionDeadline)}.</li>
                ))}
              </ul>
            </div>
          </div>
        </section>
      ) : null}
      {assignments.length ? (
        <div className="grid gap-4 xl:grid-cols-2">
          {assignments.map((assignment) => {
            const latest = assignment.reviews[0];
            const canSubmit =
              Boolean(assignment.episode) &&
              !["READY_TO_PUBLISH", "PUBLISHING", "RELEASED", "CANCELLED"].includes(assignment.status) &&
              latest?.status !== "IN_REVIEW";
            return (
              <article key={assignment.id} className="flex min-h-[238px] flex-col rounded-[16px] border border-mod-border bg-mod-surface p-5 shadow-[0_8px_22px_rgba(15,23,42,.03)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardBadge type="status" tone={cardBadgeToneForStatus(assignment.status)}>{stateCopy[assignment.status] ?? assignment.status}</CardBadge>
                    <h2 className="mt-2 text-lg font-extrabold tracking-tight text-mod-text">{assignment.title}</h2>
                  </div>
                  {assignment.status === "RELEASED" ? <CheckCircle size={22} className="text-mod-primary" /> : <ClockCountdown size={22} className="text-mod-text-low" />}
                </div>
                <dl className="mt-5 grid gap-3 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-xs text-mod-text-secondary">Hạn hoàn thành</dt>
                    <dd className="mt-1 font-semibold tabular-nums text-mod-text">{dateTime(assignment.productionDeadline)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-mod-text-secondary">Thời gian phát hành</dt>
                    <dd className="mt-1 font-semibold tabular-nums text-mod-text">{dateTime(assignment.scheduledAt)}</dd>
                  </div>
                </dl>
                {latest?.status === "CHANGES_REQUESTED" && latest.reviewNote ? (
                  <p className="mt-4 rounded-[12px] border border-vermilion/20 bg-vermilion/5 p-3 text-xs leading-5 text-mod-text">
                    Nhận xét kiểm duyệt: {latest.reviewNote}
                  </p>
                ) : null}
                {!assignment.episode ? (
                  <div className="mt-4 rounded-[12px] border border-mod-border bg-mod-canvas p-3">
                    <label className="text-xs font-semibold text-mod-text" htmlFor={`episode-${assignment.id}`}>
                      Podcast nháp của bạn
                    </label>
                    <div className="mt-2 flex flex-col gap-2 sm:flex-row">
                      <select
                        id={`episode-${assignment.id}`}
                        value={selectedEpisodes[assignment.id] ?? ""}
                        onChange={(event) => setSelectedEpisodes((current) => ({ ...current, [assignment.id]: event.target.value }))}
                        className="h-10 min-w-0 flex-1 rounded-[10px] border border-mod-border bg-mod-surface px-3 text-sm text-mod-text outline-none focus:border-mod-primary"
                      >
                        <option value="">Chọn podcast để thực hiện</option>
                        {assignableEpisodes.map((episode) => (
                          <option key={episode.id} value={episode.id}>{episode.seriesTitle}: {episode.title}</option>
                        ))}
                      </select>
                      <Button
                        type="button"
                        disabled={!selectedEpisodes[assignment.id] || linkingId === assignment.id}
                        onClick={() => onLinkEpisode(assignment.id, selectedEpisodes[assignment.id]!)}
                        className="gap-2 bg-mod-primary text-white hover:bg-mod-primary/90"
                      >
                        <LinkSimple size={17} />
                        {linkingId === assignment.id ? "Đang gắn" : "Gắn podcast"}
                      </Button>
                    </div>
                    {!assignableEpisodes.length ? <p className="mt-2 text-xs text-mod-text-secondary">Hãy tạo podcast nháp trong khu vực Sản xuất podcast trước.</p> : null}
                  </div>
                ) : null}
                <div className="mt-auto flex items-center justify-between gap-3 pt-5">
                  <span className="flex items-center gap-1.5 text-xs text-mod-text-secondary">
                    <CalendarBlank size={15} />
                    {assignment.episode ? `Phiên bản ${assignment.episode.contentRevision}` : "Chưa liên kết podcast"}
                  </span>
                  {canSubmit && assignment.episode ? (
                    <Button
                      type="button"
                      disabled={submittingId === assignment.id}
                      onClick={() => onSubmitReview(assignment.id, assignment.episode!.contentRevision)}
                      className="gap-2 bg-mod-primary text-white hover:bg-mod-primary/90"
                    >
                      <PaperPlaneTilt size={17} />
                      {submittingId === assignment.id ? "Đang gửi" : "Gửi duyệt"}
                    </Button>
                  ) : null}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="grid min-h-72 place-items-center rounded-[16px] border border-mod-border bg-mod-surface p-8 text-center">
          <div>
            <CheckCircle size={34} className="mx-auto text-mod-primary" />
            <h2 className="mt-3 text-base font-bold text-mod-text">Chưa có nhiệm vụ đang mở</h2>
            <p className="mt-1 text-sm text-mod-text-secondary">Các lịch được Admin phân công sẽ xuất hiện tại đây.</p>
          </div>
        </div>
      )}
    </div>
  );
}

export function ModeratorAssignments() {
  const queryClient = useQueryClient();
  const assignments = useQuery({
    queryKey: ["moderator-release-assignments"],
    queryFn: moderatorReleaseService.assignments,
  });
  const episodes = useQuery({
    queryKey: ["moderator-assignable-episodes"],
    queryFn: moderatorReleaseService.assignableEpisodes,
  });
  const reminders = useQuery({
    queryKey: ["moderator-release-reminders"],
    queryFn: moderatorReleaseService.reminders,
  });
  const link = useMutation({
    mutationFn: ({ scheduleId, episodeId }: { scheduleId: string; episodeId: string }) =>
      moderatorReleaseService.linkEpisode(scheduleId, episodeId),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["moderator-release-assignments"] }),
        queryClient.invalidateQueries({ queryKey: ["moderator-assignable-episodes"] }),
      ]);
    },
  });
  const submit = useMutation({
    mutationFn: ({ scheduleId, revision }: { scheduleId: string; revision: number }) =>
      moderatorReleaseService.submitReview(scheduleId, revision),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["moderator-release-assignments"] }),
  });
  if (assignments.isPending || episodes.isPending || reminders.isPending)
    return <div className="ui-skeleton min-h-[360px] rounded-[16px]" aria-label="Đang tải nhiệm vụ" />;
  if (assignments.isError || episodes.isError || reminders.isError)
    return <p role="alert" className="rounded-[16px] border border-vermilion/25 bg-mod-surface p-6 text-sm text-vermilion">Không tải được nhiệm vụ được phân công.</p>;
  return (
    <ModeratorAssignmentsView
      assignments={assignments.data.items}
      assignableEpisodes={episodes.data.items}
      reminders={reminders.data.items}
      linkingId={link.isPending ? link.variables?.scheduleId : null}
      submittingId={submit.isPending ? submit.variables?.scheduleId : null}
      onLinkEpisode={(scheduleId, episodeId) => link.mutate({ scheduleId, episodeId })}
      onSubmitReview={(scheduleId, revision) => submit.mutate({ scheduleId, revision })}
    />
  );
}
