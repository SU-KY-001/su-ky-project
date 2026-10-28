import type { ReactElement } from "react";
import type { HistoricalPeriodDto, PublicHistoricalEventDto } from "@repo/shared";
import { CaretDown } from "@phosphor-icons/react/dist/icons/CaretDown";
import { CaretRight } from "@phosphor-icons/react/dist/icons/CaretRight";
import { Button } from "@/shared/components/ui/button";
import { LibraryPages } from "./LibraryPrimitives";

interface HistoryFilterTreeProps {
  periods: HistoricalPeriodDto[];
  period: string;
  phase: string;
  eventId?: string;
  events: PublicHistoricalEventDto[];
  loadingEvents: boolean;
  eventsError: boolean;
  page: number;
  limit: number;
  total: number;
  onPeriod: (id: string) => void;
  onPhase: (id: string) => void;
  onEvent: (event: PublicHistoricalEventDto) => void;
  onPage: (page: number) => void;
  onRetry: () => void;
  onClear: () => void;
}

const choiceStyle = "rounded-xl border-0 bg-transparent text-ink-soft hover:bg-bronze/10 hover:text-ink aria-pressed:bg-bronze/20 aria-pressed:text-ink";

export function HistoryFilterTree(props: HistoryFilterTreeProps): ReactElement {
  return <nav aria-label="Lọc lịch sử theo thời kỳ, giai đoạn và sự kiện" className="library-history-tree">
    <Button variant="ghost" className={`${choiceStyle} mb-4 h-auto w-full justify-start whitespace-normal px-3 py-3 text-left text-sm`} aria-pressed={!props.period} onClick={props.onClear}>Toàn bộ dòng lịch sử</Button>
    <ul className="space-y-2">{props.periods.map(period => {
      const expanded = props.period === period.id;
      const Icon = expanded ? CaretDown : CaretRight;
      return <li key={period.id}>
        <Button variant="ghost" className={`${choiceStyle} h-auto w-full justify-start whitespace-normal px-3 py-3 text-left text-sm`} aria-expanded={expanded} aria-controls={`history-period-${period.id}`} aria-pressed={expanded} onClick={() => expanded ? props.onClear() : props.onPeriod(period.id)}><Icon className="shrink-0" aria-hidden="true" />{period.name}</Button>
        {expanded && <ul id={`history-period-${period.id}`} className="ml-4 mt-2 space-y-1 border-l border-line pl-2">{period.phases.length === 0 ? <li className="p-3 text-xs leading-6 text-muted-foreground">Chưa có giai đoạn công khai.</li> : period.phases.map(phase => {
          const active = props.phase === phase.id;
          const PhaseIcon = active ? CaretDown : CaretRight;
          return <li key={phase.id}><Button variant="ghost" className={`${choiceStyle} h-auto w-full justify-start whitespace-normal px-3 py-3 text-left text-xs`} aria-expanded={active} aria-controls={`history-phase-${phase.id}`} aria-pressed={active} onClick={() => props.onPhase(active ? "" : phase.id)}><PhaseIcon className="shrink-0" aria-hidden="true" />{phase.name}</Button>
            {active && <div id={`history-phase-${phase.id}`} className="ml-4 mt-1 border-l border-line pl-2">
              {props.loadingEvents ? <p role="status" className="p-3 text-xs">Đang tải sự kiện…</p> : props.eventsError ? <div role="alert" className="p-3 text-xs"><p>Chưa tải được sự kiện.</p><Button size="sm" variant="link" onClick={props.onRetry}>Thử lại</Button></div> : props.events.length === 0 ? <p className="p-3 text-xs leading-6 text-muted-foreground">Chưa có sự kiện công khai.</p> : <ul className="space-y-1">{props.events.map(event => <li key={event.id}><Button variant="ghost" className={`${choiceStyle} h-auto w-full flex-col items-start gap-1 whitespace-normal px-3 py-3 text-left text-xs`} aria-pressed={props.eventId === event.id} onClick={() => props.onEvent(event)}><span className="text-[10px] font-normal text-bronze-dark">{event.timeLabel}</span>{event.name}</Button></li>)}</ul>}
              {!props.loadingEvents && !props.eventsError && <LibraryPages page={props.page} limit={props.limit} total={props.total} onChange={props.onPage} />}
            </div>}
          </li>;
        })}</ul>}
      </li>;
    })}</ul>
  </nav>;
}
