import { useState, type ReactElement } from "react";
import { Plus, Settings2 } from "lucide-react";
import type { Angle } from "@repo/shared";
import { moderatorSectionPath } from "@/features/moderator/paths";
import { Input } from "@/shared/components/ui/input";
import { cn } from "@/lib/utils";

/** The search box only appears once the list is long enough to need it. */
export const ANGLE_SEARCH_MIN = 6;
const NEW_ANGLE_URL = `${moderatorSectionPath.angles}?new=1`;

interface Props {
  angles: Angle[];
  loading: boolean;
  error: string | null;
  value: string;
  onChange: (id: string) => void;
}

function matches(angle: Angle, query: string): boolean {
  const needle = query.trim().toLowerCase();
  return !needle || `${angle.name} ${angle.description}`.toLowerCase().includes(needle);
}

/** Pick exactly one angle. Creating or editing happens on the angles page (new tab); this list re-syncs on focus. */
export function AngleList({ angles, loading, error, value, onChange }: Props): ReactElement {
  const [query, setQuery] = useState("");
  const visible = angles.filter((angle) => matches(angle, query));
  return (
    <div className="space-y-2">
      {angles.length >= ANGLE_SEARCH_MIN ? (
        <Input aria-label="Tìm góc kể" placeholder="Tìm góc kể" value={query} onChange={(event) => setQuery(event.target.value)} />
      ) : null}
      <div role="radiogroup" aria-label="Góc kể" aria-busy={loading} className="max-h-[236px] space-y-1.5 overflow-y-auto rounded-lg border border-mod-border p-1.5">
        {loading && !angles.length ? <p className="p-3 text-sm text-mod-text-secondary">Đang tải góc kể…</p> : null}
        {visible.map((angle) => (
          <label key={angle.id} className={cn("flex cursor-pointer items-start gap-3 rounded-md border p-2.5 text-sm", value === angle.id ? "border-mod-primary bg-mod-primary/5" : "border-transparent hover:bg-mod-canvas-accent")}>
            <input type="radio" name="angle" className="mt-1 accent-mod-primary" checked={value === angle.id} onChange={() => onChange(angle.id)} />
            <span className="min-w-0 flex-1">
              <b className="block text-mod-text">{angle.name}{!angle.builtin ? <span className="ml-2 rounded-full bg-mod-primary/10 px-2 py-0.5 text-[11px] font-bold text-mod-primary">Của bạn</span> : null}</b>
              <span className="text-xs text-mod-text-secondary">{angle.description || "Không có mô tả"}</span>
            </span>
          </label>
        ))}
        {!loading && !visible.length ? <p className="p-3 text-sm text-mod-text-secondary">Không có góc kể khớp. Thử từ khóa khác hoặc tạo góc kể mới.</p> : null}
      </div>
      {error ? <p role="alert" className="text-xs text-mod-danger">{error}</p> : null}
      <div className="flex flex-wrap gap-3 text-xs">
        <a className="inline-flex items-center gap-1 font-semibold text-mod-primary hover:underline" href={NEW_ANGLE_URL} target="_blank" rel="noreferrer"><Plus size={13} aria-hidden="true" /> Tạo góc kể mới</a>
        <a className="inline-flex items-center gap-1 font-semibold text-mod-primary hover:underline" href={moderatorSectionPath.angles} target="_blank" rel="noreferrer"><Settings2 size={13} aria-hidden="true" /> Quản lý</a>
      </div>
      <p className="text-xs text-mod-text-secondary">Góc kể của bạn chỉ bạn thấy. Tạo hoặc sửa ở trang riêng, danh sách này tự cập nhật khi bạn quay lại.</p>
    </div>
  );
}
