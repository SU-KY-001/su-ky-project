import { LockKey, Play } from "@phosphor-icons/react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { MagicCard } from "@/components/ui/magic-card";
import { featuredSeries } from "../data";
import { SectionFrame, SectionHeading } from "./SectionFrame";

export function FeaturedSeries() {
  const [selectedId, setSelectedId] = useState(featuredSeries[0].id);
  const series = featuredSeries.find((item) => item.id === selectedId) ?? featuredSeries[0];

  return (
    <SectionFrame labelledBy="series-heading">
      <div className="flex flex-col gap-7">
        <SectionHeading id="series-heading" title="Mỗi series là một chương hồi" description="Theo một sự kiện từ bối cảnh, nhân vật đến những lựa chọn đã làm lịch sử rẽ hướng." />
        <div className="overflow-x-auto pb-2">
          <div className="flex min-w-max gap-2" role="tablist" aria-label="Chọn series nổi bật">
            {featuredSeries.map((item) => (
              <Button key={item.id} variant={item.id === selectedId ? "default" : "outline"} role="tab" aria-selected={item.id === selectedId} tabIndex={item.id === selectedId ? 0 : -1} className={item.id === selectedId ? "bg-vermilion text-paper-soft hover:bg-vermilion-dark" : "border-line bg-paper-soft text-ink"} onClick={() => setSelectedId(item.id)}>{item.title}</Button>
            ))}
          </div>
        </div>

        <div className="flex flex-col items-stretch gap-7 md:flex-row">
          <div role="group" aria-label={`Series nổi bật: ${series.title}`} className="min-h-[460px] flex-[.82]">
            <MagicCard
              className="min-h-[460px] rounded-lg bg-night"
              gradientColor="rgba(181, 138, 60, 0.22)"
              gradientFrom="#B58A3C"
              gradientTo="#FAF6ED"
              gradientOpacity={0.18}
              gradientSize={240}
            >
              <img src={series.image} alt={series.imageAlt} className="absolute inset-0 size-full object-cover" loading="lazy" decoding="async" />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-night/95 via-night/45 to-transparent" />
              <div className="relative flex min-h-[460px] flex-col justify-end gap-3 p-5 md:p-7">
                <p className="text-sm font-bold text-bronze">{series.period}</p>
                <h3 className="font-serif text-3xl font-bold text-paper-soft">{series.title}</h3>
                <p className="text-base leading-7 text-paper-deep">{series.summary}</p>
                <Button className="mt-2 self-start rounded-md bg-vermilion text-paper-soft hover:bg-vermilion-dark"><Play size={17} weight="fill" />Xem series</Button>
              </div>
            </MagicCard>
          </div>

          <Card className="flex-[1.18] rounded-lg border-bronze bg-paper-deep p-3 md:p-4">
            {series.episodes.map((episode, index) => (
              <div key={episode.number} className={`flex min-h-[74px] items-center gap-4 px-3 py-3 ${index < series.episodes.length - 1 ? "border-b border-line" : ""}`}>
                <span className="min-w-[38px] font-serif text-xl font-bold text-bronze-dark">{String(episode.number).padStart(2, "0")}</span>
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <p className="text-sm font-bold text-ink">{episode.title}</p>
                  <p className="text-xs text-ink-soft">{episode.duration} / {episode.perspectives}</p>
                </div>
                <span className="grid size-9 shrink-0 place-items-center rounded-md border border-bronze text-bronze-dark"><LockKey size={16} aria-hidden="true" /></span>
              </div>
            ))}
          </Card>
        </div>
      </div>
    </SectionFrame>
  );
}
