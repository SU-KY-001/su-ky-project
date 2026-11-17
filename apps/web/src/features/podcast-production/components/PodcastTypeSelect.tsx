import type { ReactElement } from "react";
import { Mic2, Users } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

export function PodcastTypeSelect({ value, canChange, onChange }: { value?: "monologue" | "dialogue"; canChange: boolean; onChange: (value: "monologue" | "dialogue") => void }): ReactElement {
  const Icon = value === "monologue" ? Mic2 : Users;
  return <div className="grid w-[200px] max-w-full grid-cols-1 gap-1.5">
    <span className="text-xs font-medium text-mod-text-secondary">Loại podcast</span>
    <Select value={value} onValueChange={(next) => { if (canChange && (next === "monologue" || next === "dialogue")) onChange(next); }}>
      <SelectTrigger aria-label="Loại podcast" className="h-10 w-full gap-3 rounded-lg border-mod-border bg-mod-surface text-sm font-semibold text-mod-text shadow-none"><SelectValue placeholder="Chọn loại podcast">{value ? <span className="flex items-center gap-2"><Icon size={16} className="text-mod-text-secondary" aria-hidden="true" />{value === "monologue" ? "Độc thoại" : "Hội thoại"}</span> : null}</SelectValue></SelectTrigger>
      <SelectContent className="min-w-[270px] border-mod-border bg-mod-surface text-mod-text">
        <SelectItem value="monologue" disabled={!canChange && value !== "monologue"}><span className="flex items-start gap-3 py-1"><Mic2 size={17} className="mt-0.5 shrink-0 text-mod-text-secondary" aria-hidden="true" /><span className="grid gap-1"><span className="font-semibold">Độc thoại</span><span className="text-xs text-mod-text-secondary">Một người kể xuyên suốt tập.</span></span></span></SelectItem>
        <SelectItem value="dialogue" disabled={!canChange && value !== "dialogue"}><span className="flex items-start gap-3 py-1"><Users size={17} className="mt-0.5 shrink-0 text-mod-text-secondary" aria-hidden="true" /><span className="grid gap-1"><span className="font-semibold">Hội thoại</span><span className="text-xs text-mod-text-secondary">Từ hai người nói cùng một chủ đề.</span></span></span></SelectItem>
      </SelectContent>
    </Select>
    {!canChange ? <span className="text-[11px] text-mod-text-secondary">Chỉ đổi loại khi kịch bản trống.</span> : null}
  </div>;
}
