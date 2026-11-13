import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  selectContentClass,
  selectItemClass,
} from "@/shared/components/ui/select";
import { formField } from "./CreationPage";

export interface ModeratorSelectOption { value: string; label: string }

export const moderatorSelectContentClass = selectContentClass;
export const moderatorSelectItemClass = selectItemClass;

export function ModeratorSelect({ id, label, value, onValueChange, options, placeholder, disabled, required }: { id?: string; label: string; value: string; onValueChange: (value: string) => void; options: ModeratorSelectOption[]; placeholder: string; disabled?: boolean; required?: boolean }) {
  return <Select value={value} onValueChange={onValueChange} disabled={disabled} required={required}>
    <SelectTrigger id={id} aria-label={label} className={formField}><SelectValue placeholder={placeholder} /></SelectTrigger>
    <SelectContent className={moderatorSelectContentClass}>
      {options.map((option) => <SelectItem key={option.value} value={option.value} className={moderatorSelectItemClass}>{option.label}</SelectItem>)}
    </SelectContent>
  </Select>;
}
