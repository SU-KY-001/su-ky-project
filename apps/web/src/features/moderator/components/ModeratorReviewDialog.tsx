import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { errorMessage } from "@/lib/apiError";
import { notify } from "@/shared/lib/notifications";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { ReleaseReviewPanel, ReviewDecisionButtons, type ReviewDecisionInput } from "@/features/release-review/ReleaseReviewPanel";
import { moderatorReleaseService } from "../services/moderatorReleaseService";

export const REVIEW_QUEUE_KEY = ["moderator-review-queue"] as const;
const ASSIGNMENTS_KEY = ["moderator-release-assignments"] as const;

interface Props {
  scheduleId: string;
  title: string;
  /** Revision the queue says is waiting; the panel locks if the content has moved on. */
  reviewRevision: number;
  onClose: () => void;
}

export function ModeratorReviewDialog({ scheduleId, title, reviewRevision, onClose }: Props) {
  const queryClient = useQueryClient();
  const contentKey = ["moderator-review-content", scheduleId] as const;
  const content = useQuery({ queryKey: contentKey, queryFn: () => moderatorReleaseService.reviewContent(scheduleId) });
  const [note, setNote] = useState("");
  const decide = useMutation({
    mutationFn: (input: ReviewDecisionInput) => moderatorReleaseService.review(scheduleId, input),
    onSuccess: async (_, input) => {
      notify.success({ title: input.decision === "APPROVE" ? "Đã duyệt nội dung podcast" : "Đã gửi yêu cầu chỉnh sửa" });
      await Promise.all([queryClient.invalidateQueries({ queryKey: REVIEW_QUEUE_KEY }), queryClient.invalidateQueries({ queryKey: ASSIGNMENTS_KEY })]);
      onClose();
    },
    onError: (error) => {
      notify.error({ title: "Chưa thể hoàn tất kiểm duyệt", description: errorMessage(error) });
      void queryClient.invalidateQueries({ queryKey: contentKey });
    },
  });
  useEffect(() => {
    if (content.error) notify.error({ title: "Không tải được nội dung kiểm duyệt", description: errorMessage(content.error) }, `mod-review-load-${scheduleId}`);
  }, [content.error, scheduleId]);
  const canDecide = Boolean(content.data && content.data.readiness.contentRevision === reviewRevision && !content.isFetching);

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !decide.isPending) onClose(); }}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-5xl flex-col gap-0 overflow-hidden border-mod-border bg-mod-surface p-0 font-moderator text-mod-text sm:p-0" showCloseButton={!decide.isPending}>
        <DialogHeader className="shrink-0 border-b border-mod-border px-5 py-5 sm:px-6"><DialogTitle>Kiểm duyệt nội dung podcast</DialogTitle><DialogDescription>{title}</DialogDescription></DialogHeader>
        <div className="mod-scrollbar-hidden min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 sm:p-6">
          {content.isPending ? <div className="ui-skeleton min-h-60 rounded-xl" aria-label="Đang tải nội dung kiểm duyệt" />
            : content.isError ? <div className="flex min-h-40 items-center justify-center"><Button variant="outline" onClick={() => void content.refetch()}>Tải lại nội dung</Button></div>
            : <div className="space-y-5">
                <div className="flex flex-wrap items-center gap-2"><CardBadge type="status" tone="info">Chờ kiểm duyệt</CardBadge><span className="text-xs text-mod-text-secondary">Phiên bản {reviewRevision}</span></div>
                <ReleaseReviewPanel content={content.data} validRevision={canDecide} pending={decide.isPending} noteId="mod-review-note" note={note} onNoteChange={setNote} />
              </div>}
        </div>
        <DialogFooter className="shrink-0 border-t border-mod-border px-5 py-4 sm:px-6">
          {content.data ? <ReviewDecisionButtons ready={content.data.readiness.ready} validRevision={canDecide} reviewRevision={reviewRevision} pending={decide.isPending} note={note} onDecide={(input) => decide.mutate(input)} /> : null}
          <Button variant="outline" disabled={decide.isPending} onClick={onClose}>Đóng</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
