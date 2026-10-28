import { useState, type ReactElement } from "react";
import { ArrowSquareOut } from "@phosphor-icons/react/dist/icons/ArrowSquareOut";
import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle";
import { FileText } from "@phosphor-icons/react/dist/icons/FileText";
import { Info } from "@phosphor-icons/react/dist/icons/Info";
import { Warning } from "@phosphor-icons/react/dist/icons/Warning";
import { XCircle } from "@phosphor-icons/react/dist/icons/XCircle";
import type { AudioOrigin, EpisodeReadiness, EpisodeWorkspaceDto, ReadinessItem, ReviewContent, ReviewEpisodeInput } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { voiceName } from "@/features/podcast-production/voice/voiceLabels";
import { AssessmentForm } from "./AssessmentForm";
import { CollapsibleScript } from "./CollapsibleScript";
import { assessmentProblems, assessmentRequirements, emptyAssessmentDraft, toAssessment, type AssessmentDraft } from "./publicationAssessment";
import { AI_READINESS_KEYS, formatClock, readinessLabels, reviewReason, STATE_LABEL, type ReviewReason } from "./readinessLabels";

export type ReviewDecisionInput = ReviewEpisodeInput;

/** Which file and which voice/model made the recording, so the reviewer judges AI audio as AI audio. */
function AudioOriginLine({ origin }: { origin: AudioOrigin | undefined }): ReactElement {
  if (origin?.kind === "AI_VOICE") {
    return <p className="text-xs font-semibold text-mod-attention">Giọng đọc AI: {voiceName(origin.voice)} · mô hình {origin.model} · {origin.chars.toLocaleString("vi-VN")} ký tự. Người nghe cần được thông báo.</p>;
  }
  if (origin?.kind === "UPLOAD") return <p className="text-xs text-mod-text-secondary">Tải lên từ máy: {origin.fileName}</p>;
  return <p className="text-xs text-mod-text-secondary">Chưa ghi nhận nguồn của bản thu (gắn trước khi hệ thống lưu thông tin này).</p>;
}

const NARRATION_TITLE = { THIRD_PERSON: "Lời kể ngôi thứ ba", FIRST_PERSON: "Lời kể ngôi thứ nhất" } as const;
const NOTE_MAX_CHARS = 5000;

const REASON_CLASS: Record<ReviewReason["tone"], string> = {
  blocked: "text-xs font-semibold text-mod-danger",
  warn: "text-xs font-semibold text-mod-attention",
  ok: "text-xs font-semibold text-mod-success",
};
const STATE_PILL_CLASS = {
  ok: "bg-mod-success/10 text-mod-success",
  warn: "bg-mod-attention/10 text-mod-attention",
  missing: "bg-mod-danger/10 text-mod-danger",
} as const;

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
              {narration.audio?.previewUrl ? (
                <>
                  <audio controls preload="none" src={narration.audio.previewUrl} className="w-full" aria-label={`Nghe bản thu ${narration.type === "THIRD_PERSON" ? "ngôi thứ ba" : "ngôi thứ nhất"}`} />
                  {narration.audio.durationMs ? <p className="text-xs text-mod-text-secondary">{formatClock(narration.audio.durationMs)}</p> : null}
                  <AudioOriginLine origin={narration.audioAnalysis?.origin} />
                  {narration.warnings.some(({ key }) => key === "SCRIPT_CHANGED_AFTER_AUDIO") ? <p role="alert" className="text-xs font-semibold text-mod-attention">Kịch bản đã sửa sau khi gắn âm thanh: hãy nghe lại và ghi kết luận bản nghe.</p> : null}
                  <p className="text-xs text-mod-text-secondary">Hệ thống không biết bạn đã nghe bao nhiêu, nên không có ô tick nghe xong.</p>
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
          <li key={`${item.key}-${index}`} className="flex items-start gap-2 text-sm leading-5">{STATE_ICON[item.state]}<span className="min-w-0 flex-1">{text}</span>{STATE_LABEL[item.state] ? <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-xs font-bold", STATE_PILL_CLASS[STATE_LABEL[item.state]!.tone])}>{STATE_LABEL[item.state]!.text}</span> : null}</li>
        ))}
      </ul>
    </section>
  );
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
  const [assessment, setAssessment] = useState<AssessmentDraft>(emptyAssessmentDraft);
  const { data: user } = useCurrentUser();
  const reason = reviewReason(content.readiness);
  const trimmed = note.trim();
  const requirements = assessmentRequirements(content.episode, content.readiness);
  const problems = assessmentProblems(assessment, requirements);
  const canApprove = content.readiness.ready && problems.length === 0;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_24rem]">
      {user ? <p className="text-xs text-mod-text-secondary lg:col-span-2">Người duyệt: <b className="text-mod-text">{user.name}</b> (không phải người sản xuất, không phải AI)</p> : null}
      <EpisodeReviewBody episode={content.episode} />
      <aside className="space-y-5 lg:border-l lg:border-mod-border lg:pl-6">
        <ReadinessColumn readiness={content.readiness} />
        {validRevision ? (
          <div className="space-y-3 border-t border-mod-border pt-4 font-moderator">
            <label htmlFor={noteId} className="text-sm font-semibold text-mod-text">Ghi chú</label>
            <Textarea
              id={noteId}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              maxLength={NOTE_MAX_CHARS}
              rows={4}
              disabled={pending}
              placeholder="Nêu rõ phần cần sửa để người sản xuất xử lý"
              className="resize-none border-mod-border bg-mod-surface text-[13px] font-normal leading-5 text-mod-text placeholder:text-mod-text-secondary/60 md:text-[13px]"
            />
            <p className="text-xs text-mod-text-secondary">Bắt buộc khi Yêu cầu chỉnh sửa. Không cần điền phần xác nhận bên dưới khi yêu cầu chỉnh sửa.</p>
            <div className="space-y-3 border-t border-mod-border pt-4">
              <AssessmentForm idPrefix={noteId} draft={assessment} requirements={requirements} disabled={pending} onChange={setAssessment} />
              <p className="text-xs text-mod-text-secondary">Bạn chịu trách nhiệm về các xác nhận này; chúng được lưu cùng phiên bản {reviewRevision} và không thay thế đánh giá pháp lý.</p>
            </div>
            <p role={reason.tone === "blocked" ? "alert" : "status"} className={REASON_CLASS[reason.tone]}>{reason.text}</p>
            {content.readiness.ready && problems.length ? (
              <div role="status" className="text-xs text-mod-attention">
                <p className="font-semibold">Để Duyệt, còn cần:</p>
                <ul className="list-disc pl-5">{problems.map((problem) => <li key={problem}>{problem}</li>)}</ul>
              </div>
            ) : null}
            <div className="flex flex-wrap justify-end gap-2">
              <Button type="button" variant="outline" disabled={pending || !trimmed} onClick={() => onDecide({ decision: "REQUEST_CHANGES", contentRevision: reviewRevision, reviewNote: trimmed })}>
                <XCircle size={17} />Yêu cầu chỉnh sửa
              </Button>
              <Button type="button" disabled={pending || !canApprove} onClick={() => onDecide({ decision: "APPROVE", contentRevision: reviewRevision, reviewNote: trimmed || null, assessment: toAssessment(assessment) })}>
                <CheckCircle size={17} />{pending ? "Đang xử lý…" : "Duyệt nội dung"}
              </Button>
            </div>
            <p className="text-xs text-mod-text-secondary">Ghi chú và quyết định được lưu, gắn với phiên bản {reviewRevision}. Người sản xuất thấy nhận xét này ở trang Công việc của họ (không có thông báo đẩy).</p>
          </div>
        ) : (
          <p className="border-t border-mod-border pt-4 text-sm leading-6 text-mod-text-secondary">Phiên bản đã được xử lý hoặc nội dung đã thay đổi. Người sản xuất cần gửi lại phiên bản hiện tại nếu muốn kiểm duyệt tiếp.</p>
        )}
      </aside>
    </div>
  );
}
