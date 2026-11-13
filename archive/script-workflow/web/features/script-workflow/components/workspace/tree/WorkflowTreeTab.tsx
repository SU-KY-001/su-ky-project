import { useRef, useState, type KeyboardEvent } from "react";
import { ArrowClockwise, WarningCircle } from "@phosphor-icons/react";
import type { StepType } from "@repo/shared";
import { errorMessage, errorRequestId } from "@/lib/apiError";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { useWorkflowTree } from "../../../hooks/useWorkflowReads";
import { TreeBranchGroup } from "./TreeBranchGroup";
import { buildWorkflowHierarchy, type TreeNodeItem } from "./workflowHierarchy";

const SKELETON_CARD_COUNT = 4;
const ICON_SIZE_MD = 16;
const ICON_SIZE_ALERT = 28;
const SKELETON_BLOCK_CLASS = "animate-pulse rounded-md bg-mod-canvas-accent motion-reduce:animate-none";

export function WorkflowTreeTab({
  workflowId,
  onSelectNode,
}: {
  workflowId: number;
  onSelectNode: (stepType: StepType, version: number) => void;
}) {
  const query = useWorkflowTree(workflowId, true);
  const [focusedId, setFocusedId] = useState<number | null>(null);
  const itemRefs = useRef<Map<number, HTMLLIElement>>(new Map());

  if (query.isError && !query.data) {
    const requestId = errorRequestId(query.error);
    return (
      <div
        role="alert"
        className="flex flex-col items-center gap-3 rounded-[16px] border border-mod-border bg-mod-surface p-6 text-center"
      >
        <WarningCircle size={ICON_SIZE_ALERT} weight="fill" className="text-mod-danger" aria-hidden={true} />
        <ModeratorText as="h2" className="text-base font-extrabold text-mod-text">
          Không tải được cây lịch sử
        </ModeratorText>
        <ModeratorText as="p" className="text-sm text-mod-text-secondary">
          {errorMessage(query.error)}
        </ModeratorText>
        {requestId ? (
          <ModeratorText as="p" className="font-mono text-xs text-mod-text-secondary">
            Mã yêu cầu: {requestId}
          </ModeratorText>
        ) : null}
        <button
          type="button"
          disabled={query.isFetching}
          onClick={() => void query.refetch()}
          className="inline-flex min-h-11 items-center gap-2 rounded-[10px] bg-mod-primary px-4 text-sm font-bold text-white hover:bg-mod-primary-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary disabled:opacity-60"
        >
          <ArrowClockwise size={ICON_SIZE_MD} aria-hidden={true} />
          <ModeratorText>Thử lại</ModeratorText>
        </button>
      </div>
    );
  }

  if (!query.data) {
    return (
      <div
        role="status"
        aria-busy={true}
        className="flex flex-col gap-3 rounded-[16px] border border-mod-border bg-mod-surface p-4 sm:p-5"
      >
        <span className="sr-only">Đang tải cây lịch sử…</span>
        <div className={`${SKELETON_BLOCK_CLASS} h-6 w-48`} aria-hidden={true} />
        {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
          <div
            key={index}
            aria-hidden={true}
            className="flex flex-col gap-2 rounded-[12px] border border-mod-border bg-mod-canvas p-3.5"
          >
            <div className={`${SKELETON_BLOCK_CLASS} h-5 w-52`} />
            <div className={`${SKELETON_BLOCK_CLASS} h-4 w-36`} />
          </div>
        ))}
      </div>
    );
  }

  const { roots, orderedItems } = buildWorkflowHierarchy(query.data.nodes, query.data.publications);
  const firstId = orderedItems[0]?.id ?? -1;
  const activeId = focusedId !== null && orderedItems.some((entry) => entry.id === focusedId) ? focusedId : firstId;

  const activateItem = (item: TreeNodeItem) => {
    setFocusedId(item.id);
    onSelectNode(item.stepType, item.version);
  };

  const handleKeyNavigate = (event: KeyboardEvent<HTMLLIElement>, item: TreeNodeItem) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      activateItem(item);
      return;
    }

    const currentIndex = orderedItems.findIndex((entry) => entry.id === item.id);
    if (currentIndex === -1) return;

    const lastIndex = orderedItems.length - 1;
    const targetIndex =
      event.key === "ArrowDown" || event.key === "ArrowRight" ? Math.min(lastIndex, currentIndex + 1)
      : event.key === "ArrowUp" || event.key === "ArrowLeft" ? Math.max(0, currentIndex - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? lastIndex
      : null;

    if (targetIndex === null) return;
    event.preventDefault();
    const nextItem = orderedItems[targetIndex];
    if (!nextItem) return;
    setFocusedId(nextItem.id);
    itemRefs.current.get(nextItem.id)?.focus();
  };

  return (
    <section
      aria-label="Cây lịch sử"
      className="flex flex-col gap-4 rounded-[16px] border border-mod-border bg-mod-surface p-4 sm:p-5"
    >
      <header className="flex flex-wrap items-center justify-between gap-2 border-b border-mod-border pb-3">
        <div className="flex flex-wrap items-center gap-2">
          <ModeratorText as="h2" className="text-lg font-extrabold text-mod-text">
            Cây lịch sử phiên bản
          </ModeratorText>
          <ModeratorText className="rounded-full bg-mod-canvas-accent px-2.5 py-0.5 text-xs font-bold text-mod-text-muted">
            {orderedItems.length} phiên bản
          </ModeratorText>
        </div>

        <ModeratorText as="p" className="text-xs text-mod-text-secondary">
          Chọn một thẻ để mở bước và phiên bản tương ứng ở chế độ chỉ đọc.
        </ModeratorText>
      </header>

      {orderedItems.length === 0 ? (
        <div className="rounded-[12px] border border-mod-border bg-mod-canvas p-6 text-center">
          <ModeratorText as="p" className="text-sm text-mod-text-secondary">
            Chưa có phiên bản nào trong lịch sử kịch bản.
          </ModeratorText>
        </div>
      ) : (
        <TreeBranchGroup
          entries={roots}
          level={1}
          activeId={activeId}
          itemRefs={itemRefs}
          onActivate={activateItem}
          onKeyNavigate={handleKeyNavigate}
        />
      )}
    </section>
  );
}
