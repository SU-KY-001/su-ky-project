import { type ReactElement } from "react";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/icons/ArrowSquareOut";
import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle";
import { FileText } from "@phosphor-icons/react/dist/icons/FileText";
import { XCircle } from "@phosphor-icons/react/dist/icons/XCircle";
import type { EpisodeWorkspaceDto, ReviewContent, ReviewEpisodeRequest } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { CollapsibleScript } from "./CollapsibleScript";
import { ReviewAudio } from "./ReviewAudio";

export type ReviewDecisionInput = ReviewEpisodeRequest;

const NOTE_MAX_CHARS = 5000;

export function EpisodeReviewBody({ episode }: { episode: EpisodeWorkspaceDto }): ReactElement {
  return (
    <div className="space-y-6">
      <section>
        <p className="text-xs text-mod-text-secondary">{episode.seriesTitle}</p>
        <h3 className="mt-1 text-lg font-bold leading-7">{episode.title}</h3>
        {episode.description ? <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-mod-text-secondary">{episode.description}</p> : null}
      </section>
      {episode.narrations.length ? (
        episode.narrations.map((narration) => (
          <section key={narration.id} className="space-y-3 border-t border-mod-border pt-5">
            <h3 className="text-sm font-semibold">Bản thu âm podcast</h3>
            <div className="space-y-2">
              {narration.audio?.previewUrl ? (
                <>
                  <ReviewAudio key={narration.audio.previewUrl} src={narration.audio.previewUrl} />
                  {narration.warnings.some(({ key }) => key === "SCRIPT_CHANGED_AFTER_AUDIO") ? <p role="alert" className="text-xs font-semibold text-mod-attention">Kịch bản đã sửa sau khi gắn âm thanh: hãy nghe lại và ghi kết luận bản nghe.</p> : null}
                </>
              ) : <p className="text-sm text-mod-text-secondary">Chưa có bản thu âm để nghe.</p>}
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-mod-text-secondary">Kịch bản</h4>
              {narration.scriptContent ? <CollapsibleScript text={narration.scriptContent} /> : <p className="text-sm leading-7">Chưa có kịch bản.</p>}
            </div>
          </section>
        ))
      ) : (
        <p className="text-sm text-mod-text-secondary">Chưa có kịch bản hoặc bản thu âm.</p>
      )}
      <section className="space-y-3 border-t border-mod-border pt-5">
        <h3 className="text-sm font-semibold">Tài liệu đính kèm</h3>
        {episode.attachments.length ? (
          <ul className="space-y-2">
            {episode.attachments.map((file) => (
              <li key={file.id}>
                {file.asset.previewUrl ? (
                  <a href={file.asset.previewUrl} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2 rounded-lg border border-mod-border p-3 text-sm hover:bg-mod-canvas-accent">
                    <FileText className="shrink-0" size={18} /><span className="min-w-0 flex-1 break-words">{file.fileName}</span><ArrowSquareOut size={16} className="shrink-0" />
                  </a>
                ) : (
                  <span className="text-sm text-mod-text-secondary">{file.fileName} · Chưa có bản xem trước</span>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-mod-text-secondary">Không có tài liệu đính kèm.</p>
        )}
      </section>
    </div>
  );
}

interface Props {
  content: ReviewContent;
  /** False when the pending review is for an older revision than the episode now has. */
  validRevision: boolean;
  pending: boolean;
  note: string;
  onNoteChange: (note: string) => void;
  noteId: string;
}

/** Shared single-column review surface for Admin and Moderator reviewers: readiness, content, then the reviewer note. Decision buttons live in the dialog footer. */
export function ReleaseReviewPanel({ content, validRevision, pending, note, onNoteChange, noteId }: Props): ReactElement {
  const { data: user } = useCurrentUser();
  return (
    <div className="space-y-6">
      {user ? <p className="text-xs text-mod-text-secondary">Người duyệt: <b className="text-mod-text">{user.name}</b></p> : null}
      <EpisodeReviewBody episode={content.episode} />
      {validRevision ? (
        <div className="space-y-2 border-t border-mod-border pt-5 font-moderator">
          <label htmlFor={noteId} className="text-sm font-semibold text-mod-text">Ghi chú</label>
          <Textarea
            id={noteId}
            value={note}
            onChange={(event) => onNoteChange(event.target.value)}
            maxLength={NOTE_MAX_CHARS}
            rows={4}
            disabled={pending}
            placeholder="Nêu rõ phần cần sửa để người sản xuất xử lý"
            className="resize-none border-mod-border bg-mod-surface text-[13px] font-normal leading-5 text-mod-text placeholder:text-mod-text-secondary/60 md:text-[13px]"
          />
        </div>
      ) : (
        <p className="border-t border-mod-border pt-4 text-sm leading-6 text-mod-text-secondary">Phiên bản đã được xử lý hoặc nội dung đã thay đổi. Người sản xuất cần gửi lại phiên bản hiện tại nếu muốn kiểm duyệt tiếp.</p>
      )}
    </div>
  );
}

interface DecisionProps {
  ready: boolean;
  validRevision: boolean;
  reviewRevision: number;
  reviewId: string;
  pending: boolean;
  note: string;
  onDecide: (input: ReviewDecisionInput) => void;
}

/** The two review decisions, rendered in the dialog footer next to "Đóng". */
export function ReviewDecisionButtons({ ready, validRevision, reviewRevision, reviewId, pending, note, onDecide }: DecisionProps): ReactElement | null {
  if (!validRevision) return null;
  const trimmed = note.trim();
  return (
    <>
      <Button type="button" variant="outline" disabled={pending || !trimmed} onClick={() => onDecide({ decision: "REQUEST_CHANGES", reviewId, contentRevision: reviewRevision, reviewNote: trimmed })}>
        <XCircle size={17} />Yêu cầu chỉnh sửa
      </Button>
      <Button type="button" className="bg-mod-success text-white hover:bg-mod-success/90" disabled={pending || !ready} onClick={() => onDecide({ decision: "APPROVE", reviewId, contentRevision: reviewRevision, reviewNote: trimmed || null })}>
        <CheckCircle size={17} />{pending ? "Đang xử lý…" : "Duyệt nội dung"}
      </Button>
    </>
  );
}
