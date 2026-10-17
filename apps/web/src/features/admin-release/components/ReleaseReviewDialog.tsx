import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { EpisodeWorkspaceDto, ReleaseScheduleRecord, ReviewEpisodeInput } from "@repo/shared";
import { ArrowSquareOut, CheckCircle, FileText, XCircle } from "@phosphor-icons/react";
import { errorMessage } from "@/lib/apiError";
import { notify } from "@/shared/lib/notifications";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { adminReleaseService } from "../services/adminReleaseService";
import { adminReleaseKeys } from "../hooks/useAdminReleases";

export function ReleaseReviewContent({ episode }: { episode: EpisodeWorkspaceDto }) {
  return <div className="space-y-6">
    <section><p className="text-xs text-mod-text-secondary">{episode.seriesTitle}</p><h3 className="mt-1 text-lg font-bold leading-7">{episode.title}</h3>
      {episode.description ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-mod-text-secondary">{episode.description}</p> : null}
    </section>
    {episode.narrations.length ? episode.narrations.map((narration) => <section key={narration.id} className="space-y-3 border-t border-mod-border pt-5">
      <h3 className="text-sm font-semibold">{narration.type === "THIRD_PERSON" ? "Lời kể ngôi thứ ba" : "Lời kể ngôi thứ nhất"}{narration.narrator ? ` · ${narration.narrator.name}` : ""}</h3>
      <div className="space-y-2"><h4 className="text-xs font-semibold text-mod-text-secondary">Bản thu âm</h4>
        {narration.audio?.previewUrl ? <audio controls preload="none" src={narration.audio.previewUrl} className="w-full" aria-label={`Nghe bản thu ${narration.type === "THIRD_PERSON" ? "ngôi thứ ba" : "ngôi thứ nhất"}`} /> : <p className="text-sm text-mod-text-secondary">Chưa có bản thu âm để nghe.</p>}
      </div>
      <div className="space-y-2"><h4 className="text-xs font-semibold text-mod-text-secondary">Kịch bản</h4><p className="whitespace-pre-wrap text-sm leading-7 [overflow-wrap:anywhere]">{narration.scriptContent || "Chưa có kịch bản."}</p></div>
    </section>) : <p className="text-sm text-mod-text-secondary">Chưa có kịch bản hoặc bản thu âm.</p>}
    <section className="space-y-3 border-t border-mod-border pt-5"><h3 className="text-sm font-semibold">Tài liệu đính kèm</h3>
      {episode.attachments.length ? <ul className="space-y-2">{episode.attachments.map((file) => <li key={file.id}>
        {file.asset.previewUrl ? <a href={file.asset.previewUrl} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2 rounded-lg border border-mod-border p-3 text-sm hover:bg-mod-canvas-accent"><FileText className="shrink-0" size={18} /><span className="min-w-0 flex-1 break-words">{file.fileName}</span><ArrowSquareOut size={16} className="shrink-0" /></a> : <span className="text-sm text-mod-text-secondary">{file.fileName} · Chưa có bản xem trước</span>}
      </li>)}</ul> : <p className="text-sm text-mod-text-secondary">Không có tài liệu đính kèm.</p>}
    </section>
  </div>;
}

export function ReleaseReviewDialog({ schedule, onClose, service = adminReleaseService }: {
  schedule: ReleaseScheduleRecord;
  onClose: () => void;
  service?: typeof adminReleaseService;
}) {
  const queryClient = useQueryClient();
  const [note, setNote] = useState("");
  const detailKey = [...adminReleaseKeys.root, "review-detail", schedule.id];
  const latest = useQuery({ queryKey: detailKey, queryFn: () => service.get(schedule.id) });
  const current = latest.data;
  const episodeId = current?.episode?.id;
  const contentKey = [...adminReleaseKeys.root, "review-content", episodeId, current?.episode?.contentRevision];
  const content = useQuery({ queryKey: contentKey, queryFn: () => service.content(episodeId!), enabled: Boolean(episodeId) });
  const review = current?.reviews.find((item) => item.status === "IN_REVIEW");
  const validRevision = Boolean(current && review && current.episode?.contentRevision === review.revision);
  const canDecide = validRevision && Boolean(content.data) && !latest.isFetching && !latest.isError && !content.isFetching && !content.isError;

  useEffect(() => {
    if (latest.error || content.error) notify.error({ title: "Không tải được nội dung kiểm duyệt", description: errorMessage(latest.error ?? content.error) }, `release-review-load-${schedule.id}`);
  }, [latest.error, content.error, schedule.id]);

  const decide = useMutation({
    mutationFn: (input: ReviewEpisodeInput) => service.review(schedule.id, input),
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
  const requestDecision = (decision: "APPROVE" | "REQUEST_CHANGES") => {
    if (!canDecide || !review) return;
    if (decision === "REQUEST_CHANGES" && !note.trim()) {
      notify.warning({ title: "Cần nhập nhận xét chỉnh sửa" });
      return;
    }
    decide.mutate(decision === "APPROVE" ? { decision, contentRevision: review.revision, reviewNote: note.trim() || null } : { decision, contentRevision: review.revision, reviewNote: note.trim() });
  };

  return <Dialog open onOpenChange={(open) => { if (!open && !decide.isPending) onClose(); }}>
    <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-3xl flex-col gap-0 overflow-hidden border-mod-border bg-mod-surface p-0 font-moderator text-mod-text sm:p-0" showCloseButton={!decide.isPending}>
      <DialogHeader className="shrink-0 border-b border-mod-border px-5 py-5 sm:px-6"><DialogTitle>Chi tiết nội dung kiểm duyệt</DialogTitle><DialogDescription>{schedule.title}</DialogDescription></DialogHeader>
      <div className="mod-scrollbar-hidden min-h-0 flex-1 space-y-5 overflow-y-auto overscroll-contain p-5 sm:p-6">
        {latest.isPending || (episodeId && content.isPending) ? <div className="ui-skeleton min-h-60 rounded-xl" aria-label="Đang tải nội dung kiểm duyệt" /> : latest.isError || content.isError ? <div className="flex min-h-40 items-center justify-center"><Button variant="outline" onClick={() => { void latest.refetch(); void content.refetch(); }}>Tải lại nội dung</Button></div> : content.data ? <>
          <div className="flex flex-wrap items-center gap-2"><CardBadge type="status" tone={validRevision ? "info" : "neutral"}>{validRevision ? "Chờ kiểm duyệt" : "Không có phiên bản hợp lệ để duyệt"}</CardBadge>{review ? <span className="text-xs text-mod-text-secondary">Phiên bản {review.revision}</span> : null}</div>
          <ReleaseReviewContent episode={content.data} />
          {validRevision ? <div className="space-y-2 border-t border-mod-border pt-5"><label htmlFor="admin-review-note" className="text-sm font-semibold">Nhận xét kiểm duyệt</label>
            <Textarea id="admin-review-note" value={note} onChange={(event) => setNote(event.target.value)} maxLength={5000} rows={4} disabled={decide.isPending} placeholder="Nêu rõ phần cần sửa nếu yêu cầu chỉnh sửa" className="resize-none border-mod-border bg-mod-surface" />
          </div> : <p className="text-sm leading-6 text-mod-text-secondary">Phiên bản đã được xử lý hoặc nội dung đã thay đổi. Người sản xuất cần gửi lại phiên bản hiện tại nếu muốn kiểm duyệt tiếp.</p>}
        </> : <p className="text-sm text-mod-text-secondary">Lịch này chưa liên kết podcast.</p>}
      </div>
      <DialogFooter className="shrink-0 border-t border-mod-border px-5 py-4 sm:px-6">
        <Button variant="outline" disabled={decide.isPending} onClick={onClose}>Đóng</Button>
        {validRevision && content.data ? <><Button variant="outline" disabled={decide.isPending || !canDecide} onClick={() => requestDecision("REQUEST_CHANGES")}><XCircle size={17} />Yêu cầu chỉnh sửa</Button>
          <Button disabled={decide.isPending || !canDecide} onClick={() => requestDecision("APPROVE")}><CheckCircle size={17} />{decide.isPending ? "Đang xử lý…" : "Duyệt nội dung"}</Button></> : null}
      </DialogFooter>
    </DialogContent>
  </Dialog>;
}
