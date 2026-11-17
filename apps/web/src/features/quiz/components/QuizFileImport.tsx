import { useRef, useState, type ReactElement } from "react";
import { toReadyQuizQuestions, type QuizDraftQuestion } from "@repo/shared";
import { SpinnerGap } from "@phosphor-icons/react/dist/icons/SpinnerGap";
import { ArrowLeft } from "@phosphor-icons/react/dist/icons/ArrowLeft";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { ConfirmationDialog } from "@/shared/components/common/ConfirmationDialog";
import { useConfirmationDialog } from "@/shared/hooks/useConfirmationDialog";
import { notify } from "@/shared/lib/notifications";
import { cn } from "@/lib/utils";
import { useQuizFileImport } from "../hooks/useQuizFileImport";
import { DocumentFilePicker } from "@/shared/components/common/DocumentFilePicker";
import { ImportFileButton } from "@/shared/components/common/ImportFileButton";
import { QuizImportPreview } from "./QuizImportPreview";
import type { QuizImportNotes } from "../utils/quizTextImport";

interface ImportProps { count: number; empty: boolean; defaultTime: number; onApply: (questions: QuizDraftQuestion[], replace: boolean, notes: QuizImportNotes) => void; }
export function QuizFileImport({ count, empty, defaultTime, onApply }: ImportProps): ReactElement {
  const [open, setOpen] = useState(false), [replace, setReplace] = useState(false), [confirming, setConfirming] = useState(false);
  const input = useRef<HTMLInputElement>(null), applying = useRef(false), applied = useRef(false), session = useRef(0);
  const { state, loading, waiting, load, reset } = useQuizFileImport(defaultTime);
  const { requestConfirmation, confirmation } = useConfirmationDialog();
  const preview = state.status === "preview" ? state.result : null;
  const total = preview ? preview.questions.length + (empty || replace ? 0 : count) : 0;
  const back = (): void => { session.current++; reset(); setReplace(false); applying.current = false; applied.current = false; };
  const close = (): void => { session.current++; reset(); setOpen(false); setReplace(false); applying.current = false; };
  const apply = async (): Promise<void> => {
    if (!preview || preview.status !== "ready" || total > 100 || applying.current || applied.current) return;
    applying.current = true; const currentSession = session.current;
    try {
      const questions = toReadyQuizQuestions(preview);
      if (!empty && replace) {
        setConfirming(true);
        const confirmed = await requestConfirmation({ title: `Thay thế ${count} câu đang soạn?`, description: `Thay bằng ${questions.length} câu vừa nhập. Nội dung chưa được lưu lên hệ thống.`, confirmLabel: "Thay thế câu hỏi", destructive: true });
        if (!confirmed || currentSession !== session.current) return;
      }
      applied.current = true; onApply(questions, empty || replace, {}); close();
      notify.success({ title: `Đã đưa ${questions.length} câu vào trình soạn`, description: "Bấm Lưu nháp khi bạn muốn lưu các thay đổi." });
    } catch (error) { notify.error({ title: "Chưa nhập được câu hỏi", description: error instanceof Error ? error.message : "Hãy kiểm tra file rồi tải lại." }); }
    finally { applying.current = false; setConfirming(false); }
  };
  const choose = (): void => input.current?.click();
  return <>
    <ImportFileButton onClick={() => { session.current++; applying.current = false; applied.current = false; setOpen(true); }} />
    <Dialog open={open} onOpenChange={value => { if (value) setOpen(true); else close(); }}>
      <DialogContent className={cn("quiz-dialog flex max-h-[90dvh] flex-col gap-0 overflow-hidden border-mod-border bg-mod-surface p-0 font-moderator text-mod-text sm:p-0", preview ? "h-[min(680px,90dvh)] max-w-3xl" : "max-w-2xl")}>
        <DialogHeader className="shrink-0 px-4 pb-4 pt-5 sm:px-6"><div className="flex items-center gap-2">{preview && <Button type="button" variant="ghost" size="icon" aria-label="Quay lại chọn tệp" title="Bỏ kết quả xem trước và chọn tệp khác" disabled={confirming} onClick={back}><ArrowLeft aria-hidden="true" /></Button>}<DialogTitle>Import câu hỏi</DialogTitle></div><DialogDescription>Chọn tài liệu để xem trước câu hỏi và kiểm tra lỗi trước khi đưa vào trình soạn.</DialogDescription></DialogHeader>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-5 sm:px-6" aria-busy={loading}>
          {preview ? <QuizImportPreview result={preview} /> : loading ? <div className="flex min-h-72 flex-col items-center justify-center gap-4 text-center" role="status" aria-live="polite">
            <SpinnerGap className="size-8 animate-spin text-mod-text-secondary" aria-hidden="true" />
            <p className="max-w-full break-all text-sm font-semibold">{state.status === "uploading" || state.status === "processing" ? state.fileName : ""}</p>
            <p className="text-sm text-mod-text-secondary">{state.status === "uploading" ? "Đang tải tài liệu…" : "Đang đọc và phân tích câu hỏi…"}</p>
            {waiting && <p className="max-w-sm text-sm leading-6 text-mod-text-secondary">Tài liệu đang được xử lý. Bạn có thể đóng cửa sổ bằng nút X để dừng.</p>}
          </div> : <div className="space-y-4">
            {state.status === "failure" && <p role="alert" className="text-sm leading-6 text-mod-danger">{state.message}</p>}
            <DocumentFilePicker label="Kéo thả tài liệu câu hỏi vào đây" onFiles={(files) => { void load(files); }} disabled={loading || confirming} />
          </div>}
        </div>
        <input ref={input} type="file" className="sr-only" tabIndex={-1} aria-label="Chọn tài liệu câu hỏi" accept=".doc,.docx,.pdf,.txt,.md" disabled={loading || confirming} onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void load(files); }} />
        {preview && <div className="shrink-0 space-y-3 border-t border-mod-border px-4 py-4 sm:px-6">
          {!empty && <fieldset className="flex flex-wrap gap-4 text-sm"><legend className="mb-2 font-semibold">Câu hỏi đang có</legend><label className="inline-flex items-center gap-2"><input type="radio" name="import-apply" value="append" disabled={confirming} checked={!replace} onChange={() => setReplace(false)} />Thêm vào cuối</label><label className="inline-flex items-center gap-2"><input type="radio" name="import-apply" value="replace" disabled={confirming} checked={replace} onChange={() => setReplace(true)} />Thay thế câu hỏi hiện tại</label></fieldset>}
          {total > 100 && <p role="alert" className="text-sm text-mod-danger">Tổng số {total} câu vượt giới hạn 100. Chia nhỏ file hoặc chọn thay thế câu hỏi.</p>}
          <DialogFooter>{preview.status !== "ready" && <Button variant="outline" disabled={confirming} onClick={choose}>Tải lại file đã sửa</Button>}<Button disabled={preview.status !== "ready" || total > 100 || confirming} onClick={() => void apply()}>Đưa vào trình soạn</Button></DialogFooter>
        </div>}
      </DialogContent>
    </Dialog>
    <ConfirmationDialog {...confirmation} />
  </>;
}
