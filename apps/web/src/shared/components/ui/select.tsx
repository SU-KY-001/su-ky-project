import type { ComponentProps } from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { CaretDown, CaretUp, Check } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export const Select = SelectPrimitive.Root;
export const SelectValue = SelectPrimitive.Value;
export const selectContentClass = "mod-select-content border-mod-text-low/40 bg-mod-surface font-moderator text-mod-text";
export const selectItemClass = "py-2.5 leading-5 focus:bg-mod-primary/10 focus:text-mod-text data-[state=checked]:bg-mod-primary/5 data-[state=checked]:font-semibold";

export function SelectTrigger({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Trigger>) {
  return <SelectPrimitive.Trigger data-slot="select-trigger" className={cn("flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-input bg-transparent px-3 py-2 text-left text-sm shadow-xs outline-none transition-[color,background-color,box-shadow,border-color] focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 data-[placeholder]:text-muted-foreground [&>span]:min-w-0 [&>span]:truncate", className)} {...props}>{children}<SelectPrimitive.Icon asChild><CaretDown size={16} className="shrink-0 opacity-70" aria-hidden="true" /></SelectPrimitive.Icon></SelectPrimitive.Trigger>;
}

export function SelectContent({ className, children, position = "popper", ...props }: ComponentProps<typeof SelectPrimitive.Content>) {
  return <SelectPrimitive.Portal><SelectPrimitive.Content data-slot="select-content" position={position} sideOffset={6} className={cn("relative z-[80] max-h-[min(var(--radix-select-content-available-height),20rem)] w-[var(--radix-select-trigger-width)] min-w-32 overflow-hidden rounded-md border shadow-lg data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0", selectContentClass, className)} {...props}>
    <SelectPrimitive.ScrollUpButton className="flex items-center justify-center py-1"><CaretUp size={16} aria-hidden="true" /></SelectPrimitive.ScrollUpButton>
    <SelectPrimitive.Viewport className="p-1">{children}</SelectPrimitive.Viewport>
    <SelectPrimitive.ScrollDownButton className="flex items-center justify-center py-1"><CaretDown size={16} aria-hidden="true" /></SelectPrimitive.ScrollDownButton>
  </SelectPrimitive.Content></SelectPrimitive.Portal>;
}

export function SelectItem({ className, children, ...props }: ComponentProps<typeof SelectPrimitive.Item>) {
  return <SelectPrimitive.Item data-slot="select-item" data-value={props.value} className={cn("relative flex w-full cursor-default items-center rounded-sm pl-3 pr-8 text-sm outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50", selectItemClass, className)} {...props}><SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText><span className="absolute right-2 flex size-4 items-center justify-center"><SelectPrimitive.ItemIndicator><Check size={16} aria-hidden="true" /></SelectPrimitive.ItemIndicator></span></SelectPrimitive.Item>;
}
