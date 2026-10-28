import type { ReactNode } from "react";
import { Funnel } from "@phosphor-icons/react/dist/icons/Funnel";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/icons/MagnifyingGlass";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { moderatorSelectContentClass, moderatorSelectItemClass } from "./ModeratorSelect";

export interface ModeratorToolbarFilter {
  id: string;
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onValueChange: (value: string) => void;
}

export function ModeratorListToolbar({ searchLabel, searchValue, onSearchChange, filters, actions }: { searchLabel: string; searchValue: string; onSearchChange: (value: string) => void; filters: ModeratorToolbarFilter[]; actions?: ReactNode }) {
  return <div className="flex w-full flex-wrap items-center gap-3">
    <label className="relative min-w-[220px] flex-1 sm:max-w-sm">
      <MagnifyingGlass size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mod-text-secondary" aria-hidden="true" />
      <Input type="search" aria-label={searchLabel} value={searchValue} onChange={(event) => onSearchChange(event.target.value)} placeholder={searchLabel} className="h-10 border-mod-border bg-mod-surface pl-9" />
    </label>
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter, index) => <Select key={filter.id} value={filter.value} onValueChange={filter.onValueChange}>
        <SelectTrigger aria-label={filter.label} className="h-10 w-full min-w-36 border-mod-border bg-mod-surface sm:w-auto">
          {index === 0 ? <Funnel size={16} className="shrink-0 text-mod-text-secondary" aria-hidden="true" /> : null}
          <SelectValue placeholder={filter.label} />
        </SelectTrigger>
        <SelectContent className={moderatorSelectContentClass}>
          {filter.options.map((option) => <SelectItem key={option.value} value={option.value} className={moderatorSelectItemClass}>{option.label}</SelectItem>)}
        </SelectContent>
      </Select>)}
    </div>
    {actions ? <div className="ml-auto flex shrink-0 items-center gap-2">{actions}</div> : null}
  </div>;
}
