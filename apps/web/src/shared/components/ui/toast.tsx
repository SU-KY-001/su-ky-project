import type { ComponentProps } from "react";
import { Toast as ToastPrimitive } from "radix-ui";
import { cn } from "@/lib/utils";

export const ToastProvider = ToastPrimitive.Provider;
export const ToastTitle = ToastPrimitive.Title;
export const ToastDescription = ToastPrimitive.Description;
export const ToastClose = ToastPrimitive.Close;

export function Toast({ className, ...props }: ComponentProps<typeof ToastPrimitive.Root>) {
  return <ToastPrimitive.Root data-slot="toast" className={cn("app-toast group pointer-events-auto relative flex w-full items-start gap-2.5 overflow-hidden rounded-lg bg-card px-3 py-3 text-foreground shadow-lg outline-none", className)} {...props} />;
}

export function ToastViewport({ className, ...props }: ComponentProps<typeof ToastPrimitive.Viewport>) {
  return <ToastPrimitive.Viewport className={cn("fixed right-4 top-4 z-[200] m-0 flex w-[calc(100%-2rem)] max-w-[340px] list-none flex-col gap-2 outline-none sm:right-6 sm:top-6", className)} {...props} />;
}
