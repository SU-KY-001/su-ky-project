import { useState, type ReactElement } from "react";
import { LoaderCircle, TriangleAlert } from "lucide-react";
import type { EpisodeWorkspaceDto, PublishEpisodeExceptionInput } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { AssessmentForm } from "@/features/release-review/AssessmentForm";
import {
  EXCEPTION_REASON_MAX_CHARS,
  EXCEPTION_REASON_MIN_CHARS,
  assessmentProblems,
  assessmentRequirements,
  emptyAssessmentDraft,
  toAssessment,
  type AssessmentDraft,
} from "@/features/release-review/publicationAssessment";

type ExceptionInput = Pick<PublishEpisodeExceptionInput, "exceptionReason" | "assessment">;

interface Props {
  episode: EpisodeWorkspaceDto;
  pending: boolean;
  /** Server rejection of the last attempt; the typed reason and assessment stay so the Admin can fix and retry. */
  error: string;
  onConfirm: (input: ExceptionInput) => void;
  onClose: () => void;
}

/** Admin-only direct publish. Skips independent review, so a substantial reason and the full assessment are mandatory and audited. */
export function AdminExceptionPublishDialog({ episode, pending, error, onConfirm, onClose }: Props): ReactElement {
  const [reason, setReason] = useState("");
  const [assessment, setAssessment] = useState<AssessmentDraft>(emptyAssessmentDraft);
  const requirements = assessmentRequirements(episode, episode.readiness);
  const problems = assessmentProblems(assessment, requirements);
  const reasonOk = reason.trim().length >= EXCEPTION_REASON_MIN_CHARS;
  const canSubmit = reasonOk && problems.length === 0 && episode.publishChecklist.ready;

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !pending) onClose(); }}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-xl flex-col gap-0 overflow-hidden border-mod-border bg-mod-surface p-0 font-moderator text-mod-text sm:p-0" showCloseButton={!pending}>
        <DialogHeader className="shrink-0 border-b border-mod-border px-5 py-5 sm:px-6">
          <DialogTitle>Xuất bản ngoại lệ (bỏ qua kiểm duyệt độc lập)</DialogTitle>
          <DialogDescription>{episode.title}</DialogDescription>
        </DialogHeader>
        <div className="mod-scrollbar-hidden min-h-0 flex-1 space-y-5 overflow-y-auto p-5 sm:p-6">
          <p role="alert" className="flex gap-2 rounded-lg border border-mod-danger/40 bg-mod-danger/5 p-3 text-sm leading-6 text-mod-danger">
            <TriangleAlert size={18} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>Tập sẽ lên thư viện công khai ngay, không qua người duyệt thứ hai. Lý do, kết luận và tài khoản của bạn được ghi vào nhật ký kiểm toán. Cách thường là gửi duyệt qua lịch phát hành.</span>
          </p>
          <div className="space-y-1">
            <label htmlFor="exception-reason" className="text-sm font-semibold">Lý do phải xuất bản trực tiếp <span className="text-mod-danger">*</span></label>
            <Textarea id="exception-reason" value={reason} onChange={(event) => setReason(event.target.value)} maxLength={EXCEPTION_REASON_MAX_CHARS} rows={3} disabled={pending} aria-required="true" aria-describedby="exception-reason-hint" className="min-h-20 resize-y border-mod-border bg-mod-surface" />
            <p id="exception-reason-hint" className="text-xs text-mod-text-secondary">Vì sao không thể chờ người duyệt độc lập. Tối thiểu {EXCEPTION_REASON_MIN_CHARS} ký tự, nêu cụ thể.</p>
          </div>
          <AssessmentForm idPrefix="exception" draft={assessment} requirements={requirements} disabled={pending} onChange={setAssessment} />
          {!episode.publishChecklist.ready ? <p role="status" className="text-xs text-mod-attention">Tập chưa đủ điều kiện xuất bản; ngoại lệ không miễn kiểm tra nguồn, tài sản và điều kiện tối thiểu.</p> : null}
          {!reasonOk || problems.length ? (
            <div role="status" className="text-xs text-mod-attention">
              <p className="font-semibold">Còn cần:</p>
              <ul className="list-disc pl-5">
                {!reasonOk ? <li>Lý do xuất bản trực tiếp (ít nhất {EXCEPTION_REASON_MIN_CHARS} ký tự)</li> : null}
                {problems.map((problem) => <li key={problem}>{problem}</li>)}
              </ul>
            </div>
          ) : null}
          {error ? <p role="alert" className="text-sm text-mod-danger">{error}</p> : null}
        </div>
        <DialogFooter className="shrink-0 border-t border-mod-border px-5 py-4 sm:px-6">
          <Button type="button" variant="outline" disabled={pending} onClick={onClose}>Hủy</Button>
          <Button type="button" variant="destructive" disabled={pending || !canSubmit} onClick={() => onConfirm({ exceptionReason: reason.trim(), assessment: toAssessment(assessment) })}>
            {pending ? <LoaderCircle className="animate-spin" /> : null} {pending ? "Đang xuất bản…" : "Xuất bản ngoại lệ"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
