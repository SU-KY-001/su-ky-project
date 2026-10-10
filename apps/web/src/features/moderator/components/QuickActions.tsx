import { ArrowUpRight, BookOpenText, Headphones, MapTrifold, SquaresFour } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import type { ModeratorQuickAction, ModeratorQuickActionIcon } from "../types";
import { ModeratorText } from "./ModeratorText";

const quickActionIcons: Record<ModeratorQuickActionIcon, React.ComponentType<{ size?: number; weight?: "regular" | "fill"; color?: string; "aria-hidden"?: boolean }>> = {
  series: SquaresFour,
  episode: Headphones,
  milestone: MapTrifold,
  reference: BookOpenText,
};

export function QuickActions({ items, onAction }: { items: ModeratorQuickAction[]; onAction: (id: ModeratorQuickAction["id"]) => void }) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {items.map((item) => {
        const Icon = quickActionIcons[item.icon];
        return (
          <Button key={item.id} variant="outline" className="group flex h-auto min-h-[86px] w-full items-center justify-between gap-3 rounded-[13px] border-mod-border bg-mod-surface px-4 py-[15px] text-left hover:border-mod-primary hover:bg-mod-surface-glass" onClick={() => onAction(item.id)} aria-label={`${item.title}. ${item.description}`}>
            <span className="flex min-w-0 flex-1 items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-[11px] border border-mod-border bg-mod-surface-glass"><Icon size={18} color="var(--modPrimary)" aria-hidden={true} /></span>
              <span className="flex min-w-0 flex-1 flex-col gap-1 text-left">
                <ModeratorText className="truncate text-sm font-bold text-mod-text">{item.title}</ModeratorText>
                <ModeratorText className="line-clamp-2 text-xs text-mod-text-secondary">{item.description}</ModeratorText>
              </span>
            </span>
            <ArrowUpRight size={16} className="shrink-0 text-mod-text-low" aria-hidden="true" />
          </Button>
        );
      })}
    </div>
  );
}
