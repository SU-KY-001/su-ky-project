import { useEffect, useRef, useState, type ReactElement, type RefObject } from "react";
import { LoaderCircle, Maximize2, Minimize2, PanelRightClose, Search, Sparkles } from "lucide-react";
import type { StudioSeriesDetailDto } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { errorMessage } from "@/lib/apiError";
import { locateBlock } from "../aiCheck/blockRefs";
import { describeCheckProblem, describeStartError } from "../aiCheck/messages";
import { blockHighlights, blockNumber, CONFLICT_TEXT, conflictNoticeText, IDLE_DESCRIPTION } from "../aiCheck/presentation";
import { useAiCheck } from "../aiCheck/useAiCheck";
import { AiCheckProgress } from "./AiCheckProgress";
import { AiIssueDetail, type ApplyNotice } from "./AiIssueDetail";
import { AiIssueList, IssueRows } from "./AiIssueList";
import type { RichScriptEditorHandle } from "./RichScriptEditor";
import { ScriptReviewConfigDialog, type ReviewScope } from "./ScriptReviewConfigDialog";

export type DockState = "rail" | "panel" | "wide";

interface Props {
  editorRef: RefObject<RichScriptEditorHandle | null>;
  /** Null until the draft exists; `ensureEpisode` creates it. */
  episodeId: string | null;
  ensureEpisode: () => Promise<string>;
  sources: StudioSeriesDetailDto["sources"];
  hasScript: boolean;
  dock: DockState;
  onDockChange: (dock: DockState) => void;
  /** Bumped by the toolbar's "Rà kịch bản" button; each change opens the review dialog. */
  runRequest: number;
  /** Paragraph the moderator clicked in the editor; a new `seq` opens the matching warning. */
  clickedBlock?: { ref: string; seq: number } | null;
  onOpenSource?: () => void;
  /** Lets the toolbar show "Rà lại" once a check exists. */
  onHasCheckChange?: (hasCheck: boolean) => void;
}

interface DialogState {
  blockCount: number;
  selectionLabel: string | null;
  scope: ReviewScope;
}

const NO_PROGRESS = { processedBlocks: 0, totalBlocks: 0, failedBlocks: 0 } as const;

function lastRunLabel(at: Date | null): string {
  if (!at) return "Lần rà gần nhất: chưa có.";
  const time = at.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit", hour12: false });
  return `Lần rà gần nhất: ${time}, ${at.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit" })}.`;
}

export function AiAssistantPanel({ editorRef, episodeId, ensureEpisode, sources, hasScript, dock, onDockChange, runRequest, clickedBlock, onOpenSource, onHasCheckChange }: Props): ReactElement {
  const closeItem = (): void => {
    setOpenId(null);
    if (dock === "wide") onDockChange("panel");
  };
  const { check, items, starting, lastRunAt, start, cancel, patchItem } = useAiCheck(episodeId);
  const [dialog, setDialog] = useState<DialogState | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<ApplyNotice>(null);
  const [busy, setBusy] = useState(false);
  /** Items whose text is already replaced but whose PATCH failed: retry the PATCH only, never replace twice. */
  const unrecorded = useRef(new Set<string>());
  const appliedSignature = useRef("");

  const item = items.find((entry) => entry.id === openId) ?? null;
  const running = starting || check?.status === "RUNNING";
  const blocks = editorRef.current?.getBlocks() ?? [];
  const located = item ? locateBlock(blocks, item) : "conflict";
  const currentText = located === "conflict" ? null : (blocks.find((block) => block.ref === located)?.text ?? null);
  const conflictText = item ? conflictNoticeText(item, located) : null;
  const visibleNotice: ApplyNotice = notice ?? (conflictText ? { kind: "conflict", text: conflictText } : null);
  // A failed check with nothing to show is an error on the idle screen, as in the mock.
  const failedEmpty = check?.status === "FAILED" && items.length === 0;
  const idleError = error || (failedEmpty ? (describeCheckProblem(check) ?? "") : "");

  const highlights = check ? blockHighlights(items, blocks, item?.id ?? null) : [];
  const signature = JSON.stringify(highlights);
  // Runs after every render: the editor changes under us while the moderator types.
  useEffect(() => {
    const editor = editorRef.current;
    if (!editor || appliedSignature.current === signature) return;
    if (highlights.length > 0 && editor.getBlocks().length === 0) return;
    appliedSignature.current = signature;
    editor.setBlockHighlights(highlights);
  });
  useEffect(() => () => editorRef.current?.setBlockHighlights([]), [editorRef]);

  const openDialog = (scope: ReviewScope = "ALL"): void => {
    setError("");
    const editor = editorRef.current;
    const selected = editor?.getSelectionBlocks() ?? [];
    const first = selected[0];
    const last = selected[selected.length - 1];
    const selectionLabel = !first || !last ? null : first.ref === last.ref ? `${blockNumber(first.ref)}` : `${blockNumber(first.ref)}-${blockNumber(last.ref)}`;
    setDialog({ blockCount: blocks.length, selectionLabel, scope });
  };

  const seenRunRequest = useRef(runRequest);
  useEffect(() => {
    if (runRequest === seenRunRequest.current) return;
    seenRunRequest.current = runRequest;
    openDialog();
  });

  const hasCheck = check !== null && check !== undefined;
  useEffect(() => {
    onHasCheckChange?.(hasCheck);
  }, [hasCheck, onHasCheckChange]);

  const seenClick = useRef(clickedBlock?.seq ?? 0);
  useEffect(() => {
    if (!clickedBlock || clickedBlock.seq === seenClick.current) return;
    seenClick.current = clickedBlock.seq;
    const live = editorRef.current?.getBlocks() ?? [];
    const hit = items.find((entry) => !entry.appliedAt && locateBlock(live, entry) === clickedBlock.ref);
    if (hit) openItem(hit.id);
  });

  // Esc closes wide to list; Radix layers (dialog, popover) call preventDefault first, so they win.
  useEffect(() => {
    if (dock !== "wide") return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === "Escape" && !event.defaultPrevented) closeItem();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  });

  const run = async (scope: ReviewScope, note: string): Promise<void> => {
    const editor = editorRef.current;
    const picked = scope === "SELECTION" ? editor?.getSelectionBlocks() : editor?.getBlocks();
    setDialog(null);
    closeItem();
    if (!picked?.length) return setError("Không có đoạn nào để rà.");
    try {
      await start(episodeId ?? (await ensureEpisode()), { kind: "SCRIPT_REVIEW", scope, blocks: picked, ...(note ? { note } : {}) });
    } catch (caught) {
      setError(describeStartError(caught));
    }
  };

  const openItem = (id: string): void => {
    const target = items.find((entry) => entry.id === id);
    setNotice(null);
    setOpenId(id);
    onDockChange("wide");
    if (target) {
      const at = locateBlock(editorRef.current?.getBlocks() ?? [], target);
      editorRef.current?.focusBlock(at === "conflict" ? null : at);
    }
  };

  const guarded = async (work: () => Promise<void>): Promise<void> => {
    setBusy(true);
    setNotice(null);
    try {
      await work();
    } catch (caught) {
      setNotice({ kind: "error", text: errorMessage(caught) });
    } finally {
      setBusy(false);
    }
  };

  const apply = (): Promise<void> =>
    guarded(async () => {
      if (!item?.suggestion) return;
      if (!unrecorded.current.has(item.id)) {
        const live = editorRef.current?.getBlocks() ?? [];
        const target = locateBlock(live, item);
        const result = target === "conflict" ? "conflict" : editorRef.current?.replaceBlockText(target, item.blockHash, item.suggestion);
        if (result !== "ok") return setNotice({ kind: "conflict", text: CONFLICT_TEXT });
        unrecorded.current.add(item.id);
      }
      try {
        await patchItem(item.id, { applied: true });
        unrecorded.current.delete(item.id);
      } catch {
        setNotice({ kind: "error", text: "Đã thay đoạn nhưng chưa ghi nhận được. Bấm Áp dụng đề xuất để ghi nhận lại (không thay đoạn lần nữa)." });
      }
    });

  const finish = (): Promise<void> =>
    guarded(async () => {
      if (!item) return;
      await patchItem(item.id, { status: "REVIEWED" });
      closeItem();
    });

  const discard = async (): Promise<void> => {
    closeItem();
    try {
      await cancel();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const sourceTitle = (sourceId: string): string => sources.find((entry) => entry.source.id === sourceId)?.source.title ?? "Nguồn của series";

  const dialogEl = (
    <ScriptReviewConfigDialog
      open={dialog !== null}
      onOpenChange={(open) => !open && setDialog(null)}
      blockCount={dialog?.blockCount ?? 0}
      selectionLabel={dialog?.selectionLabel ?? null}
      initialScope={dialog?.scope}
      onRun={(scope, note) => void run(scope, note)}
    />
  );

  if (dock === "rail") {
    const openCount = check && !running ? items.filter((entry) => entry.status !== "REVIEWED" && !entry.appliedAt).length : null;
    return (
      <div className="flex h-full w-12 flex-col items-center gap-2 py-3">
        <button type="button" className="relative grid size-9 place-items-center rounded-lg text-mod-text-secondary hover:bg-mod-canvas-accent hover:text-mod-text" aria-label="Mở trợ lý AI" title="Mở trợ lý AI" onClick={() => onDockChange("panel")}>
          {running ? <LoaderCircle size={18} className="animate-spin" aria-hidden="true" /> : <Sparkles size={18} aria-hidden="true" />}
          {openCount !== null ? (
            <span className={cn("absolute -right-1 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full px-1 text-[10px] font-bold text-white", openCount ? "bg-mod-attention" : "bg-mod-success")}>{openCount || "✓"}</span>
          ) : null}
        </button>
        <span className="text-xs text-mod-text-secondary [writing-mode:vertical-rl]">{running ? "Đang rà…" : check ? "AI rà kịch bản" : "Trợ lý AI"}</span>
        {dialogEl}
      </div>
    );
  }

  const wideDetail = dock === "wide" && item && check;
  return (
    <section className="flex h-full min-w-[340px] flex-col" aria-label="AI rà kịch bản" aria-busy={running}>
      <header className="flex items-center justify-between border-b border-mod-border px-3.5 py-3">
        <h3 className="flex items-center gap-2 text-sm font-bold text-mod-text"><Sparkles size={16} className="text-mod-primary" aria-hidden="true" /> AI rà kịch bản</h3>
        <div className="flex gap-1">
          {wideDetail ? (
            <Button type="button" variant="ghost" size="icon-sm" title="Thu về dạng danh sách (Esc)" aria-label="Thu về dạng danh sách" onClick={closeItem}><Minimize2 size={15} aria-hidden="true" /></Button>
          ) : item ? (
            <Button type="button" variant="ghost" size="icon-sm" title="Mở rộng" aria-label="Mở rộng" onClick={() => onDockChange("wide")}><Maximize2 size={15} aria-hidden="true" /></Button>
          ) : null}
          <Button type="button" variant="ghost" size="icon-sm" title="Thu gọn" aria-label="Thu gọn trợ lý AI" onClick={() => { setOpenId(null); onDockChange("rail"); }}><PanelRightClose size={15} aria-hidden="true" /></Button>
        </div>
      </header>
      <div className="flex min-h-0 flex-1">
        <div className={cn("min-w-0 overflow-y-auto p-4", wideDetail ? "w-[270px] shrink-0 border-r border-mod-border" : "flex-1")}>
          {running ? (
            <div className="space-y-4">
              <AiCheckProgress check={check ?? NO_PROGRESS} found={items.length} onCancel={check ? () => void discard() : undefined} />
              <IssueRows items={items} activeId={openId} onOpen={openItem} />
            </div>
          ) : check && !failedEmpty ? (
            <AiIssueList check={check} items={items} activeId={openId} onOpen={openItem} onRerun={() => openDialog()} />
          ) : (
            <div className="space-y-3">
              <h4 id="ai-review-title" className="text-lg font-bold text-mod-text">AI rà kịch bản</h4>
              <p className="text-sm text-mod-text-secondary">{IDLE_DESCRIPTION}</p>
              <Button type="button" disabled={!hasScript} onClick={() => openDialog()}>
                <Search size={16} aria-hidden="true" /> Bắt đầu rà
              </Button>
              <p className="text-xs text-mod-text-secondary">{lastRunLabel(lastRunAt)}</p>
              {idleError ? <p role="alert" className="rounded-lg border border-mod-attention/25 bg-mod-attention/5 p-3 text-sm text-mod-attention">Không chạy được: {idleError}</p> : null}
            </div>
          )}
        </div>
        {wideDetail ? (
          <div className="min-w-0 flex-1 overflow-y-auto p-4">
            <AiIssueDetail
              item={item}
              currentText={currentText}
              awaitingRecord={unrecorded.current.has(item.id)}
              sourceTitle={sourceTitle}
              onOpenSource={onOpenSource}
              notice={visibleNotice}
              busy={busy}
              onApply={() => void apply()}
              onRerunSelection={() => openDialog("SELECTION")}
              onBack={closeItem}
              onFinish={() => void finish()}
            />
          </div>
        ) : null}
      </div>
      {dialogEl}
    </section>
  );
}
