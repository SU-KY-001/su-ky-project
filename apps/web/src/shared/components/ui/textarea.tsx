import { useCallback, useLayoutEffect, useRef, type ComponentProps } from "react";
import { cn } from "@/lib/utils";

type TextareaProps = ComponentProps<"textarea"> & {
  autoGrow?: boolean;
};

export function Textarea({ autoGrow = false, className, onInput, ref, rows, value, ...props }: TextareaProps) {
  const elementRef = useRef<HTMLTextAreaElement | null>(null);
  const resize = useCallback(() => {
    const element = elementRef.current;
    if (!autoGrow || !element) return;
    element.style.height = "auto";
    element.style.height = `${element.scrollHeight}px`;
  }, [autoGrow]);
  const setRef = useCallback((element: HTMLTextAreaElement | null) => {
    elementRef.current = element;
    if (typeof ref === "function") ref(element);
    else if (ref) ref.current = element;
  }, [ref]);

  useLayoutEffect(resize, [resize, value]);

  return <textarea
    ref={setRef}
    data-slot="textarea"
    data-auto-grow={autoGrow || undefined}
    rows={autoGrow ? 1 : rows}
    value={value}
    onInput={(event) => {
      resize();
      onInput?.(event);
    }}
    className={cn(
      "flex min-h-24 w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-base shadow-xs outline-none transition-[color,background-color,box-shadow,border-color] placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:border-border disabled:bg-muted disabled:text-muted-foreground disabled:opacity-100 read-only:cursor-not-allowed read-only:border-border read-only:bg-muted read-only:text-muted-foreground read-only:shadow-none aria-invalid:border-destructive md:text-sm",
      autoGrow && "resize-none overflow-hidden",
      className,
    )}
    {...props}
  />;
}
