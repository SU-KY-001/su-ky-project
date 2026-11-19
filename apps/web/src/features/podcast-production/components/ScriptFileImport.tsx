import { useEffect, useRef, useState, type ReactElement, type RefObject } from "react";
import { QUIZ_IMPORT_LIMITS, SCRIPT_MAX_CHARACTERS, analyzeStructuredScript, normalizeStructuredScriptText, type ScriptKind } from "@repo/shared";
import { CheckCircle2, FileText, LoaderCircle, TriangleAlert, Users, Mic } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { DocumentFilePicker } from "@/shared/components/common/DocumentFilePicker";
import { ConfirmationDialog } from "@/shared/components/common/ConfirmationDialog";
import { useConfirmationDialog } from "@/shared/hooks/useConfirmationDialog";
import { notify } from "@/shared/lib/notifications";
import { extractScriptDocument } from "../services/scriptImportService";
import { ImportFileButton } from "@/shared/components/common/ImportFileButton";
import type { RichScriptEditorHandle } from "./RichScriptEditor";

export type ScriptImportTarget = Pick<RichScriptEditorHandle, "getText"> & Partial<Pick<RichScriptEditorHandle, "importText">>;
export function ScriptFileImport({ editorRef, disabled = false, selectedType = "monologue", onApply }: { editorRef: RefObject<ScriptImportTarget | null>; disabled?: boolean; selectedType?: ScriptKind; onApply?: (text: string, kind: ScriptKind, replace: boolean, expected: string) => { ok: true } | { ok: false; reason: "CONFLICT" | "TOO_LONG" } }): ReactElement {
  const [open, setOpen] = useState(false), [text, setText] = useState<string | null>(null), [name, setName] = useState(""), [busy, setBusy] = useState(false), [error, setError] = useState(""), [applying, setApplying] = useState(false);
  const request = useRef<AbortController | null>(null), version = useRef(0), committing = useRef(false);
  const [acceptedType, setAcceptedType] = useState<ScriptKind | null>(null);
  const analysis = analyzeStructuredScript(text ?? "");
  const chosen = acceptedType ?? selectedType;
  const mismatch = text !== null && analysis.kind !== chosen;
  const { requestConfirmation, confirmation } = useConfirmationDialog();
  useEffect(() => () => request.current?.abort(), []);
  const close = (): void => { version.current++; request.current?.abort(); request.current = null; setBusy(false); setOpen(false); setText(null); setError(""); setAcceptedType(null); };
  const load = async (files: File[]): Promise<void> => {
    if (busy) return;
    const file = files[0];
    if (files.length !== 1 || !file) { setError("Mỗi lần chọn đúng một tài liệu."); return; }
    if (!/\.(doc|docx|pdf|txt|md)$/i.test(file.name) || !file.size || file.size > QUIZ_IMPORT_LIMITS.bytes) { setError("Chọn DOC, DOCX, PDF có văn bản, TXT hoặc MD không rỗng, tối đa 5 MB."); return; }
    const controller = new AbortController(), id = ++version.current; request.current = controller;
    setBusy(true); setError(""); setName(file.name);
    try {
      const result = await extractScriptDocument(file, controller.signal);
      if (controller.signal.aborted || version.current !== id) return;
      // txt/md blocks are already single lines; joining with a blank line would triple every gap.
      setText(normalizeStructuredScriptText(result.blocks.map((block) => block.text).join(result.format === "txt" || result.format === "md" ? "\n" : "\n\n")));
    } catch (caught) { if (!controller.signal.aborted && version.current === id) setError(caught instanceof Error ? caught.message : "Không đọc được tài liệu."); }
    finally { if (version.current === id) { setBusy(false); request.current = null; } }
  };
  const apply = async (): Promise<void> => {
    if (!text || committing.current || mismatch) return;
    const id = version.current, editor = editorRef.current;
    if (!editor) return;
    committing.current = true; setApplying(true);
    try {
      const expected = editor.getText();
      if (expected.trim() && !await requestConfirmation({ title: "Thay thế kịch bản hiện tại?", description: "Nội dung đang soạn sẽ được thay bằng bản xem trước này. Hủy để giữ nguyên kịch bản hiện tại.", confirmLabel: "Thay thế kịch bản", destructive: true })) return;
      if (id !== version.current) return;
      const target = editorRef.current;
      if (!target) return;
      const result = onApply ? onApply(text, chosen, true, expected) : target.importText?.(text, true, expected) ?? { ok: false as const, reason: "CONFLICT" as const };
      if (!result.ok) { setError(result.reason === "TOO_LONG" ? `Kịch bản vượt giới hạn ${SCRIPT_MAX_CHARACTERS.toLocaleString("vi-VN")} ký tự. Chưa chèn nội dung.` : "Kịch bản đã thay đổi. Kiểm tra lại trước khi nhập."); return; }
      close(); notify.success({ title: "Đã nhập nội dung kịch bản", description: "Bấm Lưu kịch bản để lưu nội dung vừa nhập." });
    } finally { committing.current = false; setApplying(false); }
  };
  const tooLong = text !== null && text.length > SCRIPT_MAX_CHARACTERS;
  const hasPreview = text !== null;
  const recognizedLabel = analysis.kind === "dialogue" ? "Hội thoại" : analysis.kind === "monologue" ? "Độc thoại" : "Cần kiểm tra cấu trúc";
  const speakerNames = [...new Set(analysis.turns.map((turn) => turn.speaker))];
  return <><ImportFileButton disabled={disabled} onClick={() => setOpen(true)} />
    <Dialog open={open} onOpenChange={(next) => { if (!next) close(); }}>
      <DialogContent className="script-import-dialog flex max-h-[90dvh] max-w-4xl flex-col gap-0 overflow-hidden border-mod-border bg-mod-surface p-0 font-moderator text-mod-text sm:p-0">
        <DialogHeader className="shrink-0 border-b border-mod-border px-5 py-5 sm:px-6">
          <DialogTitle>{hasPreview ? "Xem trước kịch bản" : "Nhập kịch bản từ file"}</DialogTitle>
          <DialogDescription>{hasPreview ? "Kiểm tra loại podcast và nội dung trước khi xác nhận." : "Chọn DOC, DOCX, PDF có văn bản, TXT hoặc MD · Tối đa 5 MB."}</DialogDescription>
        </DialogHeader>
        {hasPreview ? <div className="shrink-0 space-y-3 border-b border-mod-border px-5 py-4 sm:px-6">
          <div className="flex min-w-0 items-center gap-3"><FileText className="size-5 shrink-0 text-mod-text-secondary" aria-hidden="true" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold" title={name}>{name}</p><p className="mt-0.5 text-xs text-mod-text-secondary">{text.length.toLocaleString("vi-VN")} ký tự · Nội dung sẽ được nhập đúng như bản xem trước</p></div></div>
          <div className="flex flex-wrap items-center gap-2 text-xs"><span className="inline-flex items-center gap-1.5 rounded-md bg-mod-canvas-accent px-2.5 py-1.5 font-semibold">{analysis.kind === "dialogue" ? <Users size={14} aria-hidden="true" /> : <Mic size={14} aria-hidden="true" />}Nhận diện: {recognizedLabel}</span><span className={mismatch ? "inline-flex items-center gap-1.5 text-mod-danger" : "inline-flex items-center gap-1.5 text-mod-text-secondary"}>{mismatch ? <TriangleAlert size={14} aria-hidden="true" /> : <CheckCircle2 size={14} aria-hidden="true" />}{mismatch ? "Đang chọn " + (chosen === "dialogue" ? "Hội thoại" : "Độc thoại") : "Khớp loại podcast đã chọn"}</span>{analysis.kind === "dialogue" ? <span className="text-mod-text-secondary">{speakerNames.length} người nói · {analysis.turns.length} lượt thoại</span> : null}</div>
          {mismatch ? <div role="alert" className="space-y-2 rounded-lg bg-mod-danger/5 p-3 text-sm"><p className="text-mod-danger">{analysis.kind === "ambiguous" ? analysis.issues.join(" ") : analysis.kind === "dialogue" ? `Bạn đang chọn Độc thoại, nhưng file có kịch bản Hội thoại với ${speakerNames.length} người nói. Đổi sang Hội thoại hoặc chọn lại file độc thoại.` : "Bạn đang chọn Hội thoại, nhưng file có kịch bản Độc thoại. Đổi sang Độc thoại hoặc chọn lại file hội thoại."}</p>{analysis.kind !== "ambiguous" && onApply ? <Button type="button" size="sm" variant="outline" onClick={() => setAcceptedType(analysis.kind === "dialogue" ? "dialogue" : "monologue")}>Đổi sang {analysis.kind === "dialogue" ? "Hội thoại" : "Độc thoại"}</Button> : null}</div> : null}
        </div> : null}
        <div className="script-import-scroll min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6" aria-busy={busy}>
          {busy ? <div role="status" className="flex min-h-64 flex-col items-center justify-center gap-3 text-center"><LoaderCircle className="size-6 animate-spin text-mod-primary" aria-hidden="true" /><p className="text-sm font-semibold">Đang đọc kịch bản…</p><p className="max-w-full break-all text-xs text-mod-text-secondary">{name}</p></div> : hasPreview ? <>
            <pre className="m-0 whitespace-pre-wrap break-words font-moderator text-sm leading-7 text-mod-text">{text}</pre>
            {analysis.kind === "ambiguous" ? <details className="mt-5 rounded-lg border border-mod-border p-3"><summary className="cursor-pointer text-sm font-semibold">Chỉnh cấu trúc văn bản</summary><label className="mt-3 grid gap-2 text-xs text-mod-text">Mỗi lượt hội thoại bắt đầu bằng tên người nói và dấu hai chấm.<textarea aria-label="Sửa cấu trúc kịch bản nhập" className="min-h-48 w-full rounded-md border border-mod-border bg-mod-surface p-3 text-sm leading-6" value={text} onChange={(event) => setText(event.target.value)} /></label></details> : null}
          </> : <DocumentFilePicker label="Kéo thả tài liệu kịch bản vào đây" onFiles={(files) => void load(files)} disabled={busy} />}
        </div>
        <DialogFooter className="shrink-0 border-t border-mod-border px-5 py-4 sm:px-6">
          {error || tooLong ? <p role="alert" className="w-full text-sm text-mod-danger">{error || "Văn bản vượt giới hạn kịch bản. Chia nhỏ file rồi tải lại; nội dung không bị cắt tự động."}</p> : null}
          <Button type="button" variant="ghost" onClick={close}>Hủy</Button>
          {hasPreview ? <><Button type="button" variant="outline" disabled={applying} onClick={() => { setText(null); setError(""); setAcceptedType(null); }}>Chọn file khác</Button><Button type="button" disabled={!text || tooLong || applying || mismatch} onClick={() => void apply()}>Đưa vào trình soạn</Button></> : null}
        </DialogFooter>
      </DialogContent>
    </Dialog><ConfirmationDialog {...confirmation} /></>;
}
