import type { RefObject } from "react";
import { Copy } from "@phosphor-icons/react/dist/icons/Copy";
import { Lock } from "@phosphor-icons/react/dist/icons/Lock";
import { Trash } from "@phosphor-icons/react/dist/icons/Trash";
import { WarningCircle } from "@phosphor-icons/react/dist/icons/WarningCircle";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { ANGLE_DESCRIPTION_MAX, ANGLE_GUIDE_MAX, ANGLE_NAME_MAX, type AngleForm } from "./angleState";

export type AngleFormMode = "create" | "edit" | "readonly";

interface Props {
  mode: AngleFormMode;
  title: string;
  form: AngleForm;
  error: string | null;
  confirmingDelete: boolean;
  busy: boolean;
  nameRef: RefObject<HTMLInputElement | null>;
  onChange: (patch: Partial<AngleForm>) => void;
  onSave: () => void;
  onCancel: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const hint = "text-xs font-normal text-mod-text-secondary";

export function AngleFormCard({ mode, title, form, error, confirmingDelete, busy, nameRef, onChange, onSave, onCancel, onDuplicate, onDelete }: Props) {
  const readOnly = mode === "readonly";
  return (
    <section aria-live="polite" className="flex flex-col gap-4 rounded-lg border border-mod-border bg-mod-surface p-5">
      <div className="flex items-center justify-between gap-3">
        <h2 className="min-w-0 truncate text-lg font-bold text-mod-text">{title}</h2>
        {readOnly ? <span className="rounded-full bg-mod-canvas-accent px-2 py-0.5 text-xs font-semibold text-mod-primary">Có sẵn · chỉ đọc</span> : null}
      </div>
      {readOnly ? (
        <p className="flex items-start gap-2 rounded-md bg-mod-canvas-accent p-3 text-sm text-mod-text-secondary">
          <Lock className="mt-0.5 size-4 shrink-0" aria-hidden />
          Góc kể có sẵn không sửa được. Nhân bản để tạo bản của bạn rồi chỉnh tùy ý.
        </p>
      ) : null}
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="angle-name">Tên</Label>
        <span className={hint}>Hiện trong danh sách chọn khi soạn bản nháp.</span>
        <Input id="angle-name" ref={nameRef} value={form.name} maxLength={ANGLE_NAME_MAX} readOnly={readOnly} placeholder="Ví dụ: Một ngày ở kinh đô" aria-invalid={error ? true : undefined} onChange={(e) => onChange({ name: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="angle-desc">Mô tả ngắn</Label>
        <span className={hint}>Không bắt buộc. Một dòng nhắc bạn góc này dùng khi nào.</span>
        <Input id="angle-desc" value={form.description} maxLength={ANGLE_DESCRIPTION_MAX} readOnly={readOnly} placeholder="Ví dụ: Kể sự kiện lớn qua một ngày sinh hoạt" onChange={(e) => onChange({ description: e.target.value })} />
      </div>
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="angle-guide">Chỉ dẫn cho AI</Label>
        <span className={hint}>Không bắt buộc. Mô tả cách kể bằng lời của bạn; AI coi đây là gợi ý về cách kể, không phải sự kiện.</span>
        <Textarea id="angle-guide" rows={5} value={form.guide} maxLength={ANGLE_GUIDE_MAX} readOnly={readOnly} placeholder="Ví dụ: Mở bằng cảnh một người dân thường, rồi mới nói tới triều đình. Câu ngắn, ít số liệu." onChange={(e) => onChange({ guide: e.target.value })} />
        <span className="self-end text-xs text-mod-text-secondary">{form.guide.length}/{ANGLE_GUIDE_MAX}</span>
      </div>
      <p role="alert" className="min-h-5 text-sm text-mod-danger">{error}</p>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          {readOnly ? <Button type="button" onClick={onDuplicate}><Copy aria-hidden />Nhân bản để chỉnh</Button> : <Button type="button" disabled={busy} onClick={onSave}>Lưu góc kể</Button>}
          <Button type="button" variant="outline" disabled={busy} onClick={onCancel}>{readOnly ? "Đóng" : "Hủy"}</Button>
        </div>
        {mode === "edit" ? (
          <Button type="button" variant="outline" disabled={busy} onClick={onDelete} className={confirmingDelete ? "border-mod-danger text-mod-danger" : undefined}>
            {confirmingDelete ? <WarningCircle aria-hidden /> : <Trash aria-hidden />}
            {confirmingDelete ? "Bấm lần nữa để xóa" : "Xóa"}
          </Button>
        ) : null}
      </div>
    </section>
  );
}
