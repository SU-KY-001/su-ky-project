import { Article } from "@phosphor-icons/react/dist/icons/Article";
import { CaretRight } from "@phosphor-icons/react/dist/icons/CaretRight";
import { MapTrifold } from "@phosphor-icons/react/dist/icons/MapTrifold";
import { cn } from "@/lib/utils";
import type { HistoricalPeriod, HistorySelection } from "../types";

interface HistoryTreeProps {
  periods: HistoricalPeriod[];
  selection: HistorySelection;
  expandedIds: Set<string>;
  forceExpanded: boolean;
  onSelect: (selection: HistorySelection) => void;
  onToggle: (id: string) => void;
}

const isSelected = (
  selection: HistorySelection,
  type: HistorySelection["type"],
  id: string,
): boolean => selection.type === type && selection.id === id;

export function HistoryTree({
  periods,
  selection,
  expandedIds,
  forceExpanded,
  onSelect,
  onToggle,
}: HistoryTreeProps) {
  if (periods.length === 0) {
    return (
      <div className="flex min-h-64 flex-col items-center justify-center gap-2 px-5 text-center">
        <MapTrifold size={28} className="text-bronze" aria-hidden={true} />
        <p className="text-sm font-semibold text-ink">
          Không tìm thấy mốc lịch sử
        </p>
        <p className="text-xs leading-5 text-ink-soft">
          Thử đổi từ khóa hoặc bộ lọc trạng thái.
        </p>
      </div>
    );
  }

  return (
    <nav
      aria-label="Cây thư viện lịch sử"
      className="flex flex-col gap-1.5 p-2"
    >
      {periods.map((period) => {
        const periodOpen = forceExpanded || expandedIds.has(period.id);
        const periodEventCount = period.stages.reduce(
          (total, stage) => total + stage.events.length,
          0,
        );

        return (
          <div key={period.id} className="flex flex-col">
            <div className="group flex items-stretch gap-1">
              <button
                type="button"
                className="grid min-h-11 w-8 shrink-0 place-items-center rounded-md text-ink-soft transition-colors hover:bg-paper-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
                aria-label={
                  periodOpen
                    ? `Thu gọn ${period.name}`
                    : `Mở rộng ${period.name}`
                }
                aria-expanded={periodOpen}
                onClick={() => onToggle(period.id)}
              >
                <CaretRight
                  size={14}
                  weight="bold"
                  className={cn(
                    "transition-transform duration-200",
                    periodOpen && "rotate-90",
                  )}
                />
              </button>
              <button
                type="button"
                onClick={() => onSelect({ type: "period", id: period.id })}
                className={cn(
                  "flex min-h-11 min-w-0 flex-1 items-center gap-2 rounded-lg px-2.5 text-left transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
                  isSelected(selection, "period", period.id)
                    ? "bg-paper-deep text-ink"
                    : "text-ink-soft hover:bg-paper-deep/60 hover:text-ink",
                )}
              >
                <MapTrifold
                  size={17}
                  weight={
                    isSelected(selection, "period", period.id)
                      ? "fill"
                      : "regular"
                  }
                  className="shrink-0 text-vermilion"
                  aria-hidden={true}
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold leading-5">
                    {period.name}
                  </span>
                  <span className="block text-[10px] leading-4 text-ink-soft">
                    {period.timeLabel}
                  </span>
                </span>
                <span className="min-w-6 rounded-md bg-paper px-1.5 py-1 text-center text-[10px] font-bold tabular-nums text-ink-soft">
                  {periodEventCount}
                </span>
              </button>
            </div>

            {periodOpen ? (
              <div className="ml-4 border-l border-line pl-3">
                {period.stages.map((stage) => {
                  const stageOpen = forceExpanded || expandedIds.has(stage.id);
                  return (
                    <div key={stage.id} className="flex flex-col py-0.5">
                      <div className="flex items-stretch gap-1">
                        <button
                          type="button"
                          className="grid min-h-10 w-7 shrink-0 place-items-center rounded-md text-ink-soft transition-colors hover:bg-paper-deep focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus"
                          aria-label={
                            stageOpen
                              ? `Thu gọn ${stage.name}`
                              : `Mở rộng ${stage.name}`
                          }
                          aria-expanded={stageOpen}
                          onClick={() => onToggle(stage.id)}
                        >
                          <CaretRight
                            size={13}
                            weight="bold"
                            className={cn(
                              "transition-transform duration-200",
                              stageOpen && "rotate-90",
                            )}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            onSelect({ type: "stage", id: stage.id })
                          }
                          className={cn(
                            "flex min-h-10 min-w-0 flex-1 items-center gap-2 rounded-lg px-2 text-left text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
                            isSelected(selection, "stage", stage.id)
                              ? "bg-paper-deep font-bold text-ink"
                              : "font-semibold text-ink-soft hover:bg-paper-deep/60 hover:text-ink",
                          )}
                        >
                          <span className="min-w-0 flex-1 leading-5">
                            {stage.name}
                          </span>
                          <span className="text-[10px] tabular-nums text-ink-soft">
                            {stage.events.length}
                          </span>
                        </button>
                      </div>

                      {stageOpen ? (
                        <div className="ml-3 flex flex-col border-l border-line/80 py-1 pl-3">
                          {stage.events.map((event) => (
                            <button
                              key={event.id}
                              type="button"
                              onClick={() =>
                                onSelect({ type: "event", id: event.id })
                              }
                              className={cn(
                                "flex min-h-10 items-start gap-2 rounded-lg px-2 py-2 text-left text-xs transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-focus",
                                isSelected(selection, "event", event.id)
                                  ? "bg-vermilion text-white"
                                  : "text-ink-soft hover:bg-paper-deep/60 hover:text-ink",
                              )}
                            >
                              <Article
                                size={14}
                                className="mt-0.5 shrink-0"
                                aria-hidden={true}
                              />
                              <span className="min-w-0 flex-1 leading-5">
                                {event.name}
                              </span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            ) : null}
          </div>
        );
      })}
    </nav>
  );
}
