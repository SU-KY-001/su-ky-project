import { useState } from "react";
import { SOURCE_TIERS, SOURCE_TIER_LABELS, type SourceItem } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { Callout, EmptyNote } from "./stepUi";
import {
  SELECT_CLASS,
  SourcesTable,
  applyFilterAndSort,
  isSortOrder,
  isTierFilter,
  type SortOrder,
  type TierFilter,
} from "./ResearcherSources";

type Gate0SourcesListProps = {
  sources: readonly SourceItem[];
  confirmingDeleteId: string | null;
  onEdit: (source: SourceItem) => void;
  onRequestDelete: (sourceId: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (sourceId: string) => void;
};

/**
 * Editable Gate 0 source list with tier filter and score sort. Stays mounted while the catalogue is empty
 * so the chosen filter and sort survive deleting every source and undoing.
 */
export function Gate0SourcesList({
  sources,
  confirmingDeleteId,
  onEdit,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: Gate0SourcesListProps) {
  const [tier, setTier] = useState<TierFilter>("ALL");
  const [order, setOrder] = useState<SortOrder>("ORIGINAL");

  const visible = applyFilterAndSort(sources, tier, order);

  if (sources.length === 0) {
    return (
      <Callout tone="attention" title="AI không tìm được đủ dữ liệu" role="status">
        Danh mục nguồn đang trống. Bạn có thể bấm Làm lại để AI tìm lại hoặc bấm Thêm nguồn để nhập thủ công.
      </Callout>
    );
  }

  return (
    <>
      <div className="flex flex-wrap gap-3">
        <label className="flex flex-col gap-1">
          <ModeratorText className="text-xs font-bold text-mod-text-muted">Lọc theo nhóm nguồn</ModeratorText>
          <select
            className={SELECT_CLASS}
            value={tier}
            onChange={(event) => {
              if (isTierFilter(event.target.value)) setTier(event.target.value);
            }}
          >
            <option value="ALL">Tất cả</option>
            {SOURCE_TIERS.map((value) => (
              <option key={value} value={value}>
                {SOURCE_TIER_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <ModeratorText className="text-xs font-bold text-mod-text-muted">Sắp xếp</ModeratorText>
          <select
            className={SELECT_CLASS}
            value={order}
            onChange={(event) => {
              if (isSortOrder(event.target.value)) setOrder(event.target.value);
            }}
          >
            <option value="ORIGINAL">Thứ tự AI đề xuất</option>
            <option value="SCORE_DESC">Điểm tin cậy cao trước</option>
            <option value="SCORE_ASC">Điểm tin cậy thấp trước</option>
          </select>
        </label>
      </div>
      {visible.length === 0 ? (
        <EmptyNote>Không có nguồn nào thuộc nhóm này.</EmptyNote>
      ) : (
        <SourcesTable
          sources={visible}
          interactive={true}
          confirmingDeleteId={confirmingDeleteId}
          onEdit={onEdit}
          onRequestDelete={onRequestDelete}
          onCancelDelete={onCancelDelete}
          onConfirmDelete={onConfirmDelete}
        />
      )}
    </>
  );
}
