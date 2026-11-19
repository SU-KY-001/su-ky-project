import type { ComponentProps } from "react";
import { RadioGroup as RadioGroupPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export function RadioGroup({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive.Root>) {
  return <RadioGroupPrimitive.Root data-slot="radio-group" className={cn("grid gap-3", className)} {...props} />;
}

export function RadioGroupItem({ className, ...props }: ComponentProps<typeof RadioGroupPrimitive.Item>) {
  return <RadioGroupPrimitive.Item data-slot="radio-group-item" className={cn("aspect-square size-4 shrink-0 rounded-full border border-input bg-transparent text-primary outline-none focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:border-primary", className)} {...props}>
    <RadioGroupPrimitive.Indicator className="flex items-center justify-center"><span className="size-2 rounded-full bg-current" /></RadioGroupPrimitive.Indicator>
  </RadioGroupPrimitive.Item>;
}
