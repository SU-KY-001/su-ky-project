import type { ReactElement } from "react";
import { LoaderCircle, Plus, Trash2, X } from "lucide-react";
import { OUTLINE_POINTS_MAX, OUTLINE_TITLE_MAX, type OutlineSection } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { addPoint, addSection, canAddSection, patchSection, removePoint, removeSection, setPoint } from "../../compose/outlineState";

interface Props {
  sections: OutlineSection[] | null;
  loading: boolean;
  error: string;
  totalWords: number;
  onChange: (sections: OutlineSection[]) => void;
}

export function DraftOutlineStep({ sections, loading, error, totalWords, onChange }: Props): ReactElement {
  if (loading || !sections) {
    return (
      <div className="space-y-3 px-5 py-8 text-center" role="status" aria-busy="true">
        {error ? <p role="alert" className="text-sm text-mod-danger">{error}</p> : (
          <p className="flex items-center justify-center gap-2 text-sm text-mod-text-secondary"><LoaderCircle className="animate-spin" size={16} aria-hidden="true" /> AI đang tạo dàn ý…</p>
        )}
      </div>
    );
  }
  return (
    <div className="space-y-3 px-5 py-4">
      <p className="text-xs text-mod-text-secondary">AI đề xuất {sections.length} phần. Sửa tiêu đề, mục tiêu, ý chính tùy ý; thêm hoặc xóa phần và ý.</p>
      {error ? <p role="alert" className="text-sm text-mod-danger">{error}</p> : null}
      <div className="max-h-[52vh] space-y-3 overflow-y-auto pr-1">
        {sections.map((section, index) => (
          <fieldset key={section.id} className="space-y-2 rounded-lg border border-mod-border p-3">
            <legend className="sr-only">Phần {index + 1}</legend>
            <div className="flex items-center gap-2">
              <Input aria-label={`Tiêu đề phần ${index + 1}`} className="font-bold" maxLength={OUTLINE_TITLE_MAX} placeholder="Tiêu đề phần mới" value={section.title} onChange={(event) => onChange(patchSection(sections, section.id, { title: event.target.value }))} />
              <span className="shrink-0 text-xs text-mod-text-secondary">≈ {section.targetWords.toLocaleString("vi-VN")} từ</span>
              <Button type="button" variant="ghost" size="icon-sm" aria-label={`Xóa phần ${index + 1}`} disabled={sections.length <= 1} onClick={() => onChange(removeSection(sections, section.id, totalWords))}><Trash2 size={15} aria-hidden="true" /></Button>
            </div>
            <label className="block text-xs font-semibold text-mod-text-secondary">
              Mục tiêu của phần
              <Input className="mt-1 font-normal" value={section.goal} onChange={(event) => onChange(patchSection(sections, section.id, { goal: event.target.value }))} />
            </label>
            <ul className="space-y-1.5">
              {section.points.map((point, at) => (
                <li key={at} className="flex items-center gap-2">
                  <Input aria-label={`Ý chính ${at + 1} của phần ${index + 1}`} placeholder="Ý chính mới" value={point} onChange={(event) => onChange(setPoint(sections, section.id, at, event.target.value))} />
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={`Xóa ý chính ${at + 1}`} onClick={() => onChange(removePoint(sections, section.id, at))}><X size={14} aria-hidden="true" /></Button>
                </li>
              ))}
            </ul>
            <Button type="button" variant="ghost" size="sm" disabled={section.points.length >= OUTLINE_POINTS_MAX} onClick={() => onChange(addPoint(sections, section.id))}><Plus size={14} aria-hidden="true" /> Thêm ý</Button>
          </fieldset>
        ))}
      </div>
      <Button type="button" variant="outline" size="sm" disabled={!canAddSection(sections)} onClick={() => onChange(addSection(sections, totalWords))}><Plus size={14} aria-hidden="true" /> Thêm phần</Button>
    </div>
  );
}
