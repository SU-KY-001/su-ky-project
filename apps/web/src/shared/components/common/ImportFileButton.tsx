import type { ComponentProps } from "react";
import { FileUp } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";

type ImportFileButtonProps = Omit<ComponentProps<"button">, "children">;

export function ImportFileButton({ className, type = "button", ...props }: ImportFileButtonProps) {
  return <Button
    {...props}
    type={type}
    variant="ghost"
    className={cn("import-file-button h-10 gap-2 rounded-lg border-0 px-4 font-semibold text-mod-text shadow-[0_2px_4px_rgb(0_0_0/6%)] hover:text-mod-text hover:shadow-[0_3px_6px_rgb(0_0_0/8%)] active:shadow-none focus-visible:ring-mod-primary/20", className)}
  ><FileUp className="size-4 text-mod-text-secondary" aria-hidden="true" />Import file</Button>;
}
