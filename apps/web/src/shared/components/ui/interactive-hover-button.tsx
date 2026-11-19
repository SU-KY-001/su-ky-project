import type { ComponentProps, ReactElement } from "react";
import { ArrowRight } from "@phosphor-icons/react/dist/icons/ArrowRight";
import { cn } from "@/lib/utils";

// Adapted from Magic UI's Interactive Hover Button with a borderless text treatment.
export function InteractiveHoverButton({
  children,
  className,
  type = "button",
  ...props
}: ComponentProps<"button">): ReactElement {
  return (
    <button
      type={type}
      className={cn(
        "group/interactive relative inline-flex min-h-11 cursor-pointer items-center justify-center overflow-hidden rounded-full border-0 bg-transparent px-4 py-2 text-sm font-semibold text-primary outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
        className,
      )}
      {...props}
    >
      <span className="relative flex items-center justify-center gap-2">
        <span aria-hidden="true" className="size-1.5 shrink-0 rounded-full bg-current transition-transform duration-300 group-hover/interactive:scale-[100] group-focus-visible/interactive:scale-[100] motion-reduce:transition-none" />
        <span className="relative inline-block transition-all duration-300 group-hover/interactive:translate-x-8 group-hover/interactive:opacity-0 group-focus-visible/interactive:translate-x-8 group-focus-visible/interactive:opacity-0 motion-reduce:transition-none">{children}</span>
      </span>
      <span aria-hidden="true" className="absolute inset-0 flex translate-x-8 items-center justify-center gap-2 text-primary-foreground opacity-0 transition-all duration-300 group-hover/interactive:translate-x-0 group-hover/interactive:opacity-100 group-focus-visible/interactive:translate-x-0 group-focus-visible/interactive:opacity-100 motion-reduce:transition-none">
        <span>{children}</span><ArrowRight size={16} />
      </span>
    </button>
  );
}
