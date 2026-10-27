import { CaretDown } from "@phosphor-icons/react/dist/icons/CaretDown";
import type { Icon } from "@phosphor-icons/react";
import { DropdownMenu } from "radix-ui";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";

export interface DashboardRowAction {
  id: string;
  label: string;
  icon?: Icon;
  onSelect: () => void;
  disabled?: boolean;
  destructive?: boolean;
}

export function DashboardRowActions({ label, actions, disabled = false }: {
  label: string;
  actions: DashboardRowAction[];
  disabled?: boolean;
}) {
  if (!actions.length) return null;

  const singleAction = actions.length === 1 ? actions[0] : null;
  if (singleAction) return <span data-slot="dashboard-row-actions" className="inline-flex align-middle" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
    <Button type="button" variant="outline" disabled={disabled || singleAction.disabled} aria-label={`${singleAction.label} ${label}`} className={cn("min-h-10 rounded-md border-mod-primary/30 bg-mod-primary/5 px-4 font-semibold text-mod-primary hover:bg-mod-primary/5 hover:text-mod-primary", singleAction.destructive && "border-mod-danger/30 bg-mod-danger/5 text-mod-danger hover:bg-mod-danger/5 hover:text-mod-danger")} onClick={singleAction.onSelect}>
      {singleAction.label}
    </Button>
  </span>;

  return <span data-slot="dashboard-row-actions" className="inline-flex align-middle" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button type="button" variant="outline" size="sm" disabled={disabled} aria-label={`Mở thao tác cho ${label}`} className="shrink-0 gap-2 rounded-lg border-mod-border bg-mod-surface px-3 font-semibold text-mod-text shadow-xs hover:bg-mod-canvas-accent hover:text-mod-text data-[state=open]:bg-mod-canvas-accent">
          Thao tác
          <CaretDown size={16} aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" sideOffset={6} collisionPadding={12} className="z-[70] min-w-48 max-w-[calc(100vw-1.5rem)] rounded-lg border border-mod-border bg-mod-surface p-1.5 font-moderator text-mod-text shadow-lg outline-none">
          {actions.map(({ id, label: actionLabel, icon: ActionIcon, onSelect, disabled: actionDisabled, destructive }, index) => <DropdownMenu.Group key={id}>
            {destructive && index > 0 && !actions[index - 1]?.destructive ? <DropdownMenu.Separator className="my-1 h-px bg-mod-border" /> : null}
            <DropdownMenu.Item disabled={actionDisabled} onSelect={onSelect} className={cn("flex min-h-9 cursor-pointer items-center gap-2 rounded-md px-3 py-2 text-sm font-medium outline-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50", destructive ? "text-mod-danger data-[highlighted]:bg-mod-danger/5" : "text-mod-text data-[highlighted]:bg-mod-canvas-accent")}>
              {ActionIcon ? <ActionIcon size={16} className="shrink-0" aria-hidden="true" /> : null}<span className="min-w-0 whitespace-normal break-words">{actionLabel}</span>
            </DropdownMenu.Item>
          </DropdownMenu.Group>)}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  </span>;
}
