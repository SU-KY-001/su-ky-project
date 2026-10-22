import { useEffect, useRef, useState, type ReactElement, type RefObject } from "react";
import { Search } from "lucide-react";
import type { StudioSeriesDetailDto } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
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

interface Props {
  editorRef: RefObject<RichScriptEditorHandle | null>;
  /** Null until the draft exists; `ensureEpisode` creates it. */
  episodeId: string | null;
  ensureEpisode: () => Promise<string>;
  sources: StudioSeriesDetailDto["sources"];
  hasScript: boolean;
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

export function AiAssistantPanel({ editorRef, episodeId, ensureEpisode, sources, hasScript }: Props): ReactElement {
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

  const run = async (scope: ReviewScope, note: string): Promise<void> => {
    const editor = editorRef.current;
    const picked = scope === "SELECTION" ? editor?.getSelectionBlocks() : editor?.getBlocks();
    setDialog(null);
    setOpenId(null);
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
      setOpenId(null);
    });

  const discard = async (): Promise<void> => {
    setOpenId(null);
    try {
      await cancel();
    } catch (caught) {
      setError(errorMessage(caught));
    }
  };

  const sourceTitle = (sourceId: string): string => sources.find((entry) => entry.source.id === sourceId)?.source.title ?? "Nguồn của series";

  return (
    <section className="space-y-4" aria-label="AI rà kịch bản" aria-busy={running}>
      {item && check ? (
        <AiIssueDetail
          item={item}
          currentText={currentText}
          awaitingRecord={unrecorded.current.has(item.id)}
          sourceTitle={sourceTitle}
          notice={visibleNotice}
          busy={busy}
          onApply={() => void apply()}
          onRerunSelection={() => openDialog("SELECTION")}
          onBack={() => setOpenId(null)}
          onFinish={() => void finish()}
        />
      ) : running ? (
        <div className="space-y-4">
          <AiCheckProgress check={check ?? NO_PROGRESS} found={items.length} onCancel={check ? () => void discard() : undefined} />
          <IssueRows items={items} onOpen={openItem} />
        </div>
      ) : check && !failedEmpty ? (
        <AiIssueList check={check} items={items} onOpen={openItem} onRerun={() => openDialog()} />
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
      <ScriptReviewConfigDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        blockCount={dialog?.blockCount ?? 0}
        selectionLabel={dialog?.selectionLabel ?? null}
        initialScope={dialog?.scope}
        onRun={(scope, note) => void run(scope, note)}
      />
    </section>
  );
}
