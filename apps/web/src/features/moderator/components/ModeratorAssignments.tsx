import { useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { errorMessage } from "@/lib/apiError";
import { notify } from "@/shared/lib/notifications";
import { moderatorReleaseService } from "../services/moderatorReleaseService";
import { ModeratorAssignmentsView } from "./ModeratorAssignmentsTable";

export { ModeratorAssignmentsView } from "./ModeratorAssignmentsTable";

export interface ModeratorAssignmentSummary {
  id: string;
  title: string;
  status: string;
  scheduledAt: Date;
  productionDeadline: Date;
  episode: { id: string; title?: string; contentRevision: number } | null;
  reviews: Array<{ status: string; revision: number; reviewNote?: string | null }>;
  reassignmentTicket?: {
    id: string;
    status: "PENDING" | "APPROVED" | "REJECTED" | "CANCELLED";
    reason: string;
    decisionReason: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null;
}

export interface AssignableEpisodeSummary {
  id: string;
  title: string;
  seriesTitle: string;
  contentRevision: number;
  updatedAt: Date;
}

export function ModeratorAssignments({ service = moderatorReleaseService }: { service?: typeof moderatorReleaseService }) {
  const queryClient = useQueryClient();
  const shownReminders = useRef(new Set<string>());
  const assignments = useQuery({ queryKey: ["moderator-release-assignments"], queryFn: service.assignments });
  const episodes = useQuery({ queryKey: ["moderator-assignable-episodes"], queryFn: service.assignableEpisodes });
  const reminders = useQuery({ queryKey: ["moderator-release-reminders"], queryFn: service.reminders });

  useEffect(() => {
    const upcoming = reminders.data?.items.filter((item) =>
      item.productionDeadline.getTime() > Date.now() &&
      item.productionDeadline.getTime() - Date.now() <= 24 * 60 * 60 * 1000 &&
      !shownReminders.current.has(item.id)) ?? [];
    if (!upcoming.length) return;
    upcoming.forEach((item) => shownReminders.current.add(item.id));
    notify.warning({
      title: upcoming.length === 1 ? "Nhiệm vụ sắp đến hạn" : `${upcoming.length} nhiệm vụ sắp đến hạn`,
      description: upcoming.length === 1 ? upcoming[0]!.message : "Kiểm tra hạn sản xuất trong danh sách nhiệm vụ.",
    }, "moderator-production-reminders");
  }, [reminders.data]);

  useEffect(() => {
    if (assignments.error || episodes.error || reminders.error)
      notify.error({ title: "Không tải được dữ liệu nhiệm vụ", description: errorMessage(assignments.error ?? episodes.error ?? reminders.error) }, "moderator-assignment-load");
  }, [assignments.error, episodes.error, reminders.error]);

  const invalidate = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: ["moderator-release-assignments"] }),
      queryClient.invalidateQueries({ queryKey: ["moderator-assignable-episodes"] }),
      queryClient.invalidateQueries({ queryKey: ["moderator-releases"] }),
    ]);
  };
  const link = useMutation({
    mutationFn: ({ scheduleId, episodeId }: { scheduleId: string; episodeId: string }) => service.linkEpisode(scheduleId, episodeId),
    onSuccess: () => {
      notify.success({ title: "Đã gắn podcast vào nhiệm vụ" });
      return invalidate();
    },
    onError: (error) => notify.error({ title: "Không thể gắn podcast", description: errorMessage(error) }),
  });
  const submit = useMutation({
    mutationFn: ({ scheduleId, revision }: { scheduleId: string; revision: number }) => service.submitReview(scheduleId, revision),
    onSuccess: () => {
      notify.success({ title: "Đã gửi podcast chờ kiểm duyệt" });
      return invalidate();
    },
    onError: (error) => notify.error({ title: "Không thể gửi duyệt", description: errorMessage(error) }),
  });
  if (assignments.isPending || episodes.isPending)
    return <div className="ui-skeleton min-h-[360px] rounded-xl" aria-label="Đang tải nhiệm vụ" />;
  return <ModeratorAssignmentsView
    assignments={assignments.data?.items ?? []}
    assignableEpisodes={episodes.data?.items ?? []}
    loadFailed={assignments.isError}
    onRetry={() => { void assignments.refetch(); void episodes.refetch(); void reminders.refetch(); }}
    linkingId={link.isPending ? link.variables?.scheduleId : null}
    submittingId={submit.isPending ? submit.variables?.scheduleId : null}
    onLinkEpisode={(scheduleId, episodeId) => link.mutate({ scheduleId, episodeId })}
    onSubmitReview={(scheduleId, revision) => submit.mutate({ scheduleId, revision })}
  />;
}
