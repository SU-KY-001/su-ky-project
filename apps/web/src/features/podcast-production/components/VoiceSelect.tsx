import type { AiVoice } from "@repo/shared";
import { Select as SelectPrimitive } from "radix-ui";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { formField } from "@/features/moderator/components/CreationPage";
import { VOICE_LABEL, voiceGender } from "../voice/voiceLabels";

interface Props<Voice extends AiVoice> {
  id: string;
  label: string;
  value: Voice;
  voices: readonly Voice[];
  disabled?: boolean;
  onChange: (voice: Voice) => void;
}

/** Group by gender first, then sort names consistently; voice ids remain unchanged. */
export function VoiceSelect<Voice extends AiVoice>({ id, label, value, voices, disabled, onChange }: Props<Voice>) {
  return <Select value={value} disabled={disabled} onValueChange={(next) => { const voice = voices.find((item) => item === next); if (voice) onChange(voice); }}>
    <SelectTrigger id={id} aria-label={label} className={formField}><SelectValue placeholder="Chọn giọng đọc" /></SelectTrigger>
    <SelectContent align="start" className="max-w-sm">
      {(["female", "male"] as const).map((gender) => {
        const items = voices.filter((voice) => voiceGender(voice) === gender).sort((a, b) => VOICE_LABEL[a].name.localeCompare(VOICE_LABEL[b].name, "vi"));
        return items.length ? <SelectPrimitive.Group key={gender}>
          <SelectPrimitive.Label className="sticky top-0 z-10 border-b border-mod-border bg-mod-surface px-3 py-2 text-xs font-semibold text-mod-text-secondary">{gender === "female" ? "Giọng nữ" : "Giọng nam"} · {items.length}</SelectPrimitive.Label>
          {items.map((voice) => <SelectItem key={voice} value={voice}>{VOICE_LABEL[voice].name} — {VOICE_LABEL[voice].detail}</SelectItem>)}
        </SelectPrimitive.Group> : null;
      })}
    </SelectContent>
  </Select>;
}
