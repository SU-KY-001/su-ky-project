import { useEffect, useRef, useState, type ReactElement } from "react";
import { ArrowDown, Check, Circle, LoaderCircle, Pencil, RotateCcw, Undo2 } from "lucide-react";
import { SCRIPT_MAX_CHARACTERS, type OutlineSection } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/lib/utils";
import type { DraftInsertItem, EditResult } from "../../aiCheck/editorBlocks";
import { draftParagraphs, useDraftSections, type SectionDraft } from "../../compose/useDraftSections";

type Params = Parameters<typeof useDraftSections>[0];
type InsertAt = "end" | "cursor";

const LENGTH_HINT: Record<"SHORT" | "LONG", string> = { SHORT: "Phần này ngắn hơn mục tiêu. Có thể viết lại.", LONG: "Phần này dài hơn mục tiêu. Có thể sửa bớt hoặc viết lại." };
const STATUS_TEXT: Record<SectionDraft["status"], string> = { waiting: "đang chờ", writing: "đang viết", done: "đã viết", error: "lỗi" };

function StatusIcon({ status }: { status: SectionDraft["status"] }): ReactElement {
  if (status === "done") return <Check size={15} className="text-mod-success" aria-hidden="true" />;
  if (status === "writing") return <LoaderCircle size={15} className="animate-spin text-mod-primary" aria-hidden="true" />;
  return <Circle size={15} className={status === "error" ? "text-mod-danger" : "text-mod-border"} aria-hidden="true" />;
}

interface Props {
  params: Params;
  sections: OutlineSection[];
  onBack: () => void;
  onInsert: (items: DraftInsertItem[], at: InsertAt) => EditResult;
  onInserted: () => void;
}

export function DraftResultStep({ params, sections, onBack, onInsert, onInserted }: Props): ReactElement {
  const { drafts, running, run, regenerate, abort, patch } = useDraftSections(params);
  const [editingAt, setEditingAt] = useState<number | null>(null);
  const [at, setAt] = useState<InsertAt>("end");
  const [insertError, setInsertError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run(0);
  }, [run]);

  // Unmount (and StrictMode's simulated unmount) aborts the run in useDraftSections; allow the next mount to start again.
  useEffect(() => () => { started.current = false; }, []);

  const doneCount = drafts.filter((draft) => draft.status === "done").length;
  const allDone = doneCount === sections.length;
  const kept = drafts.map((draft, index) => ({ draft, index })).filter(({ draft }) => draft.status === "done" && !draft.dropped);
  const blocked = kept.some(({ draft }) => draft.exceedsLimit);


  const insert = (): void => {
    const result = onInsert(kept.map(({ draft, index }) => ({ heading: sections[index]!.title, paragraphs: draftParagraphs(draft) })), at);
    if (result.ok) return onInserted();
    setInsertError(result.reason === "TOO_LONG" ? `Không đủ chỗ: kịch bản tối đa ${SCRIPT_MAX_CHARACTERS.toLocaleString("vi-VN")} ký tự. Chưa chèn gì vào kịch bản.` : "Không chèn được vào kịch bản. Thử lại.");
  };

  return (
    <>
      <div className="max-h-[62vh] space-y-4 overflow-y-auto px-5 py-4" aria-busy={running}>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-mod-text">
              {allDone ? `Đã viết xong ${sections.length} phần` : running ? `AI đang viết từng phần (${doneCount}/${sections.length})` : `Chưa viết xong (${doneCount}/${sections.length})`}
            </p>
            {running ? <span className="rounded-full bg-mod-primary/10 px-2 py-0.5 text-xs font-bold text-mod-primary">Đang chạy</span> : null}
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-mod-canvas-accent" role="progressbar" aria-valuemin={0} aria-valuemax={sections.length} aria-valuenow={doneCount}>
            <div className="h-full bg-mod-primary transition-[width]" style={{ width: `${(doneCount / sections.length) * 100}%` }} />
          </div>
          <p className="text-xs text-mod-text-secondary">Mỗi phần là một lần gọi riêng. Chưa có gì vào kịch bản cho tới khi bạn bấm Chèn.</p>
        </div>

        <ol className="space-y-3">
          {sections.map((section, index) => {
            const draft = drafts[index]!;
            const editing = editingAt === index;
            return (
              <li key={section.id} className={cn("rounded-xl bg-mod-canvas-accent/60 p-4", draft.dropped && "opacity-50")}>
                <div className="flex items-start gap-2.5">
                  <span className="mt-1 shrink-0"><StatusIcon status={draft.status} /></span>
                  <div className="min-w-0 flex-1">
                    <h4 className={cn("text-sm font-bold text-mod-text", draft.dropped && "line-through")}>{section.title}</h4>
                    <p className="text-xs text-mod-text-secondary">
                      {draft.status === "done"
                        ? `${draft.wordCount.toLocaleString("vi-VN")} từ · mục tiêu ≈ ${section.targetWords.toLocaleString("vi-VN")}${draft.dropped ? " · đã bỏ" : ""}`
                        : STATUS_TEXT[draft.status]}
                    </p>
                  </div>
                  {draft.status === "error" ? (
                    <Button type="button" variant="ghost" size="sm" disabled={running} onClick={() => void run(index)}><RotateCcw size={13} aria-hidden="true" /> Thử lại</Button>
                  ) : null}
                </div>

                {draft.status === "error" && draft.error ? <p role="alert" className="mt-2 text-xs text-mod-danger">{draft.error}</p> : null}
                {draft.status === "writing" ? <p className="mt-3 text-sm text-mod-text-secondary">AI đang viết phần này…</p> : null}

                {draft.status === "done" && !draft.dropped ? (
                  <div className="mt-3 space-y-3">
                    {editing ? (
                      <Textarea aria-label={`Nội dung phần ${section.title}`} autoFocus rows={10} value={draft.text} onChange={(event) => patch(index, { text: event.target.value })} />
                    ) : (
                      <div className="space-y-3 text-[15px] leading-7 text-mod-text">
                        {draftParagraphs(draft).map((paragraph, at) => <p key={at}>{paragraph}</p>)}
                      </div>
                    )}
                    {draft.novelNumbers.length ? <p role="note" className="text-xs text-mod-attention">Có số mới: {draft.novelNumbers.join(", ")}. Hãy kiểm tra. Đây là gợi ý tự động, không phải xác minh.</p> : null}
                    {draft.lengthStatus && draft.lengthStatus !== "OK" ? <p role="note" className="text-xs text-mod-text-secondary">{LENGTH_HINT[draft.lengthStatus]}</p> : null}
                    {draft.exceedsLimit ? <p role="alert" className="text-xs text-mod-danger">Phần này vượt chỗ còn lại của kịch bản. Sửa bớt hoặc bỏ phần để chèn.</p> : null}
                    <div className="flex flex-wrap gap-1.5">
                      <Button type="button" variant="ghost" size="sm" onClick={() => setEditingAt(editing ? null : index)}><Pencil size={13} aria-hidden="true" /> {editing ? "Xong sửa" : "Sửa"}</Button>
                      <Button type="button" variant="ghost" size="sm" disabled={running} onClick={() => { setEditingAt(null); void regenerate(index); }}><RotateCcw size={13} aria-hidden="true" /> Viết lại</Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => { setEditingAt(null); patch(index, { dropped: true }); }}><Undo2 size={13} aria-hidden="true" /> Bỏ phần này</Button>
                    </div>
                  </div>
                ) : null}

                {draft.status === "done" && draft.dropped ? (
                  <div className="mt-2"><Button type="button" variant="ghost" size="sm" onClick={() => patch(index, { dropped: false })}><Undo2 size={13} aria-hidden="true" /> Khôi phục phần này</Button></div>
                ) : null}
              </li>
            );
          })}
        </ol>
        {insertError ? <p role="alert" className="text-sm text-mod-danger">{insertError}</p> : null}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-mod-border px-5 py-3">
        <label className="flex items-center gap-2 text-sm text-mod-text-secondary">
          Chèn vào
          <select className="h-9 rounded-md border border-input bg-transparent px-2 text-sm text-mod-text" value={at} onChange={(event) => setAt(event.target.value as InsertAt)}>
            <option value="end">Cuối kịch bản</option>
            <option value="cursor">Tại vị trí con trỏ</option>
          </select>
        </label>
        <div className="flex gap-2">
          {running ? <Button type="button" variant="outline" onClick={abort}>Dừng</Button> : <Button type="button" variant="outline" onClick={onBack}>Quay lại</Button>}
          <Button type="button" disabled={running || !allDone || !kept.length || blocked} onClick={insert}>
            <ArrowDown size={16} aria-hidden="true" /> {kept.length ? `Chèn ${kept.length} phần vào kịch bản` : "Chèn vào kịch bản"}
          </Button>
        </div>
      </div>
    </>
  );
}
