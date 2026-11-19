import type { ReactElement } from "react";
import { Info } from "lucide-react";
import { TONE_CUSTOM_MAX } from "@repo/shared";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/lib/utils";
import { CUSTOM_TONE, CUSTOM_TONE_PLACEHOLDER, TONE_PRESET_OPTIONS, type TonePresetOption } from "../../compose/toneOptions";

export type ToneChoice = TonePresetOption["preset"] | typeof CUSTOM_TONE;

interface Props {
  narration: "THIRD_PERSON" | "FIRST_PERSON";
  /** First person needs a narrator character picked in the Thông tin step; none is available yet. */
  firstPersonAvailable: boolean;
  tone: ToneChoice;
  custom: string;
  onNarration: (narration: "THIRD_PERSON" | "FIRST_PERSON") => void;
  onTone: (tone: ToneChoice) => void;
  onCustom: (custom: string) => void;
}

const card = (active: boolean, disabled = false): string =>
  cn("flex-1 rounded-lg border p-3 text-left text-sm", active ? "border-mod-primary bg-mod-primary/5" : "border-mod-border", disabled && "cursor-not-allowed opacity-50");

export function DraftToneStep({ narration, firstPersonAvailable, tone, custom, onNarration, onTone, onCustom }: Props): ReactElement {
  return (
    <div className="space-y-5 px-5 py-4">
      <fieldset className="space-y-2">
        <legend className="text-sm font-bold text-mod-text">Ngôi kể</legend>
        <div className="flex gap-2">
          <button type="button" className={card(narration === "THIRD_PERSON")} aria-pressed={narration === "THIRD_PERSON"} onClick={() => onNarration("THIRD_PERSON")}>
            <b className="block text-mod-text">Ngôi thứ ba</b><span className="text-xs text-mod-text-secondary">Người kể đứng ngoài câu chuyện.</span>
          </button>
          <button type="button" className={card(narration === "FIRST_PERSON", !firstPersonAvailable)} aria-pressed={narration === "FIRST_PERSON"} disabled={!firstPersonAvailable} onClick={() => onNarration("FIRST_PERSON")}>
            <b className="block text-mod-text">Ngôi thứ nhất</b>
            <span className="text-xs text-mod-text-secondary">{firstPersonAvailable ? "Nhân vật tự kể." : "Chưa chọn nhân vật ở bước Thông tin. Chọn xong sẽ dùng được."}</span>
          </button>
        </div>
      </fieldset>

      <fieldset className="space-y-2">
        <legend className="text-sm font-bold text-mod-text">Giọng văn</legend>
        {TONE_PRESET_OPTIONS.map((option) => (
          <label key={option.preset} className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm", tone === option.preset ? "border-mod-primary bg-mod-primary/5" : "border-mod-border")}>
            <input type="radio" name="tone" className="mt-1 accent-mod-primary" checked={tone === option.preset} onChange={() => onTone(option.preset)} />
            <span><b className="block text-mod-text">{option.label}</b><span className="text-xs italic text-mod-text-secondary">“{option.sample}”</span></span>
          </label>
        ))}
        <label className={cn("flex cursor-pointer items-start gap-3 rounded-lg border p-3 text-sm", tone === CUSTOM_TONE ? "border-mod-primary bg-mod-primary/5" : "border-mod-border")}>
          <input type="radio" name="tone" className="mt-1 accent-mod-primary" checked={tone === CUSTOM_TONE} onChange={() => onTone(CUSTOM_TONE)} />
          <span className="min-w-0 flex-1"><b className="block text-mod-text">Tự mô tả…</b></span>
        </label>
        {tone === CUSTOM_TONE ? (
          <Textarea aria-label="Mô tả giọng văn" rows={3} maxLength={TONE_CUSTOM_MAX} placeholder={CUSTOM_TONE_PLACEHOLDER} value={custom} onChange={(event) => onCustom(event.target.value)} />
        ) : null}
      </fieldset>

      <div className="flex gap-2 rounded-lg border border-mod-border bg-mod-canvas-accent p-3 text-xs text-mod-text-secondary">
        <Info size={15} className="mt-0.5 shrink-0" aria-hidden="true" />
        <p><b className="text-mod-text">Luôn bật:</b> câu ngắn để đọc thành tiếng, tránh ngoặc đơn và ký hiệu khó đọc; khi không chắc số liệu, năm, tên thì AI đánh dấu để mod kiểm tra, không tự bịa.</p>
      </div>
    </div>
  );
}
