import { useRef, type KeyboardEvent, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";

export type TabDefinition<T extends string> = { id: T; label: string; count?: number };

type TabListProps<T extends string> = {
  label: string;
  idPrefix: string;
  tabs: readonly TabDefinition<T>[];
  value: T;
  onChange: (value: T) => void;
};

const tabId = (prefix: string, id: string) => `${prefix}-tab-${id}`;
const panelId = (prefix: string, id: string) => `${prefix}-panel-${id}`;

/** WAI-ARIA tabs with roving tabindex: arrows, Home and End move between tabs. */
export function TabList<T extends string>({ label, idPrefix, tabs, value, onChange }: TabListProps<T>) {
  const buttons = useRef<Map<T, HTMLButtonElement>>(new Map());

  const move = (event: KeyboardEvent, index: number) => {
    const last = tabs.length - 1;
    const target =
      event.key === "ArrowRight" ? (index + 1) % tabs.length
      : event.key === "ArrowLeft" ? (index - 1 + tabs.length) % tabs.length
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    const next = target === null ? undefined : tabs[target];
    if (!next) return;
    event.preventDefault();
    onChange(next.id);
    buttons.current.get(next.id)?.focus();
  };

  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex w-fit max-w-full gap-1.5 overflow-x-auto rounded-[12px] border border-mod-border bg-mod-canvas-accent p-1.5"
    >
      {tabs.map((tab, index) => {
        const selected = tab.id === value;
        return (
          <button
            key={tab.id}
            ref={(node) => {
              if (node) buttons.current.set(tab.id, node);
              else buttons.current.delete(tab.id);
            }}
            type="button"
            role="tab"
            id={tabId(idPrefix, tab.id)}
            aria-selected={selected}
            aria-controls={panelId(idPrefix, tab.id)}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(tab.id)}
            onKeyDown={(event) => move(event, index)}
            className={cn(
              "min-h-10 shrink-0 rounded-[9px] px-4 text-sm font-extrabold transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mod-primary",
              selected
                ? "bg-mod-primary text-white shadow-[0_4px_12px_rgba(2,132,199,.25)]"
                : "text-mod-text-muted hover:bg-mod-surface hover:text-mod-text",
            )}
          >
            <ModeratorText>{tab.label}</ModeratorText>
            {tab.count === undefined ? null : (
              <ModeratorText
                className={cn(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-xs font-extrabold",
                  selected ? "bg-white/20 text-white" : "bg-mod-surface text-mod-text-muted",
                )}
              >
                {tab.count}
              </ModeratorText>
            )}
          </button>
        );
      })}
    </div>
  );
}

type TabPanelProps = { idPrefix: string; id: string; value: string; children: ReactNode; className?: string };

export function TabPanel({ idPrefix, id, value, children, className }: TabPanelProps) {
  if (id !== value) return null;
  return (
    <div role="tabpanel" id={panelId(idPrefix, id)} aria-labelledby={tabId(idPrefix, id)} tabIndex={0} className={cn("pt-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary", className)}>
      {children}
    </div>
  );
}
