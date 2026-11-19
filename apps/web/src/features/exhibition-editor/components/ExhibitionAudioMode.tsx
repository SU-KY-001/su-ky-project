import { useId } from "react";
import { Label } from "@/shared/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/shared/components/ui/radio-group";

export function ExhibitionAudioMode({ value, disabled, onChange }: { value: "room" | "artwork"; disabled?: boolean; onChange: (mode: "room" | "artwork") => void }) {
  const id = useId();
  return <fieldset className="space-y-3"><legend className="mb-3 text-sm font-semibold">Chế độ âm thanh</legend>
    <RadioGroup aria-label="Chế độ âm thanh" value={value} disabled={disabled} onValueChange={mode => { if (mode === "room" || mode === "artwork") onChange(mode); }}>
      {([{ value: "room", label: "Phát âm thanh cho cả phòng tranh" }, { value: "artwork", label: "Phát âm thanh theo từng ảnh" }] as const).map(option => <div key={option.value} className="flex items-center gap-2.5"><RadioGroupItem id={`${id}-${option.value}`} value={option.value} /><Label htmlFor={`${id}-${option.value}`} className="cursor-pointer text-sm font-normal leading-6">{option.label}</Label></div>)}
    </RadioGroup>
  </fieldset>;
}
