import { useState } from "react";
import { Star } from "@phosphor-icons/react";
import { SOURCE_TIERS, SOURCE_TIER_LABELS, type SourceItem, type SourceTier } from "@repo/shared";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { Callout, Chip, EmptyNote, ExternalLink, Section } from "./stepUi";
import { ReliabilityScore } from "./ReliabilityScore";
import { SourceActionsCell } from "./SourceActionsCell";

export type TierFilter = SourceTier | "ALL";
export type SortOrder = "ORIGINAL" | "SCORE_DESC" | "SCORE_ASC";

export const SELECT_CLASS =
  "min-h-11 rounded-[10px] border border-mod-border bg-mod-surface px-3 font-moderator text-sm font-semibold text-mod-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary";

export const ICON_SIZE_SM = 14;

export function isTierFilter(value: string): value is TierFilter {
  return value === "ALL" || SOURCE_TIERS.some((tier) => tier === value);
}

export function isSortOrder(value: string): value is SortOrder {
  return value === "ORIGINAL" || value === "SCORE_DESC" || value === "SCORE_ASC";
}

export function applyFilterAndSort(sources: readonly SourceItem[], tier: TierFilter, order: SortOrder): SourceItem[] {
  const filtered = tier === "ALL" ? [...sources] : sources.filter((source) => source.tier === tier);
  if (order === "SCORE_DESC") filtered.sort((a, b) => b.reliabilityScore - a.reliabilityScore);
  if (order === "SCORE_ASC") filtered.sort((a, b) => a.reliabilityScore - b.reliabilityScore);
  return filtered;
}

type SourcesTableProps = {
  sources: readonly SourceItem[];
  interactive: boolean;
  confirmingDeleteId: string | null;
  onEdit?: (source: SourceItem) => void;
  onRequestDelete?: (sourceId: string) => void;
  onConfirmDelete?: (sourceId: string) => void;
  onCancelDelete?: () => void;
};

export function SourcesTable({
  sources,
  interactive,
  confirmingDeleteId,
  onEdit,
  onRequestDelete,
  onConfirmDelete,
  onCancelDelete,
}: SourcesTableProps) {
  return (
    <div className="overflow-x-auto rounded-[12px] border border-slate-300 bg-mod-surface shadow-[0_4px_16px_rgba(15,23,42,.04)]">
      <table className="w-full border-collapse text-left font-moderator text-sm">
        <thead className="border-b border-slate-700 bg-slate-800 text-xs font-extrabold uppercase tracking-wider text-white">
          <tr>
            <th scope="col" className="px-4 py-3">Nguồn tư liệu</th>
            <th scope="col" className="px-4 py-3">Nhóm &amp; vai trò</th>
            <th scope="col" className="px-4 py-3">Độ tin cậy</th>
            <th scope="col" className="px-4 py-3">Ghi chú đối chiếu</th>
            {interactive ? <th scope="col" className="px-4 py-3 text-right">Thao tác</th> : null}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {sources.map((source) => {
            return (
              <tr key={source.id} className="align-top even:bg-slate-50/80 hover:bg-sky-50/60">
                <td className="px-4 py-3.5">
                  <div className="flex flex-col gap-0.5">
                    <ModeratorText className="text-sm font-extrabold text-mod-text">{source.name}</ModeratorText>
                    <ModeratorText className="text-xs text-mod-text-secondary">{source.authorOrOrigin}</ModeratorText>
                    {source.locationInSource ? (
                      <ModeratorText className="text-xs text-mod-text-secondary">
                        Vị trí: {source.locationInSource}
                      </ModeratorText>
                    ) : null}
                    {source.url ? (
                      <ModeratorText className="text-xs">
                        <ExternalLink url={source.url}>{source.url}</ExternalLink>
                      </ModeratorText>
                    ) : null}
                  </div>
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex flex-wrap gap-1.5">
                    <Chip tone="info">{SOURCE_TIER_LABELS[source.tier]}</Chip>
                    {source.isPrimaryAssertionSource ? (
                      <Chip tone="success" icon={<Star size={ICON_SIZE_SM} weight="fill" aria-hidden={true} />}>
                        Nguồn khẳng định chính
                      </Chip>
                    ) : null}
                  </div>
                </td>
                <td className="whitespace-nowrap px-4 py-3.5">
                  <ReliabilityScore score={source.reliabilityScore} />
                </td>
                <td className="px-4 py-3.5">
                  <ModeratorText as="p" className="text-sm text-mod-text-muted">
                    {source.crossVerificationNotes}
                  </ModeratorText>
                </td>
                {interactive ? (
                  <SourceActionsCell
                    source={source}
                    confirmingDelete={confirmingDeleteId === source.id}
                    onEdit={onEdit}
                    onRequestDelete={onRequestDelete}
                    onConfirmDelete={onConfirmDelete}
                    onCancelDelete={onCancelDelete}
                  />
                ) : null}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function ReadOnlySourcesCatalogue({ sources }: { sources: readonly SourceItem[] }) {
  const [tier, setTier] = useState<TierFilter>("ALL");
  const [order, setOrder] = useState<SortOrder>("ORIGINAL");
  const visible = applyFilterAndSort(sources, tier, order);

  return (
    <Section title={`Danh mục nguồn (${sources.length})`}>
      {sources.length === 0 ? (
        <Callout tone="attention" title="AI không tìm được đủ dữ liệu" role="status">
          Danh mục nguồn đang trống. Bạn có thể làm lại để AI tìm lại.
        </Callout>
      ) : (
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
            <SourcesTable sources={visible} interactive={false} confirmingDeleteId={null} />
          )}
        </>
      )}
    </Section>
  );
}
