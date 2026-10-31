import {
  useEffect,
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
} from "lucide-react";
import { uploadCatalogMedia } from "@/features/historical-library/services/catalogMediaService";
import { newIdempotencyKey } from "@/lib/idempotency";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import type { PodcastCreationWizard } from "../hooks/usePodcastCreationWizard";
import {
  usePodcastEpisode,
  useWordsPerMinute,
  usePodcastInvalidation,
} from "../hooks/usePodcastProduction";
import { savedAtLabel } from "../aiCheck/presentation";
import { estimatedReadMinutes, scriptWordCount } from "../scriptDuration";
import {
  emptyScriptDocument,
  scriptCharacterCount,
  scriptDocumentText,
} from "../scriptEditor";
import { podcastProductionService as api } from "../services/podcastProductionService";
import { RichScriptEditor, type RichScriptEditorHandle } from "./RichScriptEditor";
import { DialogueScriptStep } from "./DialogueScriptStep";
import { newDialogue } from "../dialogueState";
import { AiDock, type AiTab } from "./AiDock";
import type { DockState } from "./AiAssistantPanel";
import type { SelectionRange } from "../aiCheck/editorBlocks";
import { ScriptSourcesPanel } from "./ScriptSourcesPanel";
import { Popover, PopoverContent, PopoverTrigger } from "@/shared/components/ui/popover";

interface PendingDocument {
  id: string;
  file: File;
  assetId?: string;
  status: "waiting" | "uploading" | "attached" | "error";
  error?: string;
}

const allowedExtensions = new Set(["pdf", "doc", "docx"]);
/** Tailwind `xl`: from this width the AI dock sits beside the editor; below it the dock overlays, so it starts closed. */
const DOCK_OPEN_MEDIA = "(min-width: 1280px)";

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
  const changed = useRef(false);
  const [dock, setDock] = useState<DockState>(() => (window.matchMedia(DOCK_OPEN_MEDIA).matches ? "panel" : "closed"));
  const [aiTab, setAiTab] = useState<AiTab>("check");
  const [openCount, setOpenCount] = useState<number | null>(null);
  const [clickedBlock, setClickedBlock] = useState<{ ref: string; seq: number } | null>(null);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [rewriteRange, setRewriteRange] = useState<SelectionRange | null>(null);
  const [pendingDocuments, setPendingDocuments] = useState<PendingDocument[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved" | "error">("idle");
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [error, setError] = useState("");
  const [pasteWarning, setPasteWarning] = useState("");
  const episode = usePodcastEpisode(wizard.state.episodeId ?? "");
  const invalidate = usePodcastInvalidation();
  const document = wizard.state.scriptDocument ?? emptyScriptDocument();
  const characterCount = scriptCharacterCount(document);
  const wordsPerMinute = useWordsPerMinute();
  const dockWide = dock === "wide" || rewriteRange !== null || aiTab === "draft";

  const persistScript = async (): Promise<void> => {
    setSaving(true);
    setError("");
    try {
      await wizard.saveScript(wizard.state.scriptDocument ?? emptyScriptDocument());
      setSaveState("saved");
      setSavedAt(new Date());
    } catch (caught) {
      setSaveState("error");
      setError(caught instanceof Error ? caught.message : "Không lưu được kịch bản.");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    if (readOnly || !changed.current || !wizard.state.scriptDirty) return;
    const timer = window.setTimeout(() => {
      void persistScript();
    }, 900);
    return () => window.clearTimeout(timer);
  }, [readOnly, wizard.state.scriptDocument, wizard.state.scriptDirty]);

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
    } catch (caught) {
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
    if (rejected.length) setError("Chỉ hỗ trợ tài liệu PDF, DOC hoặc DOCX.");
    accepted.forEach((item) => void processDocument(item));
    event.target.value = "";
  };

  const removeAttached = async (attachmentId: string): Promise<void> => {
    if (!wizard.state.episodeId) return;
    try {
      await api.removeDocument(wizard.state.episodeId, attachmentId);
      await invalidate();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không gỡ được tài liệu.");
    }
  };

  if (wizard.state.dialogue) return <DialogueScriptStep wizard={wizard} readOnly={readOnly} />;

  if (readOnly) return (
    <section aria-labelledby="podcast-script-title" className="space-y-4">
      <div>
        <h2 id="podcast-script-title" className="text-lg font-bold text-mod-text">Kịch bản</h2>
        <p className="mt-1 text-sm text-mod-text-secondary">{characterCount.toLocaleString("vi-VN")} ký tự · nội dung đã lưu</p>
      </div>
      <RichScriptEditor initialDocument={document} onChange={() => undefined} disabled />
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
    <section aria-labelledby="podcast-script-title" className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id="podcast-script-title" className="text-lg font-bold text-mod-text">Kịch bản</h2>
          <p className="mt-1 text-sm text-mod-text-secondary">Soạn nội dung, gắn nguồn và tải tài liệu bổ sung.</p>
          {characterCount === 0 ? (
            <Button type="button" variant="outline" size="sm" className="mt-2" onClick={() => wizard.dispatch({ type: "setDialogue", value: newDialogue() })}>
              Chuyển sang hội thoại hai người
            </Button>
          ) : null}
        </div>
        <div className="text-right text-xs text-mod-text-secondary">
          <p>
            {characterCount.toLocaleString("vi-VN")} ký tự · {scriptWordCount(wizard.state.scriptText).toLocaleString("vi-VN")} từ
            {wordsPerMinute ? ` · khoảng ${estimatedReadMinutes(wizard.state.scriptText, wordsPerMinute)} phút đọc` : ""}
          </p>
          <p className={cn("mt-1", saveState === "error" ? "text-mod-danger" : "text-mod-success")}>
            {saving ? "Đang lưu tự động…" : saveState === "saved" && savedAt ? savedAtLabel(savedAt) : saveState === "error" ? "Chưa lưu được" : "Chưa có thay đổi"}
          </p>
        </div>
      </div>

      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1 space-y-4">
          <RichScriptEditor
            ref={editorRef}
            initialDocument={document}
            onRewriteRequest={(range) => {
              setRewriteRange(range);
              if (dock === "closed") setDock("panel");
            }}
            onBlockClick={(ref) => setClickedBlock((previous) => ({ ref, seq: (previous?.seq ?? 0) + 1 }))}
            toolbarActions={
              <>
                <Popover open={sourcesOpen} onOpenChange={setSourcesOpen}>
                  <PopoverTrigger asChild>
                    <Button type="button" size="sm" variant="outline">Nguồn ({sources.length})</Button>
                  </PopoverTrigger>
                  <PopoverContent align="end" className="w-80 p-3.5">
                    <ScriptSourcesPanel sources={sources} onInsert={(sourceId) => editorRef.current?.insertCitation(sourceId)} />
                  </PopoverContent>
                </Popover>
                <Button type="button" size="sm" aria-pressed={dock !== "closed"} onClick={() => setDock(dock === "closed" ? "panel" : "closed")}>
                  Trợ lý AI
                  {openCount !== null ? (
                    <span className={cn("grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white", openCount ? "bg-mod-attention" : "bg-mod-success")}>{openCount || "✓"}</span>
                  ) : null}
                </Button>
              </>
            }
            onPasteLimitReached={(limit) => {
              setPasteWarning(
                `Kịch bản hỗ trợ tối đa ${limit.toLocaleString("vi-VN")} ký tự. Phần nội dung vượt giới hạn không được chèn.`,
              );
            }}
            onChange={(nextDocument: EditorDocument) => {
              changed.current = true;
              setSaveState("idle");
              wizard.dispatch({
                type: "setScript",
                document: nextDocument,
                text: scriptDocumentText(nextDocument),
              });
            }}
          />
          {pasteWarning ? (
            <p role="alert" className="text-sm text-mod-warning">
              {pasteWarning}
            </p>
          ) : null}
          <div className="flex justify-end">
            <Button type="button" variant="outline" disabled={saving} onClick={() => void persistScript()}>
              {saving ? <LoaderCircle className="animate-spin" aria-hidden="true" /> : <Save aria-hidden="true" />}
              Lưu kịch bản
            </Button>
          </div>

          <section className="rounded-xl border border-mod-border p-4" aria-labelledby="script-documents-title">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 id="script-documents-title" className="font-bold text-mod-text">Tài liệu bổ sung</h3>
                <p className="mt-1 text-xs text-mod-text-secondary">PDF, DOC hoặc DOCX; nội dung file không được nhập tự động vào kịch bản.</p>
              </div>
              <Button type="button" variant="outline" size="sm" asChild>
                <label className="cursor-pointer">
                  <Upload size={15} aria-hidden="true" /> Tải tài liệu
                  <input className="sr-only" type="file" accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document" multiple onChange={selectDocuments} />
                </label>
              </Button>
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

        <div className={cn("relative w-0 shrink-0 self-stretch transition-[width] duration-300 ease-out", dock === "closed" ? "-ml-4" : dockWide ? "xl:w-[620px]" : "xl:w-[340px]")}>
          <aside
            aria-label="Trợ lý AI"
            className={cn(
              "sticky top-4 h-[640px] max-h-[calc(100vh-2rem)] overflow-hidden rounded-xl border border-mod-border bg-mod-surface transition-[width] duration-300 ease-out max-xl:absolute max-xl:right-0 max-xl:top-0 max-xl:z-20",
              dock === "closed" && "hidden",
              dockWide ? "max-xl:w-[620px]" : "max-xl:w-[340px]",
              "xl:w-full",
            )}
          >
            <AiDock
              dock={dock}
              onDockChange={setDock}
              tab={aiTab}
              onTabChange={setAiTab}
              rewriteRange={rewriteRange}
              onRewriteClose={() => setRewriteRange(null)}
              editorRef={editorRef}
              episodeId={wizard.state.episodeId ?? null}
              ensureEpisode={wizard.ensureDraft}
              sources={sources}
              hasScript={characterCount > 0}
              scriptChars={characterCount}
              wordsPerMinute={wordsPerMinute}
              clickedBlock={clickedBlock}
              onOpenSource={() => setSourcesOpen(true)}
              onOpenCountChange={setOpenCount}
            />
          </aside>
        </div>
      </div>
    </section>
  );
}
