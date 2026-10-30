import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ReleaseScheduleRecord, ReviewEpisodeRequest } from "@repo/shared";
import { errorMessage } from "@/lib/apiError";
import { notify } from "@/shared/lib/notifications";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { ReleaseReviewPanel, ReviewDecisionButtons } from "@/features/release-review/ReleaseReviewPanel";
import { ReviewHistory } from "@/features/release-review/ReviewHistory";
import { adminReleaseService } from "../services/adminReleaseService";
import { adminReleaseKeys } from "../hooks/useAdminReleases";

export function ReleaseReviewDialog({ schedule, onClose, service = adminReleaseService }: {
  schedule: ReleaseScheduleRecord;
  onClose: () => void;
  service?: typeof adminReleaseService;
}) {
  const queryClient = useQueryClient();
  const detailKey = [...adminReleaseKeys.root, "review-detail", schedule.id];
  const latest = useQuery({ queryKey: detailKey, queryFn: () => service.get(schedule.id) });
  const current = latest.data;
  const episodeId = current?.episode?.id;
  const contentKey = [...adminReleaseKeys.root, "review-content", schedule.id, current?.episode?.contentRevision];
  const content = useQuery({ queryKey: contentKey, queryFn: () => service.reviewContent(schedule.id), enabled: Boolean(episodeId) });
  const review = current?.reviews.find((item) => item.status === "IN_REVIEW");
  const validRevision = Boolean(current && review && current.episode?.contentRevision === review.revision && content.data?.readiness.contentRevision === review.revision);
  const canDecide = validRevision && !latest.isFetching && !content.isFetching;
  const [note, setNote] = useState("");

  useEffect(() => {
    if (latest.error || content.error) notify.error({ title: "Không tải được nội dung kiểm duyệt", description: errorMessage(latest.error ?? content.error) }, `release-review-load-${schedule.id}`);
  }, [latest.error, content.error, schedule.id]);

  const decide = useMutation({
    mutationFn: (input: ReviewEpisodeRequest) => service.review(schedule.id, input),
    onSuccess: async (_, input) => {
      notify.success({ title: input.decision === "APPROVE" ? "Đã duyệt nội dung podcast" : "Đã gửi yêu cầu chỉnh sửa" });
      await queryClient.invalidateQueries({ queryKey: adminReleaseKeys.root });
      onClose();
    },
    onError: (error) => {
      notify.error({ title: "Chưa thể hoàn tất kiểm duyệt", description: errorMessage(error) });
      void queryClient.invalidateQueries({ queryKey: detailKey });
      void queryClient.invalidateQueries({ queryKey: contentKey });
    },
  });

  return <Dialog open onOpenChange={(open) => { if (!open && !decide.isPending) onClose(); }}>
    <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-5xl flex-col gap-0 overflow-hidden border-mod-border bg-mod-surface p-0 font-moderator text-mod-text sm:p-0" showCloseButton={!decide.isPending}>
      <DialogHeader className="shrink-0 border-b border-mod-border px-5 py-5 sm:px-6"><DialogTitle>Chi tiết nội dung kiểm duyệt</DialogTitle><DialogDescription>{schedule.title}</DialogDescription></DialogHeader>
      <div className="mod-scrollbar-hidden min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-6">
        {latest.isPending || (episodeId && content.isPending) ? <div className="ui-skeleton min-h-60 rounded-xl" aria-label="Đang tải nội dung kiểm duyệt" /> : latest.isError || content.isError ? <div className="flex min-h-40 items-center justify-center"><Button variant="outline" onClick={() => { void latest.refetch(); void content.refetch(); }}>Tải lại nội dung</Button></div> : content.data ? <>
          <div className="flex flex-wrap items-center gap-2"><CardBadge type="status" tone={validRevision ? "info" : "neutral"}>{validRevision ? "Chờ kiểm duyệt" : "Không có phiên bản hợp lệ để duyệt"}</CardBadge>{review ? <span className="text-xs text-mod-text-secondary">Phiên bản {review.revision}</span> : null}</div>
          <ReleaseReviewPanel content={content.data} validRevision={canDecide} pending={decide.isPending} noteId="admin-review-note" note={note} onNoteChange={setNote} />
          {current ? <ReviewHistory reviews={current.reviews} /> : null}
        </> : <p className="text-sm text-mod-text-secondary">Lịch này chưa liên kết podcast.</p>}
      </div>
      <DialogFooter className="shrink-0 border-t border-mod-border px-5 py-4 sm:px-6">
        {content.data ? <ReviewDecisionButtons ready={content.data.readiness.ready} validRevision={canDecide} reviewRevision={review?.revision ?? 0} pending={decide.isPending} note={note} onDecide={(input) => decide.mutate(input)} /> : null}
        <Button variant="outline" disabled={decide.isPending} onClick={onClose}>Đóng</Button>
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
