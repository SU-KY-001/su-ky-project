import { useMemo } from "react";
import { BookOpenText, CalendarBlank } from "@phosphor-icons/react";
import { useLocation, useSearchParams } from "react-router";
import { historicalLibraryFixture } from "@/features/historical-library/data";
import { LibraryContent } from "@/features/historical-library/components/LibraryContent";
import { LibraryStatusBadge } from "@/features/historical-library/components/LibraryStatusBadge";
import type { HistoricalEvent, HistorySelection } from "@/features/historical-library/types";
import { HISTORICAL_EVENTS_PATH, HISTORICAL_SOURCES_PATH, MODERATOR_PENDING_PATH, MODERATOR_SCHEDULE_PATH } from "@/features/moderator/navItems";

const allEvents = historicalLibraryFixture.flatMap((period) => period.stages.flatMap((stage) => stage.events.map((event) => ({ event, period: period.name, stage: stage.name }))));
const allSources = historicalLibraryFixture.flatMap((period) => period.stages.flatMap((stage) => stage.events.flatMap((event) => event.sources.map((source) => ({ ...source, event: event.name, period: period.name })))));

export function ModeratorLibraryFeaturePage() {
  const location = useLocation();
  const [params, setParams] = useSearchParams();
  const selectedEvent = allEvents.find(({ event }) => event.id === params.get("node"))?.event;
  const section = location.pathname;
  const isEvents = section === HISTORICAL_EVENTS_PATH;
  const isSources = section === HISTORICAL_SOURCES_PATH;
  const isPending = section === MODERATOR_PENDING_PATH;
  const title = isEvents ? "Sự kiện" : isSources ? "Nguồn tư liệu" : isPending ? "Cần xử lý" : "Lịch phát hành";
  const eventRows = isPending ? allEvents.filter(({ event }) => event.status !== "complete") : allEvents;
  const selectedNode = useMemo(() => {
    if (!selectedEvent) return null;
    for (const period of historicalLibraryFixture) for (const stage of period.stages) {
      if (stage.events.some((event) => event.id === selectedEvent.id)) return { type: "event", id: selectedEvent.id } as HistorySelection;
    }
    return null;
  }, [selectedEvent]);
  const selectEvent = (event: HistoricalEvent) => setParams({ node: event.id });

  return (
      <div className="flex w-full flex-col gap-5">
        <header className="border-b border-mod-border pb-4">
          <h1 className="text-2xl font-bold tracking-tight text-mod-text">{title}</h1>
          <p className="mt-1 text-sm text-mod-text-secondary">{isEvents ? "Chọn một sự kiện để xem nội dung và tư liệu liên quan." : isSources ? "Danh mục nguồn tư liệu đang được dùng trong thư viện lịch sử." : isPending ? "Các sự kiện chưa hoàn tất hoặc cần bổ sung nguồn." : "Chưa có nội dung nào được xếp lịch phát hành."}</p>
        </header>

        {isEvents || isPending ? (
          <>
            <ul className="divide-y divide-mod-border border-y border-mod-border">
              {eventRows.map(({ event, period, stage }) => (
                <li key={event.id}>
                  <button type="button" onClick={() => selectEvent(event)} className={`flex w-full flex-wrap items-center gap-3 py-4 text-left hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-mod-primary ${event.id === params.get("node") ? "bg-mod-canvas-accent" : ""}`}>
                    <span className="min-w-0 flex-1">
                      <strong className="block text-sm text-mod-text">{event.name}</strong>
                      <span className="mt-1 block text-xs text-mod-text-secondary">{period} · {stage} · {event.timeLabel}</span>
                    </span>
                    <LibraryStatusBadge status={event.status} compact />
                  </button>
                </li>
              ))}
            </ul>
            {selectedEvent && selectedNode ? <LibraryContent selected={findEventNode(selectedEvent.id)} onSelect={(selection) => setParams({ node: selection.id })} onCreateChild={() => undefined} /> : null}
          </>
        ) : null}

        {isSources ? (
          <ul className="divide-y divide-mod-border border-y border-mod-border">
            {allSources.map((source) => <li key={source.id} className="flex items-start gap-3 py-4">
              <BookOpenText size={18} className="mt-0.5 shrink-0 text-mod-text-secondary" aria-hidden="true" />
              <span className="min-w-0 flex-1"><strong className="block text-sm text-mod-text">{source.title}</strong><span className="mt-1 block text-xs text-mod-text-secondary">{source.meta} · {source.event}</span></span>
            </li>)}
          </ul>
        ) : null}

        {section === MODERATOR_SCHEDULE_PATH ? <div className="py-12 text-center">
          <CalendarBlank size={28} className="mx-auto text-mod-text-low" aria-hidden="true" />
          <p className="mt-3 text-sm font-semibold text-mod-text">Chưa có lịch phát hành</p>
          <p className="mt-1 text-xs text-mod-text-secondary">Lịch sẽ hiển thị tại đây khi podcast được lên lịch.</p>
        </div> : null}
      </div>
  );

  function findEventNode(id: string) {
    for (const period of historicalLibraryFixture) for (const stage of period.stages) {
      const event = stage.events.find((candidate) => candidate.id === id);
      if (event) return { type: "event", node: event, period, stage, event } as const;
    }
    return null;
  }
}
