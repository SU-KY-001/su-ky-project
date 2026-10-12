import { ArrowRight, BookOpenText, CalendarBlank, Headphones, Plus } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import type { HistorySelection, SelectedHistoryNode } from "../types";
import { LibraryStatusBadge } from "./LibraryStatusBadge";

interface LibraryContentProps {
  selected: SelectedHistoryNode | null;
  onSelect: (selection: HistorySelection) => void;
  onCreateChild: (kind: "stage" | "event") => void;
}

function ContextHeader({ selected, onCreateChild }: Omit<LibraryContentProps, "onSelect">) {
  if (!selected) return null;

  const childAction = selected.type === "period"
    ? { label: "Thêm giai đoạn", kind: "stage" as const }
    : selected.type === "stage"
      ? { label: "Thêm sự kiện", kind: "event" as const }
      : null;

  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b border-mod-border px-5 py-5 sm:px-6">
      <div className="min-w-0 flex-1">
        <div className="mb-2 flex flex-wrap items-center gap-1.5 text-[11px] font-semibold text-mod-text-secondary">
          <span>{selected.period.name}</span>
          {selected.type !== "period" ? <ArrowRight size={11} aria-hidden={true} /> : null}
          {selected.type !== "period" ? <span>{selected.stage.name}</span> : null}
          {selected.type === "event" ? <ArrowRight size={11} aria-hidden={true} /> : null}
          {selected.type === "event" ? <span className="text-mod-primary">{selected.event.name}</span> : null}
        </div>
        <div className="flex flex-wrap items-center gap-2.5">
          <h2 className="text-balance text-xl font-extrabold leading-tight tracking-tight text-mod-text sm:text-2xl">{selected.node.name}</h2>
          <LibraryStatusBadge status={selected.node.status} />
        </div>
        <p className="mt-2 flex items-center gap-1.5 text-xs font-semibold text-mod-text-secondary">
          <CalendarBlank size={14} className="text-mod-text-low" aria-hidden={true} />
          {selected.node.timeLabel}
        </p>
      </div>

      {childAction ? (
        <Button
          type="button"
          onClick={() => onCreateChild(childAction.kind)}
          className="min-h-11 rounded-lg bg-vermilion px-4 font-bold text-white hover:bg-vermilion-dark active:translate-y-px"
        >
          <Plus size={16} weight="bold" aria-hidden={true} />
          {childAction.label}
        </Button>
      ) : null}
    </header>
  );
}

export function LibraryContent({ selected, onSelect, onCreateChild }: LibraryContentProps) {
  if (!selected) {
    return (
      <div className="grid min-h-80 place-items-center px-6 text-center">
        <div className="max-w-sm">
          <BookOpenText size={32} className="mx-auto mb-3 text-mod-text-low" aria-hidden={true} />
          <h2 className="text-lg font-extrabold text-mod-text">Không có nội dung phù hợp</h2>
          <p className="mt-2 text-sm leading-6 text-mod-text-secondary">Thử thay đổi từ khóa hoặc chọn một trạng thái khác để xem lại thư viện.</p>
        </div>
      </div>
    );
  }

  return (
    <section aria-label="Nội dung lịch sử đang chọn" className="flex min-w-0 flex-col">
      <ContextHeader selected={selected} onCreateChild={onCreateChild} />

      <div className="flex flex-col gap-6 p-5 sm:p-6">
        <p className="max-w-[68ch] text-sm leading-7 text-mod-text-secondary">{selected.node.summary}</p>

        {selected.type === "period" ? (
          <div>
            <div className="mb-3 flex items-end justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bronze-dark">Các giai đoạn</p>
                <p className="mt-1 text-xs text-ink-soft">{selected.period.stages.length} giai đoạn trong thời kỳ này</p>
              </div>
            </div>
            <div className="divide-y divide-line border-y border-line">
              {selected.period.stages.map((stage, index) => (
                <button
                  key={stage.id}
                  type="button"
                  onClick={() => onSelect({ type: "stage", id: stage.id })}
            className="group flex min-h-[82px] w-full items-center gap-4 px-1 py-4 text-left transition-colors hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary"
                >
                  <span className="w-7 shrink-0 text-sm font-bold tabular-nums text-bronze">{String(index + 1).padStart(2, "0")}</span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <strong className="text-sm text-ink">{stage.name}</strong>
                      <LibraryStatusBadge status={stage.status} compact />
                    </span>
                    <span className="mt-1 block text-xs leading-5 text-ink-soft">{stage.timeLabel} · {stage.events.length} sự kiện</span>
                  </span>
                  <ArrowRight size={17} className="shrink-0 text-bronze transition-transform group-hover:translate-x-1" aria-hidden={true} />
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {selected.type === "stage" ? (
          <div>
            <div className="mb-3">
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-bronze-dark">Các sự kiện</p>
              <p className="mt-1 text-xs text-ink-soft">{selected.stage.events.length} sự kiện thuộc giai đoạn này</p>
            </div>
            {selected.stage.events.length > 0 ? (
              <div className="divide-y divide-line border-y border-line">
                {selected.stage.events.map((event) => (
                  <button
                    key={event.id}
                    type="button"
                    onClick={() => onSelect({ type: "event", id: event.id })}
                    className="group flex min-h-[92px] w-full items-start gap-4 px-1 py-4 text-left transition-colors hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary"
                  >
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-vermilion ring-4 ring-vermilion/10" />
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <strong className="text-sm leading-5 text-ink">{event.name}</strong>
                        <LibraryStatusBadge status={event.status} compact />
                      </span>
                      <span className="mt-1 block text-xs font-semibold text-bronze-dark">{event.timeLabel}</span>
                      <span className="mt-1 line-clamp-1 block text-xs text-ink-soft">{event.summary}</span>
                    </span>
                    <ArrowRight size={17} className="mt-1 shrink-0 text-bronze transition-transform group-hover:translate-x-1" aria-hidden={true} />
                  </button>
                ))}
              </div>
            ) : (
              <div className="border-y border-dashed border-line px-4 py-10 text-center">
                <p className="text-sm font-bold text-ink">Giai đoạn chưa có sự kiện</p>
                <p className="mt-1 text-xs text-ink-soft">Thêm sự kiện đầu tiên để tiếp tục xây dựng dòng lịch sử.</p>
              </div>
            )}
          </div>
        ) : null}

        {selected.type === "event" ? (
          <div className="grid gap-7 lg:grid-cols-[minmax(0,1fr)_minmax(210px,0.42fr)]">
            <section aria-labelledby="event-sources-title">
              <div className="mb-3 flex items-end justify-between gap-3">
                <div>
                  <p id="event-sources-title" className="text-[11px] font-bold uppercase tracking-[0.14em] text-mod-text-secondary">Nguồn tư liệu</p>
                  <p className="mt-1 text-xs text-mod-text-secondary">Căn cứ đang được sử dụng cho sự kiện</p>
                </div>
                  <span className="text-xs font-bold tabular-nums text-mod-text">{selected.event.sources.length}</span>
              </div>
              {selected.event.sources.length > 0 ? (
                <div className="divide-y divide-mod-border border-y border-mod-border">
                  {selected.event.sources.map((source) => (
                    <article key={source.id} className="flex gap-3 py-4">
                      <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-mod-canvas-accent text-mod-text-secondary">
                        <BookOpenText size={17} aria-hidden={true} />
                      </span>
                      <div className="min-w-0">
                        <h3 className="text-sm font-bold leading-5 text-mod-text">{source.title}</h3>
                        <p className="mt-1 text-xs leading-5 text-mod-text-secondary">{source.meta}</p>
                      </div>
                    </article>
                  ))}
                </div>
              ) : (
                <div className="border-y border-dashed border-mod-attention/20 bg-mod-attention/5 px-4 py-7 text-center">
                  <BookOpenText size={24} className="mx-auto text-mod-attention" aria-hidden={true} />
                  <p className="mt-2 text-sm font-bold text-mod-text">Sự kiện chưa có nguồn tư liệu</p>
                  <p className="mt-1 text-xs leading-5 text-mod-text-secondary">Cần bổ sung ít nhất một nguồn trước khi đánh dấu sẵn sàng sản xuất.</p>
                </div>
              )}
            </section>

            <aside aria-label="Podcast liên quan" className={cn("border-l-0 border-mod-border lg:border-l lg:pl-6")}>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-mod-text-secondary">Podcast liên quan</p>
              <div className="mt-3 flex items-center gap-3">
                <span className="grid size-10 place-items-center rounded-lg bg-mod-canvas-accent text-mod-text-secondary"><Headphones size={18} aria-hidden={true} /></span>
                <div>
                  <strong className="block text-2xl font-extrabold tabular-nums text-mod-text">{selected.event.podcastCount}</strong>
                  <span className="text-xs text-mod-text-secondary">tập podcast</span>
                </div>
              </div>
              <p className="mt-4 text-xs leading-5 text-mod-text-secondary">
                {selected.event.podcastCount > 0
                  ? "Sự kiện đã có nội dung âm thanh trong thư viện."
                  : "Chưa có tập podcast nào khai thác sự kiện này."}
              </p>
            </aside>
          </div>
        ) : null}
      </div>
    </section>
  );
}

