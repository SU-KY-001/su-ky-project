import { useEffect, useRef, useState, type KeyboardEvent, type ReactElement } from "react";
import { ChevronRight, LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { OUTLINE_POINTS_MAX, OUTLINE_TITLE_MAX, type OutlineSection } from "@repo/shared";
import { cn } from "@/lib/utils";
import { addPoint, addSection, canAddSection, patchSection, removePoint, removeSection, setPoint } from "../../compose/outlineState";

interface Props {
  sections: OutlineSection[] | null;
  loading: boolean;
  error: string;
  totalWords: number;
  onChange: (sections: OutlineSection[]) => void;
}

/** Borderless inputs: the only chrome is a white wash on hover and a soft ring on focus, so the three levels read by weight, not by boxes. */
const FIELD = "w-full rounded-md border-0 bg-transparent px-1.5 py-1 outline-none hover:bg-mod-surface focus:bg-mod-surface focus:ring-2 focus:ring-mod-primary/25";

export function DraftOutlineStep({ sections, loading, error, totalWords, onChange }: Props): ReactElement {
  const [openId, setOpenId] = useState<string | null>(null);
  const pendingFocus = useRef<string | null>(null);

  useEffect(() => {
    if (!pendingFocus.current) return;
    document.querySelector<HTMLElement>(`[data-focus="${pendingFocus.current}"]`)?.focus();
    pendingFocus.current = null;
  });

  if (loading || !sections) {
    return (
      <div className="space-y-3 px-5 py-8 text-center" role="status" aria-busy="true">
        {error ? <p role="alert" className="text-sm text-mod-danger">{error}</p> : (
          <p className="flex items-center justify-center gap-2 text-sm text-mod-text-secondary"><LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> AI đang tạo dàn ý…</p>
        )}
      </div>
    );
  }

  const currentId = openId === "" ? null : sections.some((section) => section.id === openId) ? openId : sections[0]?.id;
  const pointCount = sections.reduce((sum, section) => sum + section.points.filter((point) => point.trim()).length, 0);

  const insertPointAfter = (id: string, at: number): void => {
    onChange(sections.map((section) => (section.id === id && section.points.length < OUTLINE_POINTS_MAX
      ? { ...section, points: [...section.points.slice(0, at + 1), "", ...section.points.slice(at + 1)] }
      : section)));
    pendingFocus.current = `${id}:${at + 1}`;
  };

  const onPointKey = (event: KeyboardEvent<HTMLTextAreaElement>, section: OutlineSection, at: number): void => {
    if (event.key === "Enter") {
      event.preventDefault();
      if (section.points.length < OUTLINE_POINTS_MAX) insertPointAfter(section.id, at);
    } else if (event.key === "Backspace" && section.points[at] === "" && section.points.length > 1) {
      event.preventDefault();
      onChange(removePoint(sections, section.id, at));
      pendingFocus.current = `${section.id}:${Math.max(0, at - 1)}`;
    }
  };

  return (
    <div className="px-5 py-4">
      <div className="flex items-baseline justify-between text-sm">
        <b className="text-mod-text">{sections.length} phần · {pointCount} ý chính</b>
        <span className="text-xs text-mod-text-secondary">Mục tiêu ≈ {totalWords.toLocaleString("vi-VN")} từ</span>
      </div>
      <p className="mt-1 text-xs text-mod-text-secondary">Bấm một phần để mở. Enter thêm ý mới, Backspace trên ý trống để xóa. Dàn ý chỉ lưu trong trình duyệt của bạn, theo từng tập.</p>
      {error ? <p role="alert" className="mt-2 text-sm text-mod-danger">{error}</p> : null}
      <div className="mt-3 max-h-[52vh] space-y-1 overflow-y-auto">
        {sections.map((section, index) => {
          const open = section.id === currentId;
          return (
            <div key={section.id} className={cn("group rounded-xl transition-colors", open && "bg-mod-canvas-accent")}>
              <div className="flex items-center gap-1 px-2 py-1.5">
                <button type="button" className="rounded-md p-1 text-mod-text-secondary hover:text-mod-text" aria-expanded={open} aria-label={`${open ? "Thu gọn" : "Mở"} phần ${index + 1}`} onClick={() => setOpenId(open ? "" : section.id)}>
                  <ChevronRight size={15} className={cn("transition-transform", open && "rotate-90")} aria-hidden="true" />
                </button>
                <input
                  aria-label={`Tiêu đề phần ${index + 1}`}
                  data-focus={`${section.id}:title`}
                  className={cn(FIELD, "flex-1 font-bold! text-mod-text")}
                  maxLength={OUTLINE_TITLE_MAX}
                  placeholder="Tiêu đề phần mới"
                  value={section.title}
                  onFocus={() => setOpenId(section.id)}
                  onChange={(event) => onChange(patchSection(sections, section.id, { title: event.target.value }))}
                />
                <span className="shrink-0 text-xs text-mod-text-secondary">{section.points.length} ý</span>
                <button type="button" className={cn("rounded-md p-1 text-mod-text-secondary hover:text-mod-danger disabled:invisible", !open && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100")} aria-label={`Xóa phần ${index + 1}`} disabled={sections.length <= 1} onClick={() => onChange(removeSection(sections, section.id, totalWords))}>
                  <Trash2 size={15} aria-hidden="true" />
                </button>
              </div>
              {open ? (
                <div className="space-y-2 px-3 pb-3 pl-9">
                  <label className="block text-xs font-semibold text-mod-text-secondary">
                    Mục tiêu
                    <textarea
                      rows={1}
                      className={cn(FIELD, "mt-0.5 resize-none text-sm! font-normal! text-mod-text [field-sizing:content]")}
                      placeholder="Phần này cần đạt được gì?"
                      value={section.goal}
                      onChange={(event) => onChange(patchSection(sections, section.id, { goal: event.target.value }))}
                    />
                  </label>
                  <ul className="space-y-0.5">
                    {section.points.map((point, at) => (
                      <li key={at} className="group/point flex items-start gap-1">
                        <span className="ml-2 mt-3 size-1.5 shrink-0 rounded-full bg-mod-text-secondary/60" aria-hidden="true" />
                        <textarea
                          rows={1}
                          aria-label={`Ý chính ${at + 1} của phần ${index + 1}`}
                          data-focus={`${section.id}:${at}`}
                          className={cn(FIELD, "resize-none text-sm! leading-snug text-mod-text [field-sizing:content]")}
                          placeholder="Ý chính mới"
                          value={point}
                          onKeyDown={(event) => onPointKey(event, section, at)}
                          onChange={(event) => onChange(setPoint(sections, section.id, at, event.target.value))}
                        />
                        <button type="button" className="rounded-md p-1 text-mod-text-secondary opacity-0 hover:text-mod-danger focus-visible:opacity-100 group-hover/point:opacity-100" aria-label={`Xóa ý chính ${at + 1}`} onClick={() => onChange(removePoint(sections, section.id, at))}>
                          <X size={14} aria-hidden="true" />
                        </button>
                      </li>
                    ))}
                  </ul>
                  <button type="button" className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-mod-text-secondary hover:bg-mod-surface hover:text-mod-text disabled:opacity-50" disabled={section.points.length >= OUTLINE_POINTS_MAX} onClick={() => { onChange(addPoint(sections, section.id)); pendingFocus.current = `${section.id}:${section.points.length}`; }}>
                    <Plus size={13} aria-hidden="true" /> Thêm ý
                  </button>
                </div>
              ) : section.goal ? (
                <p className="px-3 pb-2 pl-9 text-xs text-mod-text-secondary">{section.goal}</p>
              ) : null}
            </div>
          );
        })}
        <button
          type="button"
          className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-mod-border py-2.5 text-sm text-mod-text-secondary hover:bg-mod-canvas-accent hover:text-mod-text disabled:opacity-50"
          disabled={!canAddSection(sections)}
          title={canAddSection(sections) ? undefined : "Đã đủ số phần tối đa"}
          onClick={() => {
            const next = addSection(sections, totalWords);
            const created = next[next.length - 1];
            onChange(next);
            if (created) { setOpenId(created.id); pendingFocus.current = `${created.id}:title`; }
          }}
        >
          <Plus size={14} aria-hidden="true" /> Thêm phần
        </button>
      </div>
    </div>
  );
}
