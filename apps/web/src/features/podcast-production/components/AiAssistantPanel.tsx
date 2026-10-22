import { useRef, useState, type ReactElement, type RefObject } from "react";
import { Sparkles } from "lucide-react";
import type { StudioSeriesDetailDto } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { errorMessage } from "@/lib/apiError";
import { locateBlock } from "../aiCheck/blockRefs";
import { AI_DOUBT_LABEL, describeStartError } from "../aiCheck/messages";
import { useAiCheck } from "../aiCheck/useAiCheck";
import { AiCheckProgress } from "./AiCheckProgress";
import { AiIssueDetail, type ApplyNotice } from "./AiIssueDetail";
import { AiIssueList } from "./AiIssueList";
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

export function AiAssistantPanel({ editorRef, episodeId, ensureEpisode, sources, hasScript }: Props): ReactElement {
  const { check, items, starting, start, cancel, patchItem } = useAiCheck(episodeId);
  const [dialog, setDialog] = useState<{ hasSelection: boolean; scope: ReviewScope } | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState<ApplyNotice>(null);
  const [busy, setBusy] = useState(false);
  /** Items whose text is already replaced but whose PATCH failed: retry the PATCH only, never replace twice. */
  const unrecorded = useRef(new Set<string>());

  const item = items.find((entry) => entry.id === openId) ?? null;
  const running = starting || check?.status === "RUNNING";
  const blocks = item ? (editorRef.current?.getBlocks() ?? []) : [];
  const located = item ? locateBlock(blocks, item) : "conflict";
  const currentText =
    located === "conflict"
      ? null
      : (blocks.find((block) => block.ref === located)?.text ?? null);
  const conflictNotice: ApplyNotice =
    item?.suggestion && located === "conflict"
      ? { kind: "conflict", text: "Đoạn đã đổi, chạy lại. Chữ của bạn không bị ghi đè." }
      : null;
  const visibleNotice = notice ?? conflictNotice;

  const openDialog = (scope: ReviewScope = "ALL"): void => {
    setError("");
    setDialog({ hasSelection: (editorRef.current?.getSelectionBlocks().length ?? 0) > 0, scope });
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
        if (result !== "ok") return setNotice({ kind: "conflict", text: "Đoạn đã đổi, chạy lại. Chữ của bạn không bị ghi đè." });
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

  const sourceTitle = (sourceId: string): string => sources.find((entry) => entry.source.id === sourceId)?.source.title ?? "Nguồn của series";

  return (
    <section className="space-y-4" aria-labelledby="ai-review-title" aria-busy={running}>
      <div>
        <h3 id="ai-review-title" className="font-bold text-mod-text">AI rà kịch bản</h3>
        <p className="text-xs text-mod-text-secondary">{AI_DOUBT_LABEL}. AI chỉ gợi ý, bạn quyết định.</p>
      </div>
      {item && check ? (
        <AiIssueDetail
          item={item}
          currentText={currentText}
          sourceTitle={sourceTitle}
          notice={visibleNotice}
          busy={busy}
          onApply={() => void apply()}
          onRerunSelection={() => openDialog("SELECTION")}
          onBack={() => setOpenId(null)}
          onFinish={() => void finish()}
        />
      ) : check?.status === "RUNNING" ? (
        <AiCheckProgress check={check} found={items.length} onCancel={() => void cancel()} />
      ) : check ? (
        <AiIssueList check={check} items={items} onOpen={openItem} />
      ) : starting ? (
        <p role="status" className="text-sm font-semibold text-mod-text">AI đang chạy…</p>
      ) : (
        <p className="rounded-lg border border-dashed border-mod-border p-4 text-sm text-mod-text-secondary">
          AI đọc kịch bản, đối chiếu với nguồn của series và nêu chỗ đáng ngờ.
        </p>
      )}
      {error ? <p role="alert" className="text-sm text-mod-danger">{error}</p> : null}
      {!item ? (
        <Button type="button" variant="outline" className="w-full" disabled={running || !hasScript} onClick={() => openDialog()}>
          <Sparkles size={16} aria-hidden="true" /> {check ? "Rà lại kịch bản" : "Chạy AI rà kịch bản"}
        </Button>
      ) : null}
      <ScriptReviewConfigDialog
        open={dialog !== null}
        onOpenChange={(open) => !open && setDialog(null)}
        hasSelection={dialog?.hasSelection ?? false}
        initialScope={dialog?.scope}
        onRun={(scope, note) => void run(scope, note)}
      />
    </section>
  );
}
