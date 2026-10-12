import type { ComponentProps } from "react";
import { Toast as ToastPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const ToastProvider = ToastPrimitive.Provider;
export const ToastTitle = ToastPrimitive.Title;
export const ToastDescription = ToastPrimitive.Description;
export const ToastClose = ToastPrimitive.Close;

export function Toast({ className, ...props }: ComponentProps<typeof ToastPrimitive.Root>) {
  return <ToastPrimitive.Root data-slot="toast" className={cn("group pointer-events-auto relative flex w-full items-start gap-3 rounded-xl border border-l-4 bg-background p-4 text-foreground shadow-lg outline-none data-[state=open]:animate-in data-[state=open]:slide-in-from-top-2 data-[swipe=move]:translate-x-[var(--radix-toast-swipe-move-x)] data-[swipe=end]:translate-x-[var(--radix-toast-swipe-end-x)]", className)} {...props} />;
}

export function ToastViewport({ className, ...props }: ComponentProps<typeof ToastPrimitive.Viewport>) {
  return <ToastPrimitive.Viewport className={cn("fixed right-4 top-4 z-[200] m-0 flex w-[calc(100%-2rem)] max-w-[420px] list-none flex-col gap-3 outline-none sm:right-6 sm:top-6", className)} {...props} />;
}
