import { useState, type ReactElement } from "react";
import { Link, useSearchParams } from "react-router";
import { ArrowLeft, ArrowRight, BookOpen, CalendarBlank, CaretLeft, CaretRight, ClockCounterClockwise, Headphones, Medal } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";
import { heroSlides } from "../../data";
import type { HeroSlide } from "../../types";
import { cn } from "@/lib/utils";
import "../library/podcast-library.css";
import "./history-design-wireframe.css";

const concepts = [
  { id: "flow", name: "A · Dòng chảy lịch sử", note: "Đi qua các mốc thời gian, dừng lại trong một khung cảnh và chọn nghe câu chuyện." },
  { id: "archive", name: "B · Bàn lưu trữ", note: "Mở từng tập hồ sơ, khám phá ảnh minh họa và câu chuyện phía sau." },
  { id: "portals", name: "C · Cánh cửa thời đại", note: "Chạm vào một thời kỳ để mở rộng khung cảnh và bước vào những dấu mốc bên trong." },
];

// Preview hierarchy uses existing landing illustrations and copy, independently of live catalog records.
const periods = [
  { id: "early", name: "Bắc thuộc", image: heroSlides[1], phases: [{ id: "uprising", name: "Những cuộc khởi nghĩa", events: [heroSlides[1]] }] },
  { id: "feudal", name: "Phong kiến", image: heroSlides[0], phases: [{ id: "independence", name: "Buổi đầu tự chủ", events: [heroSlides[0]] }] },
  { id: "modern", name: "Hiện đại", image: heroSlides[2], phases: [{ id: "resistance", name: "Kháng chiến", events: [heroSlides[2]] }, { id: "renewal", name: "Đổi mới", events: [heroSlides[3]] }] },
];

const nextSections = [
  { name: "Sách nói 3D", icon: BookOpen },
  { name: "Podcast theo sự kiện", icon: Headphones },
  { name: "Thành tựu & vinh danh", icon: Medal },
  { name: "Lịch phát hành", icon: CalendarBlank },
];

export function HistoryDesignWireframe(): ReactElement {
  const [params, setParams] = useSearchParams();
  const concept = concepts.find((value) => value.id === params.get("concept")) ?? concepts[0];
  const [periodIndex, setPeriodIndex] = useState(1);
  const [phaseIndex, setPhaseIndex] = useState(0);
  const [eventIndex, setEventIndex] = useState(0);
  const [preview, setPreview] = useState<HeroSlide | null>(null);
  const period = periods[periodIndex];
  const phase = period.phases[phaseIndex];
  const event = phase.events[eventIndex];

  function choosePeriod(index: number): void { if (index === periodIndex) return; setPeriodIndex(index); setPhaseIndex(0); setEventIndex(0); }
  function choosePhase(index: number): void { setPhaseIndex(index); setEventIndex(0); }

  function phaseLinks(dark = false): ReactElement {
    return <div className="flex flex-wrap items-center gap-2" aria-label="Giai đoạn trong thời kỳ">
      {period.phases.length > 1 ? period.phases.map((value, index) => <Button key={value.id} variant="ghost" size="sm" aria-pressed={phaseIndex === index} className={cn("history-phase rounded-full", dark && "history-phase-dark")} onClick={() => choosePhase(index)}>{value.name}</Button>) : <span className={cn("text-xs", dark ? "text-paper-deep" : "text-bronze-dark")}>{phase.name}</span>}
    </div>;
  }

  function listenButton(dark = false, label = "Nghe câu chuyện này"): ReactElement {
    return <Button className={cn("h-auto min-h-10 whitespace-normal rounded-xl px-5 py-3", dark && "bg-paper-soft text-ink hover:bg-paper-deep")} onClick={() => setPreview(event)}><Headphones size={18} aria-hidden="true" />{label}<ArrowRight aria-hidden="true" /></Button>;
  }

  return <div className="history-design-page h-[100dvh] overflow-y-auto bg-paper text-ink">
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur-md md:px-7">
      <div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-2"><Button asChild size="icon" variant="ghost"><Link to="/wireframes/podcast-showcase?layout=catalog&surface=light" aria-label="Về wireframe showcase"><ArrowLeft /></Link></Button><div><p className="text-sm font-semibold">Duyệt thiết kế · Dòng lịch sử</p><p className="text-xs text-muted-foreground">Hình và nội dung minh họa từ landing, chưa nối dữ liệu thật.</p></div></div><div role="group" aria-label="Chọn thiết kế Dòng lịch sử" className="flex flex-wrap gap-2">{concepts.map((value) => <Button key={value.id} size="sm" variant={value.id === concept.id ? "default" : "outline"} className="rounded-xl" aria-pressed={concept.id === value.id} onClick={() => setParams({ concept: value.id }, { preventScrollReset: true })}>{value.name}</Button>)}</div></div>
    </header>

    <main className="px-4 pb-16 pt-8 md:px-7 md:pt-12">
      <div className="mb-8 flex flex-wrap items-end justify-between gap-4"><div><Badge variant="outline">Wireframe tương tác</Badge><h1 className="mt-3 text-xl font-semibold">{concept.name}</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground" aria-live="polite">{concept.note}</p></div><Button asChild variant="link"><Link to="/">Xem landing hiện tại <ArrowRight aria-hidden="true" /></Link></Button></div>

      <div className="library-surface relative isolate px-4 py-7 sm:px-7 lg:px-9">
        <div className="grid gap-8 xl:grid-cols-[184px_minmax(0,1fr)] xl:gap-10">
          <aside className="self-start xl:sticky xl:top-32"><p className="mb-5 text-xs uppercase tracking-[.2em] text-bronze-dark">Thư viện Sử Ký</p><nav aria-label="Mục lục trong bản duyệt" className="flex gap-2 overflow-x-auto xl:flex-col"><Button variant="ghost" className="library-choice h-auto justify-start gap-3 py-3 text-xs" aria-current="location" onClick={() => document.getElementById("history-concept")?.scrollIntoView({ block: "start" })}><ClockCounterClockwise aria-hidden="true" /> Dòng lịch sử</Button>{nextSections.map(({ name, icon: Icon }) => <Button key={name} variant="ghost" className="library-choice h-auto justify-start gap-3 py-3 text-xs xl:whitespace-normal xl:text-left" onClick={() => document.getElementById("history-next-sections")?.scrollIntoView({ block: "center" })}><Icon aria-hidden="true" />{name}</Button>)}</nav></aside>

          <div className="min-w-0">
            <section id="history-concept" aria-labelledby="history-concept-title" className="scroll-mt-48">
              <h2 id="history-concept-title" className="mb-7 max-w-2xl text-3xl font-semibold leading-tight tracking-tight md:text-4xl">Lịch sử bắt đầu từ một điều tò mò.</h2>

              {concept.id === "flow" && <div className="history-flow">
                <nav aria-label="Dòng thời kỳ" className="history-flow-rail">{periods.map((value, index) => <Button key={value.id} variant="ghost" aria-pressed={index === periodIndex} className="history-flow-stop" onClick={() => choosePeriod(index)}><span className="history-flow-point" aria-hidden="true" /><span className="text-xs text-bronze-dark">{value.image.year}</span><span className="font-medium">{value.name}</span></Button>)}</nav>
                <div className="history-flow-scene" key={event.id}><img src={event.image} alt={event.imageAlt} className="history-scene-image" /><div className="history-flow-shade" /><div className="history-flow-copy">{phaseLinks(true)}<p className="history-scene-year">{event.year}</p><h3 className="max-w-xl text-3xl font-semibold leading-tight md:text-4xl">{event.title}</h3><p className="mt-3 max-w-lg text-sm leading-7 text-paper-deep">{event.subtitle}</p><div className="mt-6">{listenButton(true)}</div></div><span className="history-image-note">Ảnh minh họa</span></div>
                <div className="mt-5 flex flex-wrap items-center justify-between gap-3"><p className="text-xs leading-6 text-muted-foreground">{period.name} <span aria-hidden="true">/</span> {phase.name} <span aria-hidden="true">/</span> {event.year}</p><div className="flex gap-2"><Button variant="outline" size="icon-sm" aria-label="Thời kỳ trước" disabled={periodIndex === 0} onClick={() => choosePeriod(periodIndex - 1)}><CaretLeft /></Button><Button variant="outline" size="icon-sm" aria-label="Thời kỳ sau" disabled={periodIndex === periods.length - 1} onClick={() => choosePeriod(periodIndex + 1)}><CaretRight /></Button></div></div>
              </div>}

              {concept.id === "archive" && <div className="history-archive">
                <nav aria-label="Hồ sơ theo thời kỳ" className="history-folder-tabs">{periods.map((value, index) => <Button key={value.id} variant="ghost" className="history-folder-tab" aria-pressed={periodIndex === index} onClick={() => choosePeriod(index)}><BookOpen aria-hidden="true" />{value.name}</Button>)}</nav>
                <div className="history-archive-desk">
                  <figure className="history-archive-photo" key={event.id}><img src={event.image} alt={event.imageAlt} /><figcaption><span>Ảnh minh họa · {event.year}</span><span>Sử Ký / Bộ sưu tập</span></figcaption></figure>
                  <div className="history-archive-note"><div className="history-archive-stamp" aria-hidden="true">SỬ KÝ<br />VIỆT NAM</div>{phaseLinks()}<p className="mt-7 text-xs uppercase tracking-widest text-bronze-dark">Dấu mốc {event.year}</p><h3 className="mt-3 max-w-lg text-2xl font-semibold leading-snug md:text-3xl">{event.title}</h3><p className="history-archive-prompt">{event.subtitle}</p><div className="mt-6">{listenButton(false, "Nghe câu chuyện phía sau")}</div></div>
                </div>
              </div>}

              {concept.id === "portals" && <div className="history-portals">{periods.map((value, index) => {
                const selected = periodIndex === index;
                return <article key={value.id} className="history-portal" data-active={selected}>
                  <img src={selected ? event.image : value.image.image} alt={selected ? event.imageAlt : value.image.imageAlt} className="history-scene-image" /><div className="history-portal-shade" />
                  <Button variant="ghost" className="history-portal-select" aria-expanded={selected} aria-controls={`portal-details-${value.id}`} onClick={() => choosePeriod(index)}><span>{value.name}</span><ArrowRight aria-hidden="true" /></Button>
                  <div id={`portal-details-${value.id}`} hidden={!selected} className="history-portal-details">{selected && <>{phaseLinks(true)}<p className="mt-5 text-4xl font-light tracking-tight text-paper-deep">{event.year}</p><h3 className="mt-3 max-w-lg text-2xl font-semibold leading-tight md:text-3xl">{event.title}</h3><div className="mt-6">{listenButton(true)}</div></>}</div><span className="history-image-note">Ảnh minh họa</span>
                </article>;
              })}</div>}

              <div className="mt-7 flex flex-wrap items-center gap-2 text-xs text-muted-foreground" aria-label="Sự kiện trong giai đoạn"><span className="mr-1">Sự kiện:</span>{phase.events.map((value, index) => <Button key={value.id} size="sm" variant="ghost" className="library-choice h-auto whitespace-normal py-2 text-left text-xs" aria-pressed={eventIndex === index} onClick={() => setEventIndex(index)}>{value.title}</Button>)}</div>
            </section>

            <section id="history-next-sections" aria-label="Các phần tiếp theo của landing" className="mt-12 scroll-mt-48 border-t border-line pt-7"><p className="mb-4 text-xs text-muted-foreground">Các phần tiếp theo giữ thứ tự hiện tại</p><ol className="grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">{nextSections.map(({ name, icon: Icon }) => <li key={name} className="flex items-center gap-3 rounded-xl bg-paper-deep/35 p-4 text-sm"><Icon className="shrink-0 text-bronze-dark" size={20} aria-hidden="true" />{name}</li>)}</ol></section>
          </div>
        </div>
      </div>
    </main>

    <Dialog open={Boolean(preview)} onOpenChange={(open) => { if (!open) setPreview(null); }}><DialogContent><DialogTitle>{preview?.title}</DialogTitle><DialogDescription>Điểm nối từ sự kiện sang danh sách podcast liên quan.</DialogDescription><div className="rounded-xl bg-paper-deep/50 p-5"><Headphones size={28} className="mb-4 text-bronze-dark" aria-hidden="true" /><p className="text-sm leading-7">Ở bản build, chọn nghe tại đây sẽ mở các tập podcast của sự kiện này.</p><p className="mt-3 text-xs leading-6 text-muted-foreground">Wireframe chỉ minh họa luồng tương tác, chưa phát âm thanh hoặc lọc nội dung trên landing.</p></div></DialogContent></Dialog>
  </div>;
}
