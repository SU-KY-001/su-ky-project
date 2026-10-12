import type { KeyboardEvent } from "react";
import { ArrowUpRight, BookOpenText, CheckCircle, GitBranch } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import {
  GATE_LABELS,
  STEP_LABELS,
  STEP_STATUS,
  formatDateTime,
  formatDuration,
  formatWords,
} from "../../../labels";
import { StatusBadge } from "../StatusBadge";
import type { BuiltTreeItem, TreeNodeItem } from "./workflowHierarchy";

const ICON_SIZE_SM = 14;
const ICON_SIZE_MD = 16;

export function TreeBranchGroup({
  entries,
  level,
  activeId,
  itemRefs,
  onActivate,
  onKeyNavigate,
}: {
  entries: readonly BuiltTreeItem[];
  level: number;
  activeId: number;
  itemRefs: React.RefObject<Map<number, HTMLLIElement>>;
  onActivate: (item: TreeNodeItem) => void;
  onKeyNavigate: (event: KeyboardEvent<HTMLLIElement>, item: TreeNodeItem) => void;
}) {
  const isBranched = entries.length > 1;

  const listElement = (
    <ul
      role={level === 1 ? "tree" : "group"}
      aria-label={level === 1 ? "Cây lịch sử các phiên bản" : undefined}
      onClick={(event) => {
        if (level > 1) event.stopPropagation();
      }}
      className={cn(
        "flex flex-col gap-3",
        level > 1 && "mt-3 border-l-2 border-mod-border pl-4 sm:pl-6",
        isBranched && level > 1 && "border-mod-primary/50",
      )}
    >
      {entries.map((entry, index) => {
        const { item, children, publications } = entry;
        const stepTitle = STEP_LABELS[item.stepType];
        const gateLabel = GATE_LABELS[item.stepType];
        const statusDescriptor = STEP_STATUS[item.status];
        const isStale = item.status === "STALE";
        const isFocused = item.id === activeId;

        return (
          <li
            key={item.id}
            ref={(element) => {
              if (element) itemRefs.current.set(item.id, element);
              else itemRefs.current.delete(item.id);
            }}
            role="treeitem"
            tabIndex={isFocused ? 0 : -1}
            aria-level={level}
            aria-setsize={entries.length}
            aria-posinset={index + 1}
            aria-selected={isFocused}
            aria-expanded={children.length > 0 ? true : undefined}
            aria-label={`${stepTitle} v${item.version}, ${item.approved ? "Đã duyệt, " : ""}${statusDescriptor.label}, ${formatDateTime(item.createdAt)}`}
            onClick={(event) => {
              event.stopPropagation();
              onActivate(item);
            }}
            onKeyDown={(event) => {
              event.stopPropagation();
              onKeyNavigate(event, item);
            }}
            className="list-none rounded-[12px] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary"
          >
            {isBranched ? (
              <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-mod-primary/10 px-2.5 py-0.5 text-xs font-bold text-mod-primary-hover">
                <GitBranch size={ICON_SIZE_SM} weight="bold" aria-hidden={true} />
                <ModeratorText>
                  Nhánh {index + 1}/{entries.length}
                </ModeratorText>
              </div>
            ) : null}

            <div
              className={cn(
                "flex min-h-11 cursor-pointer flex-col gap-2 rounded-[12px] border bg-mod-canvas px-3.5 py-3 transition-colors hover:bg-mod-canvas-accent",
                item.approved ? "border-2 border-mod-success" : "border-mod-border",
                isStale && "opacity-60",
              )}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  {gateLabel ? (
                    <ModeratorText className="rounded-md bg-mod-canvas-accent px-2 py-0.5 text-xs font-bold text-mod-text-muted">
                      {gateLabel}
                    </ModeratorText>
                  ) : null}
                  <ModeratorText className="text-sm font-extrabold text-mod-text">
                    {stepTitle}
                  </ModeratorText>
                  <ModeratorText className="rounded-md bg-mod-surface px-2 py-0.5 font-mono text-xs font-bold text-mod-primary-hover">
                    v{item.version}
                  </ModeratorText>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                  {item.approved ? (
                    <ModeratorText className="inline-flex min-h-7 items-center gap-1 rounded-full bg-mod-success/10 px-2.5 text-xs font-bold text-mod-success">
                      <CheckCircle size={ICON_SIZE_SM} weight="fill" aria-hidden={true} />
                      Đã duyệt
                    </ModeratorText>
                  ) : null}

                  <StatusBadge
                    status={item.status}
                    label={statusDescriptor.label}
                    tone={statusDescriptor.tone}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <ModeratorText as="time" dateTime={item.createdAt} className="font-mono text-xs text-mod-text-secondary">
                  {formatDateTime(item.createdAt)}
                </ModeratorText>

                <span className="inline-flex items-center gap-1 text-xs font-bold text-mod-primary-hover">
                  <ModeratorText>Xem phiên bản này</ModeratorText>
                  <ArrowUpRight size={ICON_SIZE_SM} aria-hidden={true} />
                </span>
              </div>

              {publications.length > 0 ? (
                <div className="flex flex-wrap items-center gap-2 border-t border-mod-border pt-2">
                  {publications.map((pub) => (
                    <ModeratorText
                      key={pub.id}
                      className="inline-flex min-h-7 items-center gap-1.5 rounded-full bg-mod-success/10 px-2.5 text-xs font-bold text-mod-success"
                    >
                      <BookOpenText size={ICON_SIZE_SM} weight="fill" aria-hidden={true} />
                      Đã xuất bản · {formatWords(pub.totalWords)} · {formatDuration(pub.estimatedDurationSeconds)}
                    </ModeratorText>
                  ))}
                </div>
              ) : null}
            </div>

            {children.length > 0 ? (
              <TreeBranchGroup
                entries={children}
                level={level + 1}
                activeId={activeId}
                itemRefs={itemRefs}
                onActivate={onActivate}
                onKeyNavigate={onKeyNavigate}
              />
            ) : null}
          </li>
        );
      })}
    </ul>
  );

  if (!isBranched) {
    return listElement;
  }

  return (
    <div
      role="group"
      aria-label={`Nhánh rẽ gồm ${entries.length} phiên bản`}
      onClick={(event) => {
        if (level > 1) event.stopPropagation();
      }}
      className={cn(
        "rounded-[12px] border border-dashed border-mod-primary/40 bg-mod-primary/5 p-3",
        level > 1 && "mt-3",
      )}
    >
      <div className="mb-2 flex items-center gap-1.5 text-xs font-extrabold text-mod-primary-hover">
        <GitBranch size={ICON_SIZE_MD} weight="bold" aria-hidden={true} />
        <ModeratorText>
          Nhánh rẽ ({entries.length} phiên bản từ cùng bước trước)
        </ModeratorText>
      </div>
      {listElement}
    </div>
  );
}
