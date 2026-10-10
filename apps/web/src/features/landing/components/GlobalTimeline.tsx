import { useMemo, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/shared/components/ui/sheet";
import { cn } from "@/lib/utils";
import { timelineEvents } from "../data";
import type { TimelineEvent } from "../types";
import { SectionFrame, SectionHeading } from "./SectionFrame";
import { TimelineDetailPanel } from "./TimelineDetailPanel";

const periods = ["Tất cả", "Nguyên thủy", "Cổ đại", "Phong kiến", "Cận đại", "Hiện đại"];

export function GlobalTimeline() {
  const [period, setPeriod] = useState("Tất cả");
  const [selected, setSelected] = useState<TimelineEvent>(timelineEvents[2]);
  const [sheetOpen, setSheetOpen] = useState(false);
  const events = useMemo(() => period === "Tất cả" ? timelineEvents : timelineEvents.filter((event) => event.period === period), [period]);

  const chooseEvent = (event: TimelineEvent): void => {
    setSelected(event);
    if (!window.matchMedia("(min-width: 768px)").matches) setSheetOpen(true);
  };

  return (
    <SectionFrame id="timeline" labelledBy="timeline-heading">
      <div className="flex flex-col gap-7">
        <SectionHeading id="timeline-heading" eyebrow="Dòng thời gian" title="Đi qua lịch sử bằng những mốc biết kể chuyện" description="Chọn một thời kỳ, dừng ở một cột mốc và nghe câu chuyện từ nhiều góc nhìn." />

        <div className="overflow-x-auto pb-2" aria-label="Chọn giai đoạn lịch sử">
          <div className="flex min-w-max gap-2">
            {periods.map((item) => (
              <Button key={item} variant={period === item ? "default" : "outline"} className={cn("rounded-md", period === item ? "bg-vermilion text-paper-soft hover:bg-vermilion-dark" : "border-line bg-paper-soft text-ink")} onClick={() => setPeriod(item)} aria-pressed={period === item}>
                {item}
              </Button>
            ))}
          </div>
        </div>

        {events.length ? (
          <div className="overflow-x-auto md:pb-3">
            <div className="flex flex-col py-3 md:min-w-[980px] md:flex-row">
              {events.map((event, index) => {
                const isSelected = selected.id === event.id;
                const isAvailable = event.status === "available";
                return (
                  <div key={event.id} className="relative flex min-h-[112px] flex-1 flex-row md:min-h-[150px] md:min-w-[174px] md:flex-col">
                    {index < events.length - 1 ? <span aria-hidden="true" className="absolute bottom-0 left-[15px] top-4 w-px bg-line md:bottom-auto md:left-[19px] md:top-5 md:h-px md:w-full" /> : null}
                    <Button
                      variant="ghost"
                      className={cn("relative z-10 size-8 shrink-0 rounded-full border-2 p-0 hover:bg-paper-soft", isSelected ? "border-[7px] border-paper-deep bg-vermilion ring-2 ring-vermilion" : isAvailable ? "border-bronze bg-paper-soft" : "border-line bg-paper-deep", "md:size-10")}
                      onClick={() => chooseEvent(event)}
                      aria-label={`${event.year}: ${event.title}${isAvailable ? "" : ", sắp ra mắt"}`}
                      aria-pressed={isSelected}
                    />
                    <div className="flex flex-col gap-1 pl-3 pt-0 md:pl-0 md:pr-4 md:pt-3">
                      <span className={cn("text-sm font-bold", isSelected ? "text-vermilion" : "text-ink")}>{event.year}</span>
                      <span className={cn("text-sm font-semibold", isAvailable ? "text-ink" : "text-ink-soft")}>{event.title}</span>
                      {!isAvailable ? <span className="text-xs text-ink-soft">Sắp ra mắt</span> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center rounded-md border border-line p-8 text-center text-ink-soft">
            Nội dung giai đoạn này đang được biên soạn.
          </div>
        )}

        <div className="hidden md:block"><TimelineDetailPanel event={selected} /></div>
      </div>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl border-t border-bronze bg-paper p-5">
          <SheetHeader><SheetTitle>Chi tiết {selected.title}</SheetTitle></SheetHeader>
          <TimelineDetailPanel event={selected} />
        </SheetContent>
      </Sheet>
    </SectionFrame>
  );
}
