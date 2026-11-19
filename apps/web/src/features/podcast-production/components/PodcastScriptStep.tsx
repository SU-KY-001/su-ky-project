import {
  useRef,
  useState,
  type ChangeEvent,
  type ReactElement,
} from "react";
import type { EditorDocument, StudioSeriesDetailDto } from "@repo/shared";
import {
  CheckCircle2,
  FileText,
  LoaderCircle,
  Paperclip,
  RefreshCw,
  Save,
  Trash2,
  Upload,
  Sparkles,
  PenLine,
  Search,
  X,
} from "lucide-react";
import { uploadCatalogMedia } from "@/features/historical-library/services/catalogMediaService";
import { newIdempotencyKey } from "@/lib/idempotency";
import { Button } from "@/shared/components/ui/button";
import { notify } from "@/shared/lib/notifications";
import type { PodcastCreationWizard } from "../hooks/usePodcastCreationWizard";
import {
  usePodcastEpisode,
  useWordsPerMinute,
  usePodcastInvalidation,
} from "../hooks/usePodcastProduction";
import {
  legacyScriptToDocument,
  emptyScriptDocument,
  scriptCharacterCount,
  scriptDocumentText,
} from "../scriptEditor";
import { podcastProductionService as api } from "../services/podcastProductionService";
import { RichScriptEditor, type RichScriptEditorHandle } from "./RichScriptEditor";
import { DialogueRichEditor } from "./DialogueRichEditor";
import { structuredDialogue } from "../structuredScript";
import type { ScriptKind } from "@repo/shared";
import { newDialogue } from "../dialogueState";
import { AiDock } from "./AiDock";
import { AiAssistantPanel, type DockState } from "./AiAssistantPanel";
import { ScriptFileImport, type ScriptImportTarget } from "./ScriptFileImport";
import { PodcastTypeSelect } from "./PodcastTypeSelect";
import { ShimmerButton } from "@/shared/components/ui/shimmer-button";

interface PendingDocument {
  id: string;
  file: File;
  assetId?: string;
  status: "waiting" | "uploading" | "attached" | "error";
  error?: string;
}

const allowedExtensions = new Set(["pdf", "doc", "docx"]);

function documentExtension(file: File): string {
  return file.name.split(".").pop()?.toLowerCase() ?? "";
}

export function PodcastScriptStep({
  wizard,
  sources,
  readOnly,
}: {
  wizard: PodcastCreationWizard;
  sources: StudioSeriesDetailDto["sources"];
  readOnly: boolean;
}): ReactElement {
  const editorRef = useRef<RichScriptEditorHandle>(null);
  const dialogueRef = useRef<ScriptImportTarget>(null);
  const [editorRevision, setEditorRevision] = useState(0);
  const [typeChosen, setTypeChosen] = useState(Boolean(wizard.state.dialogue || wizard.state.scriptText.trim()));
  const [kind, setKind] = useState<ScriptKind>(wizard.state.dialogue ? "dialogue" : "monologue");
  const [mode, setMode] = useState<"manual" | "ai">("manual");
  const [aiVisited, setAiVisited] = useState(false);
  const [dock, setDock] = useState<DockState>("closed");
  const [reviewVisited, setReviewVisited] = useState(false);
  const [reviewRequest, setReviewRequest] = useState(0);
  const [openCount, setOpenCount] = useState<number | null>(null);
  const [clickedBlock, setClickedBlock] = useState<{ ref: string; seq: number } | null>(null);
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const [saving, setSaving] = useState(false);


  const [error, setError] = useState("");
  const [pasteWarning, setPasteWarning] = useState("");
  const episode = usePodcastEpisode(wizard.state.episodeId ?? "");
  const invalidate = usePodcastInvalidation();
  const document = wizard.state.scriptDocument ?? emptyScriptDocument();
  const characterCount = scriptCharacterCount(document);
  const wordsPerMinute = useWordsPerMinute();
  const switchMode = (next: "manual" | "ai"): void => { setMode(next); if (next === "ai") setAiVisited(true); };

  const applyImport = (text: string, nextKind: ScriptKind, replace: boolean, expected: string): { ok: true } | { ok: false; reason: "CONFLICT" | "TOO_LONG" } => {
    if (replace && (wizard.state.dialogue ? dialogueRef.current : editorRef.current)?.getText() !== expected) return { ok: false, reason: "CONFLICT" };
    try {
      if (nextKind === "dialogue") {
        if (!replace && kind !== nextKind && wizard.state.scriptText.trim()) { setError("Chọn thay thế để chuyển loại kịch bản; không trộn hai loại."); return { ok: false, reason: "CONFLICT" }; }
        const value = structuredDialogue(text, !replace ? wizard.state.dialogue ?? undefined : undefined);
        wizard.dispatch({ type: "setDialogue", value });
      } else {
        if (kind === "dialogue" && !replace && wizard.state.scriptText.trim()) return { ok: false, reason: "CONFLICT" };
        if (kind === "monologue") return editorRef.current?.importText(text, replace, replace ? expected : undefined) ?? { ok: false, reason: "CONFLICT" };
        wizard.dispatch({ type: "setDialogue", value: null });
        const document = legacyScriptToDocument(text);
        wizard.dispatch({ type: "setScript", document, text: scriptDocumentText(document) });
      }
      setKind(nextKind); setTypeChosen(true); setEditorRevision(value => value + 1); return { ok: true };
    } catch (caught) { setError(caught instanceof Error ? caught.message : "Không nhập được kịch bản."); return { ok: false, reason: "CONFLICT" }; }
  };
  const persistScript = async (manual = false): Promise<void> => {
    setSaving(true);
    setError("");
    try {
      await wizard.saveScript(wizard.state.scriptDocument ?? emptyScriptDocument());
      if (manual) notify.success({ title: "Đã lưu kịch bản" });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Không lưu được kịch bản.";
      setError(message);
      if (manual) notify.error({ title: "Không thể lưu kịch bản", description: message });
    } finally {
      setSaving(false);
    }
  };

  const processDocument = async (item: PendingDocument): Promise<void> => {
    setPendingDocuments((current) =>
      current.map((entry) =>
        entry.id === item.id ? { ...entry, status: "uploading", error: undefined } : entry,
      ),
    );
    try {
      const episodeId = await wizard.ensureDraft();
      const assetId = item.assetId ?? (await uploadCatalogMedia(item.file, "DOCUMENT"));
      await api.attachDocument(
        episodeId,
        { assetId, fileName: item.file.name },
        newIdempotencyKey(),
      );
      setPendingDocuments((current) =>
        current.filter((entry) => entry.id !== item.id),
      );
      await invalidate();
      notify.success({ title: "Đã thêm tài liệu", description: item.file.name });
    } catch (caught) {
      notify.error({ title: "Không thể thêm tài liệu", description: caught instanceof Error ? caught.message : "Không tải được tài liệu." });
      setPendingDocuments((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? {
                ...entry,
                status: "error",
                error: caught instanceof Error ? caught.message : "Không tải được tài liệu.",
              }
            : entry,
        ),
      );
    }
  };

  const selectDocuments = (event: ChangeEvent<HTMLInputElement>): void => {
    const files = Array.from(event.target.files ?? []);
    const accepted: PendingDocument[] = [];
    const rejected = files.filter((file) => !allowedExtensions.has(documentExtension(file)));
    for (const file of files) {
      if (!allowedExtensions.has(documentExtension(file))) continue;
      accepted.push({ id: crypto.randomUUID(), file, status: "waiting" });
    }
    setPendingDocuments((current) => [...current, ...accepted]);
    if (rejected.length) {
      setError("Chỉ hỗ trợ tài liệu PDF, DOC hoặc DOCX.");
      notify.warning({ title: "Định dạng tài liệu không được hỗ trợ", description: "Chỉ hỗ trợ tài liệu PDF, DOC hoặc DOCX." });
    }
    accepted.forEach((item) => void processDocument(item));
    event.target.value = "";
  };

  const removeAttached = async (attachmentId: string): Promise<void> => {
    if (!wizard.state.episodeId) return;
    try {
      await api.removeDocument(wizard.state.episodeId, attachmentId);
      await invalidate();
      notify.success({ title: "Đã gỡ tài liệu" });
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Không gỡ được tài liệu.";
      setError(message);
      notify.error({ title: "Không thể gỡ tài liệu", description: message });
    }
  };



  if (readOnly) return (
    <section aria-labelledby="podcast-script-title" className="space-y-4">
      <div>
        <h2 id="podcast-script-title" className="text-lg font-bold text-mod-text">Kịch bản</h2>
        <p className="mt-1 text-sm text-mod-text-secondary">{characterCount.toLocaleString("vi-VN")} ký tự · nội dung đã lưu</p>
      </div>
      {wizard.state.dialogue ? <DialogueRichEditor dialogue={wizard.state.dialogue} onChange={() => undefined} disabled /> : <RichScriptEditor initialDocument={document} onChange={() => undefined} disabled />}
      <section className="rounded-xl border border-mod-border p-4" aria-label="Nguồn và tài liệu của tập">
        <h3 className="font-bold text-mod-text">Nguồn và tài liệu</h3>
        <p className="mt-1 text-sm text-mod-text-secondary">{sources.length} nguồn từ series · {episode.data?.attachments.length ?? 0} tài liệu bổ sung</p>
        {episode.data?.attachments.length ? (
          <ul className="mt-3 space-y-2 text-sm">
            {episode.data.attachments.map((attachment) => (
              <li key={attachment.id}>
                <a href={attachment.asset.previewUrl ?? undefined} target="_blank" rel="noreferrer" className="font-semibold text-mod-primary hover:underline">{attachment.fileName}</a>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </section>
  );

  return (
    <section aria-labelledby="podcast-script-title" className="podcast-script-workspace space-y-4" data-script-mode={mode}>
      <div>
        <h2 id="podcast-script-title" className="text-lg font-bold text-mod-text">Kịch bản</h2>
        <p className="mt-1 text-sm text-mod-text-secondary">{wizard.state.dialogue ? "Chọn người nói cho mỗi lượt." : "Soạn thủ công hoặc chuyển sang Trợ lý AI để tạo và hoàn thiện kịch bản."}</p>
      </div>
      <div role="toolbar" aria-label="Chế độ soạn kịch bản" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-mod-border bg-mod-canvas-accent p-3">
        <PodcastTypeSelect value={typeChosen ? kind : undefined} canChange={!wizard.state.scriptText.trim() && mode === "manual"} onChange={(next) => { setTypeChosen(true); setKind(next); wizard.dispatch({ type: "setDialogue", value: next === "dialogue" ? newDialogue() : null }); setEditorRevision(value => value + 1); }} />
        <ShimmerButton disabled={!typeChosen || kind === "dialogue"} title={kind === "dialogue" ? "Trợ lý AI soạn nháp hiện hỗ trợ độc thoại. Import và soạn hội thoại trong editor bên dưới." : undefined} type="button" aria-pressed={mode === "ai"} aria-label={mode === "ai" ? "Về soạn thủ công" : "Trợ lý AI tạo kịch bản"} shimmerDuration="4s" className="gap-2 text-sm font-semibold shadow-[0_2px_8px_color-mix(in_srgb,var(--modText)_8%,transparent)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary" onClick={() => switchMode(mode === "manual" ? "ai" : "manual")}>
          {mode === "ai" ? <PenLine size={17} aria-hidden="true" /> : <Sparkles size={17} className="text-mod-primary" aria-hidden="true" />}<span>{mode === "ai" ? "Về soạn thủ công" : "Trợ lý AI tạo kịch bản"}</span>
        </ShimmerButton>
      </div>
      {!typeChosen ? <p className="rounded-lg border border-mod-border p-4 text-sm text-mod-text-secondary">Chọn loại podcast trước khi soạn hoặc import kịch bản.</p> : null}
      {reviewVisited ? <section hidden={mode !== "manual" || dock === "closed" || kind !== "monologue"} aria-label="Kết quả rà soát kịch bản" className="overflow-hidden rounded-xl border border-mod-border bg-mod-surface">
        <header className="flex items-center justify-between border-b border-mod-border px-4 py-3"><h3 className="flex items-center gap-2 text-sm font-semibold"><Search size={16} />Rà soát kịch bản</h3><Button type="button" size="icon-sm" variant="ghost" aria-label="Đóng kết quả rà soát" onClick={() => setDock("closed")}><X size={16} /></Button></header>
        <div className="h-[min(60dvh,36rem)] min-h-64"><AiAssistantPanel editorRef={editorRef} episodeId={wizard.state.episodeId ?? null} ensureEpisode={wizard.ensureDraft} sources={sources} hasScript={characterCount > 0} dock={dock} onDockChange={setDock} clickedBlock={clickedBlock} onOpenCountChange={setOpenCount} fullWorkspace interactive={mode === "manual" && dock !== "closed"} reviewRequest={reviewRequest} onShowBlock={(ref) => { editorRef.current?.focusBlock(ref); }} /></div>
      </section> : null}
      <div className="podcast-script-mode-body flex min-w-0 flex-col gap-4">
        <div className="podcast-script-manual min-w-0 space-y-4">
          {wizard.state.dialogue ? <DialogueRichEditor key={`dialogue-${editorRevision}`} ref={dialogueRef} dialogue={wizard.state.dialogue} importControl={<ScriptFileImport editorRef={dialogueRef} disabled={saving} selectedType={kind} onApply={applyImport} />} onChange={(value) => { wizard.dispatch({ type: "setDialogue", value }); }} /> : <RichScriptEditor
            disabled={!typeChosen}
            key={`monologue-${editorRevision}`}
            ref={editorRef}
            initialDocument={document}
            onBlockClick={(ref) => setClickedBlock((previous) => ({ ref, seq: (previous?.seq ?? 0) + 1 }))}
            toolbarActions={<>
                {mode === "manual" ? <Button type="button" variant="ghost" disabled={!typeChosen || characterCount === 0} className="raised-tool-button h-10 gap-2 rounded-lg border-0 px-4 font-semibold text-mod-text shadow-[0_2px_4px_rgb(0_0_0/6%)]" onMouseDown={(event) => event.preventDefault()} onClick={() => { setReviewVisited(true); setDock("panel"); setReviewRequest((value) => value + 1); }}><Search size={16} className="text-mod-primary" />AI rà soát{openCount !== null && openCount > 0 ? <span className="rounded bg-mod-canvas-accent px-1.5 text-xs">{openCount}</span> : null}</Button> : null}
              <ScriptFileImport editorRef={editorRef} disabled={saving || !typeChosen} selectedType={kind} onApply={applyImport} />
            </>}
            onPasteLimitReached={(limit) => {
              setPasteWarning(
                `Kịch bản hỗ trợ tối đa ${limit.toLocaleString("vi-VN")} ký tự. Phần nội dung vượt giới hạn không được chèn.`,
              );
            }}
            onChange={(nextDocument: EditorDocument) => {
              wizard.dispatch({
                type: "setScript",
                document: nextDocument,
                text: scriptDocumentText(nextDocument),
              });
            }}
          />}
          {pasteWarning ? (
            <p role="alert" className="text-sm text-mod-warning">
              {pasteWarning}
            </p>
          ) : null}


          <div className="flex justify-end"><Button type="button" variant="outline" disabled={saving} onClick={() => void persistScript(true)}>{saving ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save size={16} aria-hidden="true" />}Lưu kịch bản</Button></div>
          <section className="rounded-xl border border-mod-border p-4" aria-labelledby="script-documents-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 id="script-documents-title" className="font-bold text-mod-text">Tài liệu bổ sung</h3>
                <p className="mt-1 text-xs text-mod-text-secondary">PDF, DOC hoặc DOCX; nội dung file không được nhập tự động vào kịch bản.</p>
              </div>
              <Button type="button" variant="outline" size="sm" asChild><label className="cursor-pointer"><Upload size={15} aria-hidden="true" />Tải tài liệu<input className="sr-only" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple onChange={selectDocuments} /></label></Button>
            </div>
            <div className="mt-4 space-y-2">
              {episode.data?.attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center gap-3 rounded-lg bg-mod-canvas-accent px-3 py-2 text-sm">
                  <Paperclip size={16} className="text-mod-primary" aria-hidden="true" />
                  <a className="min-w-0 flex-1 truncate font-semibold text-mod-text hover:text-mod-primary" href={attachment.asset.previewUrl ?? undefined} target="_blank" rel="noreferrer">{attachment.fileName}</a>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Gỡ ${attachment.fileName}`} onClick={() => void removeAttached(attachment.id)}><Trash2 size={15} /></Button>
                </div>
              ))}
              {pendingDocuments.map((item) => (
                <div key={item.id} className="rounded-lg border border-mod-border px-3 py-2 text-sm">
                  <div className="flex items-center gap-3">
                    <FileText size={16} className="text-mod-text-secondary" aria-hidden="true" />
                    <span className="min-w-0 flex-1 truncate font-semibold text-mod-text">{item.file.name}</span>
                    {item.status === "uploading" ? <LoaderCircle size={16} className="animate-spin text-mod-primary" aria-label="Đang tải" /> : null}
                    {item.status === "attached" ? <CheckCircle2 size={16} className="text-mod-success" aria-label="Đã tải" /> : null}
                    {item.status === "error" ? <Button type="button" variant="ghost" size="sm" onClick={() => void processDocument(item)}><RefreshCw size={14} /> Thử lại</Button> : null}
                  </div>
                  {item.error ? <p className="mt-1 text-xs text-mod-danger">{item.error}</p> : null}
                </div>
              ))}
              {!episode.data?.attachments.length && !pendingDocuments.length ? (
                <p className="rounded-lg border border-dashed border-mod-border p-4 text-center text-sm text-mod-text-secondary">Chưa có tài liệu bổ sung.</p>
              ) : null}
            </div>
          </section>
          {error ? <p role="alert" className="text-sm text-mod-danger">{error}</p> : null}
        </div>

        <div hidden={mode !== "ai"} className="podcast-script-ai order-first min-w-0">
          <aside aria-label="Trợ lý AI" className="h-auto min-w-0 overflow-hidden rounded-xl border border-mod-border bg-mod-surface">
            {aiVisited ? <AiDock
              editorRef={editorRef}
              ensureEpisode={wizard.ensureDraft}
              wordsPerMinute={wordsPerMinute}
            /> : null}
          </aside>
        </div>
      </div>
    </section>
  );
}
