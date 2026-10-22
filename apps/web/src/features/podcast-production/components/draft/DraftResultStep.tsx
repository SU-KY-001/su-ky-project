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
  const [active, setActive] = useState(0);
  const [editing, setEditing] = useState(false);
  const [at, setAt] = useState<InsertAt>("end");
  const [insertError, setInsertError] = useState("");
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void run(0);
  }, [run]);

  const doneCount = drafts.filter((draft) => draft.status === "done").length;
  const allDone = doneCount === sections.length;
  const kept = drafts.map((draft, index) => ({ draft, index })).filter(({ draft }) => draft.status === "done" && !draft.dropped);
  const blocked = kept.some(({ draft }) => draft.exceedsLimit);
  const current = drafts[active];
  const reviewable = doneCount > 0 && current?.status === "done";

  const insert = (): void => {
    const result = onInsert(kept.map(({ draft, index }) => ({ heading: sections[index]!.title, paragraphs: draftParagraphs(draft) })), at);
    if (result.ok) return onInserted();
    setInsertError(result.reason === "TOO_LONG" ? `Không đủ chỗ: kịch bản tối đa ${SCRIPT_MAX_CHARACTERS.toLocaleString("vi-VN")} ký tự. Chưa chèn gì vào kịch bản.` : "Không chèn được vào kịch bản. Thử lại.");
  };

  return (
    <>
      <div className="space-y-4 px-5 py-4" aria-busy={running}>
        {!allDone ? (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <p className="text-sm font-bold text-mod-text">{running ? "AI đang viết từng phần" : "Chưa viết xong"}</p>
              {running ? <span className="rounded-full bg-mod-primary/10 px-2 py-0.5 text-xs font-bold text-mod-primary">Đang chạy</span> : null}
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-mod-canvas-accent" role="progressbar" aria-valuemin={0} aria-valuemax={sections.length} aria-valuenow={doneCount}>
              <div className="h-full bg-mod-primary transition-[width]" style={{ width: `${(doneCount / sections.length) * 100}%` }} />
            </div>
            <ul className="divide-y divide-mod-border rounded-lg border border-mod-border text-sm">
              {sections.map((section, index) => (
                <li key={section.id} className="flex items-center gap-3 px-3 py-2">
                  <StatusIcon status={drafts[index]!.status} />
                  <span className="min-w-0 flex-1 truncate text-mod-text">{section.title}</span>
                  <span className="text-xs text-mod-text-secondary">{STATUS_TEXT[drafts[index]!.status]}</span>
                  {drafts[index]!.status === "error" ? <Button type="button" variant="ghost" size="sm" disabled={running} onClick={() => void run(index)}><RotateCcw size={13} aria-hidden="true" /> Thử lại</Button> : null}
                </li>
              ))}
            </ul>
            {drafts.map((draft, index) => (draft.error ? <p key={index} role="alert" className="text-xs text-mod-danger">{sections[index]!.title}: {draft.error}</p> : null))}
            <p className="text-xs text-mod-text-secondary">Mỗi phần là một lần gọi riêng. Chưa có gì vào kịch bản cho tới khi bạn bấm Chèn.</p>
          </div>
        ) : null}

        {doneCount > 0 ? (
          <div className="space-y-3">
            <div role="tablist" aria-label="Các phần đã viết" className="flex flex-wrap gap-1">
              {sections.map((section, index) => (
                <button key={section.id} type="button" role="tab" aria-selected={active === index} disabled={drafts[index]!.status !== "done"} className={cn("rounded-md px-3 py-1.5 text-xs font-bold disabled:opacity-40", active === index ? "bg-mod-primary text-white" : "bg-mod-canvas-accent text-mod-text-secondary", drafts[index]!.dropped && "line-through")} onClick={() => { setActive(index); setEditing(false); }}>{section.title}</button>
              ))}
            </div>
            {reviewable && current ? (
              <div role="tabpanel" className={cn("space-y-2", current.dropped && "opacity-40")}>
                <p className="text-xs font-semibold text-mod-text-secondary">AI soạn · {current.wordCount.toLocaleString("vi-VN")} từ (mục tiêu ≈ {sections[active]!.targetWords.toLocaleString("vi-VN")})</p>
                {editing ? (
                  <Textarea aria-label="Nội dung phần" autoFocus rows={10} value={current.text} onChange={(event) => patch(active, { text: event.target.value })} />
                ) : (
                  <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-mod-border bg-mod-canvas-accent p-3 text-sm leading-6 text-mod-text">
                    {draftParagraphs(current).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
                  </div>
                )}
                {current.novelNumbers.length ? <p role="note" className="text-xs text-mod-attention">Có số mới: {current.novelNumbers.join(", ")} — hãy kiểm tra. Đây là gợi ý tự động, không phải xác minh.</p> : null}
                {current.lengthStatus && current.lengthStatus !== "OK" ? <p role="note" className="text-xs text-mod-text-secondary">{LENGTH_HINT[current.lengthStatus]}</p> : null}
                {current.exceedsLimit ? <p role="alert" className="text-xs text-mod-danger">Phần này vượt chỗ còn lại của kịch bản. Sửa bớt hoặc bỏ phần để chèn.</p> : null}
                <div className="flex flex-wrap gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setEditing((value) => !value)}><Pencil size={13} aria-hidden="true" /> {editing ? "Xong sửa" : "Sửa phần này"}</Button>
                  <Button type="button" variant="outline" size="sm" disabled={running} onClick={() => void regenerate(active)}><RotateCcw size={13} aria-hidden="true" /> Viết lại phần này</Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => patch(active, { dropped: !current.dropped })}><Undo2 size={13} aria-hidden="true" /> {current.dropped ? "Khôi phục phần này" : "Bỏ phần này"}</Button>
                </div>
              </div>
            ) : null}
            <label className="flex items-center gap-2 text-sm text-mod-text-secondary">
              Chèn vào
              <select className="h-9 rounded-md border border-input bg-transparent px-2 text-sm text-mod-text" value={at} onChange={(event) => setAt(event.target.value as InsertAt)}>
                <option value="end">Cuối kịch bản</option>
                <option value="cursor">Tại vị trí con trỏ</option>
              </select>
            </label>
          </div>
        ) : null}
        {insertError ? <p role="alert" className="text-sm text-mod-danger">{insertError}</p> : null}
      </div>
      <div className="flex justify-end gap-2 border-t border-mod-border px-5 py-3">
        {running ? <Button type="button" variant="outline" onClick={abort}>Dừng</Button> : <Button type="button" variant="outline" onClick={onBack}>Quay lại</Button>}
        <Button type="button" disabled={running || !allDone || !kept.length || blocked} onClick={insert}>
          <ArrowDown size={16} aria-hidden="true" /> {kept.length ? `Chèn ${kept.length} phần vào kịch bản` : "Chèn vào kịch bản"}
        </Button>
      </div>
    </>
  );
}
