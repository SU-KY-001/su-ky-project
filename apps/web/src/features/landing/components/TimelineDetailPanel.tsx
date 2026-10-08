import { LockKey, MicrophoneStage } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import type { TimelineEvent } from "../types";

interface TimelineDetailPanelProps {
  event: TimelineEvent;
}

export function TimelineDetailPanel({ event }: TimelineDetailPanelProps) {
  return (
    <div className="rounded-lg border border-bronze bg-paper-soft p-5 md:p-6">
      <div className="flex flex-col justify-between gap-5 md:flex-row">
        <div className="flex flex-1 flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-vermilion">{event.year}</span>
            <span aria-hidden="true" className="h-px w-7 bg-bronze" />
            <span className="text-sm font-semibold text-ink-soft">{event.period}</span>
          </div>
          <h3 className="font-serif text-2xl font-bold text-ink">{event.title}</h3>
          <p className="text-base leading-7 text-ink-soft">{event.summary}</p>
        </div>
        <aside className="flex min-w-0 flex-col gap-3 rounded-md bg-paper-deep p-4 md:min-w-60">
          <div className="flex items-center gap-2"><MicrophoneStage size={18} className="text-vermilion" /><h4 className="text-sm font-bold text-ink">Nhân vật chính</h4></div>
          <p className="text-sm text-ink-soft">{event.character}</p>
          <h4 className="text-sm font-bold text-ink">Series liên quan</h4>
          <p className="text-sm text-ink-soft">{event.series}</p>
          <Button className="mt-1 rounded-md bg-vermilion text-paper-soft hover:bg-vermilion-dark">
            <LockKey size={16} />Đăng nhập để nghe
          </Button>
        </aside>
      </div>
    </div>
  );
}
