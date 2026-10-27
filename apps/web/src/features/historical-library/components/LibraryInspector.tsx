import { ArrowRight } from "@phosphor-icons/react/dist/icons/ArrowRight";
import { BookOpenText } from "@phosphor-icons/react/dist/icons/BookOpenText";
import { CalendarBlank } from "@phosphor-icons/react/dist/icons/CalendarBlank";
import { Headphones } from "@phosphor-icons/react/dist/icons/Headphones";
import { Plus } from "@phosphor-icons/react/dist/icons/Plus";
import { TreeStructure } from "@phosphor-icons/react/dist/icons/TreeStructure";
import { Link } from "react-router";
import { Button } from "@/shared/components/ui/button";
import { moderatorPodcastPath } from "@/features/moderator/paths";
import type { SelectedHistoryNode } from "../types";
import { LibraryStatusBadge } from "./LibraryStatusBadge";

export function LibraryInspector({
  selected,
  onCreateChild,
}: {
  selected: SelectedHistoryNode | null;
  onCreateChild: (kind: "stage" | "event") => void;
}) {
  if (!selected) {
    return (
      <aside className="p-5">
        <p className="text-sm font-bold text-ink">Thông tin mốc lịch sử</p>
        <p className="mt-2 text-xs leading-5 text-ink-soft">
          Chọn một mục trong cây thư viện để xem chi tiết.
        </p>
      </aside>
    );
  }

  const sourceCount =
    selected.type === "event" ? selected.event.sources.length : null;
  const podcastCount =
    selected.type === "event" ? selected.event.podcastCount : null;
  const childCount =
    selected.type === "period"
      ? selected.period.stages.length
      : selected.type === "stage"
        ? selected.stage.events.length
        : null;

  return (
    <aside aria-label="Thông tin mốc lịch sử" className="flex flex-col">
      <div className="border-b border-line p-5">
        <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bronze-dark">
          Thông tin
        </p>
        <h2 className="mt-2 text-base font-extrabold leading-6 text-ink">
          {selected.node.name}
        </h2>
        <div className="mt-3">
          <LibraryStatusBadge status={selected.node.status} />
        </div>
      </div>

      <dl className="divide-y divide-line px-5">
        <div className="flex gap-3 py-4">
          <CalendarBlank
            size={17}
            className="mt-0.5 shrink-0 text-bronze-dark"
            aria-hidden={true}
          />
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
              Mốc thời gian
            </dt>
            <dd className="mt-1 text-xs font-semibold leading-5 text-ink">
              {selected.node.timeLabel}
            </dd>
          </div>
        </div>

        <div className="flex gap-3 py-4">
          <TreeStructure
            size={17}
            className="mt-0.5 shrink-0 text-bronze-dark"
            aria-hidden={true}
          />
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-wider text-ink-soft">
              Vị trí trong thư viện
            </dt>
            <dd className="mt-1 text-xs font-semibold leading-5 text-ink">
              {selected.type === "period"
                ? "Thời kỳ gốc"
                : selected.type === "stage"
                  ? selected.period.name
                  : `${selected.period.name} · ${selected.stage.name}`}
            </dd>
          </div>
        </div>

        {childCount !== null ? (
          <div className="flex items-center justify-between gap-3 py-4">
            <dt className="text-xs font-semibold text-ink-soft">
              {selected.type === "period" ? "Giai đoạn" : "Sự kiện"}
            </dt>
            <dd className="text-sm font-extrabold tabular-nums text-ink">
              {childCount}
            </dd>
          </div>
        ) : null}

        {sourceCount !== null ? (
          <div className="flex items-center justify-between gap-3 py-4">
            <dt className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
              <BookOpenText size={15} aria-hidden={true} />
              Nguồn tư liệu
            </dt>
            <dd className="text-sm font-extrabold tabular-nums text-ink">
              {sourceCount}
            </dd>
          </div>
        ) : null}

        {podcastCount !== null ? (
          <div className="flex items-center justify-between gap-3 py-4">
            <dt className="flex items-center gap-2 text-xs font-semibold text-ink-soft">
              <Headphones size={15} aria-hidden={true} />
              Tập podcast
            </dt>
            <dd className="text-sm font-extrabold tabular-nums text-ink">
              {podcastCount}
            </dd>
          </div>
        ) : null}
      </dl>

      <div className="mt-auto border-t border-line p-5">
        <p className="mb-3 text-[10px] font-bold uppercase tracking-wider text-ink-soft">
          Bước tiếp theo
        </p>
        {selected.type === "event" ? (
          <>
            {selected.event.sources.length === 0 ? (
              <p className="mb-3 rounded-lg bg-[color:var(--history-warning-soft)] px-3 py-2.5 text-xs leading-5 text-bronze-dark">
                Hãy bổ sung nguồn tư liệu trước khi hoàn thiện kịch bản.
              </p>
            ) : null}
            <Link
              to={`${moderatorPodcastPath.newEpisode}?event=${encodeURIComponent(selected.event.id)}`}
              className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-vermilion px-4 text-sm font-bold text-white no-underline transition-colors hover:bg-vermilion-dark active:translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-focus"
            >
              Tạo tập podcast
              <ArrowRight size={16} weight="bold" aria-hidden={true} />
            </Link>
          </>
        ) : (
          <Button
            type="button"
            onClick={() =>
              onCreateChild(selected.type === "period" ? "stage" : "event")
            }
            className="min-h-11 w-full rounded-lg bg-vermilion font-bold text-white hover:bg-vermilion-dark active:translate-y-px"
          >
            <Plus size={16} weight="bold" aria-hidden={true} />
            {selected.type === "period" ? "Thêm giai đoạn" : "Thêm sự kiện"}
          </Button>
        )}
      </div>
    </aside>
  );
}
