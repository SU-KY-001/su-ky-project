import { useState, type ReactElement } from "react";
import { ArrowSquareOut, CheckCircle, FileText, Info, Warning, XCircle } from "@phosphor-icons/react";
import type { EpisodeReadiness, EpisodeWorkspaceDto, ReadinessItem, ReviewContent } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { AI_READINESS_KEYS, readinessLabels } from "./readinessLabels";

export type ReviewDecisionInput =
  | { decision: "APPROVE"; contentRevision: number; reviewNote: string | null }
  | { decision: "REQUEST_CHANGES"; contentRevision: number; reviewNote: string };

const NARRATION_TITLE = { THIRD_PERSON: "Lời kể ngôi thứ ba", FIRST_PERSON: "Lời kể ngôi thứ nhất" } as const;
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
            <h3 className="text-sm font-semibold">{NARRATION_TITLE[narration.type]}{narration.narrator ? ` · ${narration.narrator.name}` : ""}</h3>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-mod-text-secondary">Bản thu âm</h4>
              {narration.audio?.previewUrl ? <audio controls preload="none" src={narration.audio.previewUrl} className="w-full" aria-label={`Nghe bản thu ${narration.type === "THIRD_PERSON" ? "ngôi thứ ba" : "ngôi thứ nhất"}`} /> : <p className="text-sm text-mod-text-secondary">Chưa có bản thu âm để nghe.</p>}
            </div>
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-mod-text-secondary">Kịch bản</h4>
              <p className="whitespace-pre-wrap text-sm leading-7 [overflow-wrap:anywhere]">{narration.scriptContent || "Chưa có kịch bản."}</p>
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

const STATE_ICON: Record<ReadinessItem["state"], ReactElement> = {
  OK: <CheckCircle size={16} weight="fill" className="shrink-0 text-mod-success" aria-label="Đạt" />,
  MISSING: <XCircle size={16} weight="fill" className="shrink-0 text-mod-danger" aria-label="Thiếu" />,
  WARN: <Warning size={16} weight="fill" className="shrink-0 text-mod-attention" aria-label="Cần xem" />,
  INFO: <Info size={16} className="shrink-0 text-mod-text-secondary" aria-label="Thông tin" />,
};

function Group({ title, items }: { title: string; items: Array<{ item: ReadinessItem; text: string }> }): ReactElement | null {
  if (!items.length) return null;
  return (
    <section aria-label={title} className="space-y-2">
      <h4 className="text-xs font-bold uppercase tracking-wide text-mod-text-secondary">{title}</h4>
      <ul className="space-y-1.5">
        {items.map(({ item, text }, index) => (
          <li key={`${item.key}-${index}`} className="flex items-start gap-2 text-sm leading-5">{STATE_ICON[item.state]}<span>{text}</span></li>
        ))}
      </ul>
    </section>
  );
}

/** First required row that is not OK: the reason shown next to the locked "Duyệt" button. */
export function firstMissing(readiness: EpisodeReadiness): string | null {
  const item = readiness.items.find((row) => row.level === "REQUIRED" && row.state !== "OK");
  return item ? readinessLabels[item.key](item) : null;
}

export function ReadinessColumn({ readiness }: { readiness: EpisodeReadiness }): ReactElement {
  const rows = readiness.items.flatMap((item) => {
    const text = readinessLabels[item.key](item);
    return text ? [{ item, text }] : [];
  });
  const plain = rows.filter(({ item }) => !AI_READINESS_KEYS.has(item.key));
  return (
    <div className="space-y-4">
      <h3 className="text-sm font-bold">Tình trạng tập</h3>
      <Group title="Cần có" items={plain.filter(({ item }) => item.level === "REQUIRED")} />
      <Group title="Cần xem" items={plain.filter(({ item }) => item.level === "WARNING")} />
      <Group title="Thông tin" items={plain.filter(({ item }) => item.level === "INFO")} />
      <Group title="AI hỗ trợ (nghi ngờ, chưa xác minh)" items={rows.filter(({ item }) => AI_READINESS_KEYS.has(item.key))} />
    </div>
  );
}

interface Props {
  content: ReviewContent;
  /** False when the pending review is for an older revision than the episode now has. */
  validRevision: boolean;
  reviewRevision: number;
  pending: boolean;
  onDecide: (input: ReviewDecisionInput) => void;
  noteId: string;
}

/** Shared two-column review surface for Admin and Moderator reviewers: content left, system readiness + decision right. */
export function ReleaseReviewPanel({ content, validRevision, reviewRevision, pending, onDecide, noteId }: Props): ReactElement {
  const [note, setNote] = useState("");
  const missing = content.readiness.ready ? null : firstMissing(content.readiness);
  const trimmed = note.trim();
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <EpisodeReviewBody episode={content.episode} />
      <aside className="space-y-5 lg:border-l lg:border-mod-border lg:pl-6">
        <ReadinessColumn readiness={content.readiness} />
        {validRevision ? (
          <div className="space-y-3 border-t border-mod-border pt-4">
            <label htmlFor={noteId} className="text-sm font-semibold">Nhận xét kiểm duyệt</label>
            <Textarea id={noteId} value={note} onChange={(event) => setNote(event.target.value)} maxLength={NOTE_MAX_CHARS} rows={4} disabled={pending} placeholder="Bắt buộc khi yêu cầu chỉnh sửa" className="resize-none border-mod-border bg-mod-surface" />
            <p className="text-xs text-mod-text-secondary">Người sản xuất thấy nhận xét này ở trang Công việc của họ (không có thông báo đẩy).</p>
            {missing ? <p role="alert" className="text-xs font-semibold text-mod-danger">Chưa thể duyệt: {missing}</p> : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" disabled={pending || !trimmed} onClick={() => onDecide({ decision: "REQUEST_CHANGES", contentRevision: reviewRevision, reviewNote: trimmed })}>
                <XCircle size={17} />Yêu cầu chỉnh sửa
              </Button>
              <Button type="button" disabled={pending || !content.readiness.ready} onClick={() => onDecide({ decision: "APPROVE", contentRevision: reviewRevision, reviewNote: trimmed || null })}>
                <CheckCircle size={17} />{pending ? "Đang xử lý…" : "Duyệt nội dung"}
              </Button>
            </div>
          </div>
        ) : (
          <p className="border-t border-mod-border pt-4 text-sm leading-6 text-mod-text-secondary">Phiên bản đã được xử lý hoặc nội dung đã thay đổi. Người sản xuất cần gửi lại phiên bản hiện tại nếu muốn kiểm duyệt tiếp.</p>
        )}
      </aside>
    </div>
  );
}
