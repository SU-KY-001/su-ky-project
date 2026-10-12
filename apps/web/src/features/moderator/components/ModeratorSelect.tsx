import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { formField } from "./CreationPage";

export interface ModeratorSelectOption { value: string; label: string }

export const moderatorSelectContentClass = "mod-select-content border-mod-text-low/40 bg-mod-surface font-moderator text-mod-text";
export const moderatorSelectItemClass = "py-2.5 leading-5 focus:bg-mod-primary/10 focus:text-mod-text data-[state=checked]:bg-mod-primary/5 data-[state=checked]:font-semibold";

export function ModeratorSelect({ id, label, value, onValueChange, options, placeholder, disabled, required }: { id?: string; label: string; value: string; onValueChange: (value: string) => void; options: ModeratorSelectOption[]; placeholder: string; disabled?: boolean; required?: boolean }) {
  return <Select value={value} onValueChange={onValueChange} disabled={disabled} required={required}>
    <SelectTrigger id={id} aria-label={label} className={formField}><SelectValue placeholder={placeholder} /></SelectTrigger>
    <SelectContent className={moderatorSelectContentClass}>
      {options.map((option) => <SelectItem key={option.value} value={option.value} className={moderatorSelectItemClass}>{option.label}</SelectItem>)}
    </SelectContent>
  </Select>;
}
