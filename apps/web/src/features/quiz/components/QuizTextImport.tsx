import { useEffect, useRef, useState, type ReactElement } from "react";
import type { QuizDraftQuestion } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { ConfirmationDialog } from "@/shared/components/common/ConfirmationDialog";
import { useConfirmationDialog } from "@/shared/hooks/useConfirmationDialog";
import { notify } from "@/shared/lib/notifications";
import { cn } from "@/lib/utils";
import { quizService } from "../services/quizService";
import { importQuestionIssues, parseQuizText, type QuizImportNotes } from "../utils/quizTextImport";
import { QUIZ_IMPORT_TEMPLATE } from "../utils/quizImportTemplate";

interface ImportProps {
  count: number;
  empty: boolean;
  defaultTime: number;
  onApply: (questions: QuizDraftQuestion[], replace: boolean, notes: QuizImportNotes) => void;
}

function ImportSession({ count, empty, defaultTime, onApply, onClose, onDirtyChange, onBusyChange }: ImportProps & {
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
}): ReactElement {
  const [source, setSource] = useState("");
  const [fileName, setFileName] = useState("");
  const [tab, setTab] = useState<"paste" | "file">("paste");
  const [showTemplate, setShowTemplate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [replace, setReplace] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const upload = useRef<AbortController | null>(null);
  const cancelled = useRef(false);
  const { requestConfirmation, confirmation } = useConfirmationDialog();
  useEffect(() => { onDirtyChange(Boolean(source.trim())); }, [source, onDirtyChange]);
  useEffect(() => { onBusyChange(loading); }, [loading, onBusyChange]);
  useEffect(() => { cancelled.current = false; return () => { cancelled.current = true; upload.current?.abort(); }; }, []);

  const applyText = async (text: string): Promise<void> => {
    const result = parseQuizText(text, defaultTime);
    if (result.issues.length || !result.items.length) {
      setError(result.issues.join(" ") || "Chưa đọc được câu hỏi từ tài liệu.");
      setTab("paste");
      return;
    }
    const total = result.items.length + (empty || replace ? 0 : count);
    if (total > 100) {
      setError(`Tổng số ${total} câu vượt giới hạn 100. Hãy chia nhỏ nội dung hoặc chọn thay thế câu hỏi.`);
      setTab("paste");
      return;
    }
    if (!empty && replace && !await requestConfirmation({
      title: `Thay thế ${count} câu đang soạn?`,
      description: `Thay bằng ${result.items.length} câu vừa nhập. Các thông tin khác của bộ quiz được giữ lại. Thay đổi chưa được lưu lên hệ thống.`,
      confirmLabel: "Thay thế câu hỏi",
      destructive: true,
    })) return;
    if (cancelled.current) return;
    const notes: QuizImportNotes = {};
    for (const item of result.items) {
      if (item.issues.length || importQuestionIssues(item.question).length)
        notes[item.question.id] = { source: item.source, issues: item.issues };
    }
    const invalid = result.items.filter(item => item.issues.length || importQuestionIssues(item.question).length).length;
    onApply(result.items.map(item => item.question), empty || replace, notes);
    notify.success({
      title: `Đã nhập ${result.items.length} câu hỏi`,
      description: invalid ? `${invalid} câu cần kiểm tra. Sửa ngay trong trình soạn; nội dung chưa được tự lưu.` : "Bạn có thể chỉnh sửa và bấm Xem thử ngay trong trình soạn.",
    });
  };
  const loadFile = async (files: File[]): Promise<void> => {
    if (loading) return;
    if (files.length !== 1) { setError("Mỗi lần chọn một tài liệu."); return; }
    const file = files[0];
    if (!file) return;
    if (!/\.(docx|txt|md|pdf)$/i.test(file.name)) {
      setError(/\.doc$/i.test(file.name) ? "Hãy lưu .doc thành .docx hoặc dán nội dung trực tiếp." : "Chỉ hỗ trợ .docx, .txt, .md và PDF có văn bản.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) { setError("Tài liệu tối đa 5 MB."); return; }
    if (source.trim() && !await requestConfirmation({
      title: "Thay văn bản nguồn?",
      description: `Nội dung đang dán sẽ được thay bằng văn bản từ “${file.name}”. Câu hỏi đang soạn chưa bị thay đổi.`,
      confirmLabel: "Thay nguồn",
    })) return;
    setLoading(true);
    setError("");
    const controller = new AbortController();
    upload.current = controller;
    try {
      const result = await quizService.extractDocument(file, controller.signal);
      if (!controller.signal.aborted && !cancelled.current) {
        setSource(result.text);
        setFileName(result.fileName);
        await applyText(result.text);
      }
    } catch (failure) {
      if (!controller.signal.aborted && !cancelled.current)
        setError(failure instanceof Error ? failure.message : "Không đọc được tài liệu. Hãy thử dán văn bản trực tiếp.");
    } finally {
      if (!cancelled.current) setLoading(false);
    }
  };
  const copyTemplate = async (): Promise<void> => {
    try { await navigator.clipboard.writeText(QUIZ_IMPORT_TEMPLATE); notify.success({ title: "Đã sao chép mẫu câu hỏi" }); }
    catch { setShowTemplate(true); setError("Chưa sao chép được tự động. Bạn có thể chọn và sao chép mẫu bên dưới."); }
  };

  return <>
    <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 sm:px-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div role="group" aria-label="Cách nhập câu hỏi" className="flex gap-2">
          <Button variant="outline" aria-pressed={tab === "paste"} disabled={loading} className={cn(tab === "paste" && "bg-mod-canvas-accent")} onClick={() => setTab("paste")}>Dán văn bản</Button>
          <Button variant="outline" aria-pressed={tab === "file"} disabled={loading} className={cn(tab === "file" && "bg-mod-canvas-accent")} onClick={() => setTab("file")}>Tải tài liệu</Button>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" onClick={() => setShowTemplate(value => !value)}>{showTemplate ? "Ẩn mẫu" : "Xem mẫu"}</Button>
          <Button variant="ghost" onClick={() => void copyTemplate()}>Sao chép mẫu</Button>
        </div>
      </div>
      {showTemplate && <div className="rounded-lg bg-mod-canvas-accent p-4">
        <pre className="max-h-52 overflow-auto whitespace-pre-wrap font-moderator text-sm leading-6">{QUIZ_IMPORT_TEMPLATE}</pre>
      </div>}
      {!empty && <fieldset className="space-y-2 text-sm">
        <legend className="mb-2 font-semibold">Câu hỏi đang có</legend>
        <label className="mr-5 inline-flex items-center gap-2"><input type="radio" name="import-apply" checked={!replace} disabled={loading} onChange={() => setReplace(false)} />Thêm vào cuối</label>
        <label className="inline-flex items-center gap-2"><input type="radio" name="import-apply" checked={replace} disabled={loading} onChange={() => setReplace(true)} />Thay thế câu hỏi hiện tại</label>
      </fieldset>}
      {tab === "paste" ? <div className="space-y-2">
        <label htmlFor="quiz-import-source" className="text-sm font-semibold">Văn bản câu hỏi{fileName && ` · ${fileName}`}</label>
        <Textarea id="quiz-import-source" className="min-h-64 text-sm" disabled={loading} value={source} onChange={event => { setSource(event.target.value); setError(""); }} placeholder="Dán câu hỏi, các lựa chọn và đáp án đúng vào đây…" />
      </div> : <div className={cn("flex min-h-56 flex-col items-center justify-center gap-4 rounded-lg border-2 border-dashed border-mod-border p-6 text-center", dragging && "border-mod-primary bg-mod-canvas-accent")}
        onDragOver={event => { event.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={event => { event.preventDefault(); setDragging(false); void loadFile(Array.from(event.dataTransfer.files)); }}>
        <p className="font-semibold">Kéo thả tài liệu câu hỏi vào đây</p>
        <p className="text-sm text-mod-text-secondary">Word .docx, .txt, .md hoặc PDF có văn bản · Tối đa 5 MB</p>
        <p className="max-w-sm text-sm text-mod-text-secondary">Câu hỏi đọc được sẽ xuất hiện ngay trong trình soạn để bạn chỉnh sửa.</p>
        <Button variant="outline" disabled={loading} onClick={() => input.current?.click()}>{loading ? "Đang đọc tài liệu…" : "Chọn tệp"}</Button>
      </div>}
      <input ref={input} type="file" className="sr-only" tabIndex={-1} aria-label="Chọn tài liệu câu hỏi" accept=".docx,.txt,.md,.pdf" disabled={loading} onChange={event => { const files = Array.from(event.target.files ?? []); event.target.value = ""; void loadFile(files); }} />
      {error && <p role="alert" className="text-sm text-mod-danger">{error}</p>}
    </div>
    <DialogFooter className="shrink-0 border-t border-mod-border px-4 py-4 sm:px-6">
      <Button variant="outline" onClick={onClose}>Hủy nhập</Button>
      {tab === "paste" && <Button disabled={loading || !source.trim()} onClick={() => void applyText(source)}>Đưa vào trình soạn</Button>}
    </DialogFooter>
    <ConfirmationDialog {...confirmation} />
  </>;
}

export function QuizTextImport(props: ImportProps): ReactElement {
  const [open, setOpen] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const { requestConfirmation, confirmation } = useConfirmationDialog();
  const close = async (): Promise<void> => {
    if ((dirty || busy) && !await requestConfirmation({
      title: "Hủy nhập câu hỏi?",
      description: "Nội dung đang nhập sẽ mất. Các câu hỏi trong trình soạn được giữ nguyên.",
      confirmLabel: "Hủy nhập",
    })) return;
    setOpen(false); setDirty(false); setBusy(false);
  };
  return <>
    <Button variant="outline" onClick={() => setOpen(true)}>Nhập câu hỏi</Button>
    <Dialog open={open} onOpenChange={value => { if (value) setOpen(true); else void close(); }}>
      <DialogContent className="flex max-h-[90dvh] max-w-2xl flex-col gap-0 overflow-hidden border-mod-border bg-mod-surface p-0 font-moderator text-mod-text sm:p-0">
        <DialogHeader className="shrink-0 px-4 pb-0 pt-5 sm:px-6">
          <DialogTitle>Nhập câu hỏi</DialogTitle>
          <DialogDescription>Dán chữ hoặc chọn tài liệu để đưa câu hỏi vào trình soạn. Không tự lưu hoặc đăng tải.</DialogDescription>
        </DialogHeader>
        {open && <ImportSession {...props} onClose={() => void close()} onDirtyChange={setDirty} onBusyChange={setBusy} onApply={(questions, replace, notes) => {
          props.onApply(questions, replace, notes); setOpen(false); setDirty(false); setBusy(false);
        }} />}
      </DialogContent>
    </Dialog>
    <ConfirmationDialog {...confirmation} />
  </>;
}
