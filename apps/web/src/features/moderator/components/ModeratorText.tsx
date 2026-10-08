import type { ComponentPropsWithoutRef, ElementType } from "react";
import { cn } from "@/lib/utils";

type ModeratorTextProps<T extends ElementType = "span"> = {
  as?: T;
} & Omit<ComponentPropsWithoutRef<T>, "as">;

export function ModeratorText<T extends ElementType = "span">({ as, className, ...props }: ModeratorTextProps<T>) {
  const Component = as ?? "span";
  return <Component className={cn("font-moderator", className)} {...props} />;
}
