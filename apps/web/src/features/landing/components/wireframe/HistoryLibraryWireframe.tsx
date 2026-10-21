import { useState, type ReactElement } from "react";
import { Link } from "react-router";
import { ArrowLeft, ArrowRight, BookOpen, Books, CalendarBlank, CaretLeft, CaretRight, Headphones, ListBullets, Medal, Play, X } from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { Badge } from "@/shared/components/ui/badge";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";
import { heroSlides, featuredSeries } from "../../data";
import type { HeroSlide } from "../../types";
import { cn } from "@/lib/utils";
import "../library/podcast-library.css";
import "./history-library-wireframe.css";

interface PreviewBook { story: HeroSlide; phaseId: string; chapters: string[] }
const genericChapters = ["Mở đầu câu chuyện", "Bối cảnh và nhân vật", "Dấu mốc và ảnh hưởng"];
const rooms = [
  { id: "early", name: "Bắc thuộc", phases: [{ id: "uprising", name: "Những cuộc khởi nghĩa" }], books: [{ story: heroSlides[1], phaseId: "uprising", chapters: genericChapters }] },
  { id: "feudal", name: "Phong kiến", phases: [{ id: "independence", name: "Buổi đầu tự chủ" }], books: [{ story: heroSlides[0], phaseId: "independence", chapters: featuredSeries[0].episodes.map((value) => value.title) }] },
  { id: "modern", name: "Hiện đại", phases: [{ id: "resistance", name: "Kháng chiến" }, { id: "renewal", name: "Đổi mới" }], books: [{ story: heroSlides[2], phaseId: "resistance", chapters: featuredSeries[1].episodes.map((value) => value.title) }, { story: heroSlides[3], phaseId: "renewal", chapters: genericChapters }] },
];

function CombinedBookReader({ book, initialChapter, startOpen, onClose }: { book: PreviewBook; initialChapter: number; startOpen: boolean; onClose: () => void }): ReactElement {
  const [opened, setOpened] = useState(startOpen);
  const [chapter, setChapter] = useState(initialChapter);
  const [audioSlot, setAudioSlot] = useState(startOpen);
  function turn(index: number): void { setChapter(index); setAudioSlot(false); }
  return <Dialog open onOpenChange={(value) => { if (!value) onClose(); }}><DialogContent showCloseButton={false} className="hl-reader inset-0 left-0 top-0 flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col overflow-y-auto rounded-none border-0 bg-paper p-4 sm:p-7">
    <header className="flex items-start justify-between gap-4"><div><DialogTitle>{book.story.title}</DialogTitle><DialogDescription>Wireframe sách nói · nội dung và tên chương minh họa.</DialogDescription></div><DialogClose asChild><Button variant="outline" className="shrink-0 rounded-xl"><X aria-hidden="true" /> Thoát sách</Button></DialogClose></header>
    <div className="mx-auto grid w-full max-w-[1280px] flex-1 items-center gap-8 py-8 lg:grid-cols-[minmax(0,1fr)_300px] lg:gap-12">
      <div className="flex min-w-0 flex-col items-center gap-7">
        <div className="library-book-stage" data-open={opened}>
          <div className="library-book-spread" key={chapter}><div className="library-page library-page-left"><p className="text-xs uppercase tracking-widest text-bronze-dark">Dấu mốc {book.story.year}</p><h2 className="mt-6 text-lg font-semibold leading-snug sm:text-2xl">{book.story.title}</h2><p className="mt-5 text-xs leading-6 text-muted-foreground sm:text-sm">{book.story.description}</p><span className="mt-auto pt-5 text-xs text-muted-foreground">{chapter * 2 + 1}</span></div><div className="library-page library-page-right"><p className="text-xs uppercase tracking-widest text-bronze-dark">Chương {chapter + 1}</p><h3 className="mt-6 text-lg font-semibold leading-7 sm:text-xl">{book.chapters[chapter]}</h3><p className="mt-5 text-xs leading-6 text-muted-foreground sm:text-sm">Vị trí lời giới thiệu chương. Khi build, nội dung và bản thu sẽ lấy từ tập podcast tương ứng.</p><BookOpen size={30} className="mt-6 text-bronze-dark" aria-hidden="true" /><span className="mt-auto self-end pt-5 text-xs text-muted-foreground">{chapter * 2 + 2}</span></div></div>
          <button type="button" className="library-reader-cover" disabled={opened} onClick={() => setOpened(true)} aria-label={`Mở sách ${book.story.title}`}><img src={book.story.image} alt="" className="absolute inset-0 size-full object-cover" /><div className="hl-reader-cover-copy"><span className="text-xs text-paper-deep">{book.story.year}</span><span className="mt-3 block text-xl font-semibold leading-snug">{book.story.title}</span><span className="mt-5 block text-xs text-paper-deep">Chạm để mở sách</span></div></button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3"><Button variant="outline" className="rounded-xl" onClick={() => { setOpened(!opened); setAudioSlot(false); }}>{opened ? "Đóng sách" : "Mở sách"}</Button><Button variant="ghost" size="icon" disabled={!opened || chapter === 0} aria-label="Chương trước" onClick={() => turn(chapter - 1)}><CaretLeft /></Button><span className="text-xs text-muted-foreground" aria-live="polite">Chương {chapter + 1} / {book.chapters.length}</span><Button variant="ghost" size="icon" disabled={!opened || chapter === book.chapters.length - 1} aria-label="Chương sau" onClick={() => turn(chapter + 1)}><CaretRight /></Button></div>
      </div>
      <aside className="space-y-5"><div><h2 className="text-sm font-semibold">Mục lục cuốn sách</h2><ol className="mt-4 space-y-1">{book.chapters.map((title, index) => <li key={index}><Button variant="ghost" className="library-choice h-auto w-full justify-start whitespace-normal py-3 text-left text-sm" aria-pressed={chapter === index} onClick={() => { turn(index); setOpened(true); }}><span className="mr-2 text-xs text-bronze-dark">{index + 1}</span>{title}</Button></li>)}</ol></div>{opened && <Button className="w-full rounded-xl" onClick={() => setAudioSlot(true)}><Headphones aria-hidden="true" /> Nghe chương này</Button>}{audioSlot && <div role="status" className="rounded-xl bg-paper-deep/50 p-5"><p className="text-sm font-medium">Đã chọn chương {chapter + 1}</p><p className="mt-2 text-xs leading-6 text-muted-foreground">Vị trí trình nghe: phát/tạm dừng, tua, tốc độ và lưu tiến độ. Wireframe chưa phát âm thanh.</p><Button disabled variant="outline" size="sm" className="mt-4"><Play aria-hidden="true" /> Bản thu thật ở bước build</Button></div>}</aside>
    </div>
  </DialogContent></Dialog>;
}

export function HistoryLibraryWireframe(): ReactElement {
  const [roomIndex, setRoomIndex] = useState(2);
  const [phase, setPhase] = useState("");
  const [view, setView] = useState<"shelf" | "episodes">("shelf");
  const [reader, setReader] = useState<{ book: PreviewBook; chapter: number; startOpen: boolean } | null>(null);
  const room = rooms[roomIndex];
  const visibleBooks = room.books.filter((book) => !phase || book.phaseId === phase);
  function chooseRoom(index: number): void { setRoomIndex(index); setPhase(""); }
  function jump(id: string): void { document.getElementById(id)?.scrollIntoView({ block: "start" }); }

  return <div className="hl-page h-[100dvh] overflow-y-auto bg-paper text-ink">
    <header className="sticky top-0 z-40 border-b border-line bg-paper/95 px-4 py-3 backdrop-blur-md md:px-7"><div className="flex flex-wrap items-center justify-between gap-3"><div className="flex items-center gap-3"><Button asChild variant="ghost" size="icon"><Link to="/wireframes/history" aria-label="Về các phương án Dòng lịch sử"><ArrowLeft /></Link></Button><div><p className="text-sm font-semibold">Lịch sử × Sách nói</p><p className="text-xs text-muted-foreground">Wireframe kết hợp · hình và nội dung minh họa, chưa có audio thật.</p></div></div><Button asChild variant="outline" size="sm" className="rounded-xl"><Link to="/">Landing hiện tại <ArrowRight aria-hidden="true" /></Link></Button></div></header>

    <main className="px-4 pb-16 pt-9 md:px-7">
      <div className="library-surface relative isolate px-4 py-7 sm:px-7 lg:px-9"><div className="grid gap-8 xl:grid-cols-[184px_minmax(0,1fr)] xl:gap-10">
        <aside className="self-start xl:sticky xl:top-28"><p className="mb-5 text-xs uppercase tracking-[.2em] text-bronze-dark">Thư viện Sử Ký</p><nav aria-label="Mục lục landing trong bản duyệt" className="flex gap-2 overflow-x-auto xl:flex-col"><Button variant="ghost" className="library-choice h-auto justify-start py-3 text-xs xl:whitespace-normal xl:text-left" aria-current="location" onClick={() => jump("hl-library")}><Books aria-hidden="true" /> Thư viện lịch sử</Button><Button variant="ghost" className="library-choice h-auto justify-start py-3 text-xs xl:whitespace-normal xl:text-left" onClick={() => jump("hl-honors")}><Medal aria-hidden="true" /> Thành tựu & vinh danh</Button><Button variant="ghost" className="library-choice h-auto justify-start py-3 text-xs xl:whitespace-normal xl:text-left" onClick={() => jump("hl-calendar")}><CalendarBlank aria-hidden="true" /> Lịch phát hành</Button></nav></aside>

        <div className="min-w-0">
          <section id="hl-library" aria-labelledby="hl-title" className="scroll-mt-28">
            <Badge variant="outline">Thư viện theo dòng lịch sử</Badge><h1 id="hl-title" className="mt-4 max-w-3xl text-3xl font-semibold leading-tight tracking-tight md:text-4xl">Chọn một thời đại.<br className="hidden sm:block" /> Mở một câu chuyện.</h1>
            <div role="group" aria-label="Chọn gian thư viện theo thời kỳ" className="hl-room-nav mt-7">{rooms.map((value, index) => <Button key={value.id} variant="ghost" className="hl-room-choice library-choice" aria-pressed={roomIndex === index} onClick={() => chooseRoom(index)}><img src={value.books[0].story.thumbnailImage} alt="" /><span className="text-left"><span className="block text-sm font-medium">{value.name}</span><span className="mt-1 block text-[11px] font-normal text-bronze-dark">{value.books.map((book) => book.story.year).join(" · ")}</span></span><ArrowRight size={17} className="ml-auto" aria-hidden="true" /></Button>)}</div>

            <div className="hl-room mt-7">
              <div className="hl-room-backdrop" aria-hidden="true" style={{ backgroundImage: `url(${room.books[0].story.image})` }} />
              <div className="relative"><div className="flex flex-wrap items-center justify-between gap-5"><div><p className="text-xs text-bronze-dark">Gian thư viện</p><h2 className="mt-2 text-2xl font-semibold">{room.name}</h2></div><div role="group" aria-label="Cách khám phá bộ sưu tập" className="flex gap-1 rounded-xl bg-paper-soft/80 p-1"><Button size="sm" variant={view === "shelf" ? "secondary" : "ghost"} className="rounded-lg" aria-pressed={view === "shelf"} onClick={() => setView("shelf")}><Books aria-hidden="true" /> Kệ sách</Button><Button size="sm" variant={view === "episodes" ? "secondary" : "ghost"} className="rounded-lg" aria-pressed={view === "episodes"} onClick={() => setView("episodes")}><ListBullets aria-hidden="true" /> Danh sách tập</Button></div></div>
              <div role="group" aria-label="Ngăn kệ theo giai đoạn" className="mt-5 flex flex-wrap gap-2"><Button variant="ghost" size="sm" className="library-choice" aria-pressed={!phase} onClick={() => setPhase("")}>Toàn bộ gian sách</Button>{room.phases.map((value) => <Button key={value.id} variant="ghost" size="sm" className="library-choice" aria-pressed={phase === value.id} onClick={() => setPhase(value.id)}>{value.name}</Button>)}</div>

              {view === "shelf" ? <div className="hl-shelf" key={`${room.id}-${phase}`}>
                {visibleBooks.map((book) => <button key={book.story.id} type="button" className="hl-book group" onClick={() => setReader({ book, chapter: 0, startOpen: false })} aria-label={`Mở sách ${book.story.title}`}><span className="hl-book-object"><img src={book.story.image} alt="" /><span className="hl-book-spine" aria-hidden="true" /><span className="hl-book-cover-title"><span className="text-xs text-paper-deep">{book.story.year}</span><span className="mt-3 block text-lg font-semibold leading-snug sm:text-xl">{book.story.title}</span><span className="mt-5 inline-flex items-center gap-2 text-xs text-paper-deep"><Headphones size={15} aria-hidden="true" /> Sách nói</span></span></span><span className="mt-6 block text-sm font-medium leading-6 group-hover:text-vermilion">{book.story.title}</span><span className="mt-2 block text-xs text-muted-foreground">{room.phases.find((value) => value.id === book.phaseId)?.name} · {book.story.year}</span><span className="mt-4 inline-flex items-center gap-2 text-xs font-medium text-bronze-dark">Mở sách & nghe <ArrowRight size={15} aria-hidden="true" /></span></button>)}
                <div className="hl-shelf-end"><BookOpen size={30} className="text-bronze-dark" aria-hidden="true" /><p className="mt-4 max-w-44 text-sm leading-7 text-muted-foreground">Mỗi cuốn sách mở ra một sự kiện. Mỗi chương là một tập podcast.</p></div>
              </div> : <div className="mt-7 space-y-4">{visibleBooks.map((book) => <details key={book.story.id} open className="hl-chapter-list"><summary className="flex cursor-pointer items-center gap-4 rounded-xl p-4"><img src={book.story.thumbnailImage} alt="" className="h-16 w-12 rounded object-cover" /><span className="min-w-0 flex-1"><span className="block text-sm font-semibold leading-6">{book.story.title}</span><span className="mt-1 block text-xs text-muted-foreground">Sự kiện {book.story.year} · {room.phases.find((value) => value.id === book.phaseId)?.name}</span></span><CaretRight size={19} className="hl-disclosure" aria-hidden="true" /></summary><ol className="divide-y divide-line px-4">{book.chapters.map((title, index) => <li key={index} className="flex items-center gap-3 py-4"><span className="w-5 shrink-0 text-xs text-bronze-dark">{String(index + 1).padStart(2, "0")}</span><span className="flex-1 text-sm leading-6">{title}</span><Button variant="outline" size="icon-sm" className="rounded-lg" aria-label={`Mở chương ${title}`} onClick={() => setReader({ book, chapter: index, startOpen: true })}><Play aria-hidden="true" /></Button></li>)}</ol></details>)}</div>}
              <p className="mt-6 text-xs leading-6 text-muted-foreground">{room.name}{phase ? ` / ${room.phases.find((value) => value.id === phase)?.name}` : ""} <span aria-hidden="true">→</span> chọn sách / sự kiện <span aria-hidden="true">→</span> mở chương để nghe</p>
              </div>
            </div>
          </section>

          <div className="mt-12 grid gap-5 lg:grid-cols-2"><section id="hl-honors" className="scroll-mt-28 border-t border-line pt-6"><h2 className="flex items-center gap-2 text-lg font-semibold"><Medal className="text-bronze-dark" aria-hidden="true" /> Thành tựu & vinh danh</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">Vị trí phần tiếp theo. Nhiệm vụ và thành tích tiếp tục nằm sau thư viện.</p></section><section id="hl-calendar" className="scroll-mt-28 border-t border-line pt-6"><h2 className="flex items-center gap-2 text-lg font-semibold"><CalendarBlank className="text-bronze-dark" aria-hidden="true" /> Lịch phát hành</h2><p className="mt-3 text-sm leading-7 text-muted-foreground">Vị trí lịch lên sóng theo series, không lặp lại danh sách sách hay tập nghe.</p></section></div>
        </div>
      </div></div>
    </main>
    {reader && <CombinedBookReader key={`${reader.book.story.id}-${reader.chapter}`} book={reader.book} initialChapter={reader.chapter} startOpen={reader.startOpen} onClose={() => setReader(null)} />}
  </div>;
}
