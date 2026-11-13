import { useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import type { LibrarySeries } from "@repo/shared";
import { BookOpen } from "@phosphor-icons/react/dist/icons/BookOpen";
import { CaretLeft } from "@phosphor-icons/react/dist/icons/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/dist/icons/CaretRight";
import { Headphones } from "@phosphor-icons/react/dist/icons/Headphones";
import { X } from "@phosphor-icons/react/dist/icons/X";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";
import { libraryService } from "../../services/libraryService";
import { LibrarySelect, LibraryState } from "./LibraryPrimitives";
import { PodcastPlayer } from "./PodcastPlayer";

export function BookReader({ book, onClose }: { book: LibrarySeries; onClose: () => void }): ReactElement {
  const [opened, setOpened] = useState(false);
  const [page, setPage] = useState(0);
  const [listening, setListening] = useState(false);
  const detail = useQuery({ queryKey: ["library-series", book.slug], queryFn: ({ signal }) => libraryService.seriesDetail(book.slug, signal) });
  const chapter = detail.data?.episodes[page];
  const episode = useQuery({ queryKey: ["library-episode", chapter?.slug], queryFn: ({ signal }) => libraryService.episode(chapter!.slug, signal), enabled: Boolean(chapter) });
  function turn(index: number): void { setPage(index); setListening(false); }
  return <Dialog open onOpenChange={(value) => { if (!value) onClose(); }}><DialogContent showCloseButton={false} className="library-reader inset-0 left-0 top-0 flex h-[100dvh] w-full max-w-none translate-x-0 translate-y-0 flex-col overflow-y-auto rounded-none border-0 bg-paper p-4 text-ink sm:p-7">
    <header className="flex items-start justify-between gap-4"><div className="min-w-0"><DialogTitle className="pr-2 text-lg sm:text-xl">{book.title}</DialogTitle><DialogDescription>Mỗi tập là một chương. Mở sách, chọn chương và lắng nghe.</DialogDescription></div><DialogClose asChild><Button variant="outline" className="shrink-0"><X aria-hidden="true" /> Thoát sách</Button></DialogClose></header>
    <div className="mx-auto flex w-full max-w-[1280px] flex-1 flex-col justify-center gap-8 py-7 lg:flex-row lg:items-center lg:gap-12">
      <div className="flex min-w-0 flex-1 flex-col items-center gap-7">
        <div className="group relative aspect-[.95] w-full max-w-[730px] [perspective:1800px] sm:aspect-[1.4]" data-open={opened}>
          <div className="grid min-h-full grid-cols-2 rounded-[4px_9px_9px_4px] bg-paper-soft shadow-[0_20px_45px_-30px_var(--color-ink)] group-data-[open=false]:[clip-path:inset(0_0_0_50%)]" key={page}>
            <div className="flex max-h-[55dvh] min-h-full min-w-0 flex-col overflow-y-auto border border-r-0 border-line bg-gradient-to-l from-paper-deep to-transparent to-[12%] p-[13px] sm:max-h-[65dvh] sm:p-[clamp(16px,3vw,36px)]"><span className="text-xs uppercase tracking-widest text-bronze-dark">{detail.data?.historicalEvent?.name ?? "Thư viện Sử Ký"}</span><BookOpen size={30} className="my-5 text-bronze-dark" aria-hidden="true" /><h2 className="text-lg font-semibold leading-snug sm:text-2xl">{chapter?.title ?? book.title}</h2><p className="mt-5 text-xs leading-6 text-muted-foreground sm:text-sm">{book.description ?? "Khám phá câu chuyện qua các chương và bản kể."}</p><span className="mt-auto pt-6 text-xs text-muted-foreground">{page * 2 + 1}</span></div>
            <div className="library-page-turn flex max-h-[55dvh] min-h-full min-w-0 origin-left flex-col overflow-y-auto border border-line bg-gradient-to-r from-paper-deep to-transparent to-[8%] p-[13px] sm:max-h-[65dvh] sm:p-[clamp(16px,3vw,36px)]"><p className="mb-5 text-xs uppercase tracking-widest text-bronze-dark">Giới thiệu chương</p>{episode.isPending ? <p className="text-sm text-muted-foreground">Đang mở nội dung…</p> : episode.isError ? <div><p role="alert" className="text-sm text-muted-foreground">Chưa tải được giới thiệu chương.</p><Button variant="link" onClick={() => { void episode.refetch(); }}>Thử lại</Button></div> : <p className="whitespace-pre-line text-xs leading-6 text-ink-soft sm:text-sm">{episode.data?.description || "Chương này chưa có phần giới thiệu. Bạn có thể nghe nội dung qua bản thu."}</p>}<span className="mt-auto self-end pt-6 text-xs text-muted-foreground">{page * 2 + 2}</span></div>
          </div>
          <button type="button" className="absolute inset-y-0 right-0 left-1/2 flex origin-left flex-col items-center justify-center gap-3.5 overflow-hidden rounded-r-lg border-l-8 border-bronze-dark bg-paper-deep shadow-[8px_8px_0_-3px_var(--color-line)] [backface-visibility:hidden] [transform:rotateY(-8deg)] transition-transform duration-[900ms] group-data-[open=true]:pointer-events-none group-data-[open=true]:[transform:rotateY(-179deg)] motion-reduce:transition-none sm:gap-6" onClick={() => setOpened(true)} disabled={opened} aria-label={`Mở sách ${book.title}`}>
            {book.cover ? <img src={book.cover.url} alt="" className="absolute inset-0 size-full rounded-r-lg object-cover" /> : <><BookOpen size={42} aria-hidden="true" /><span className="px-6 text-center text-xl font-semibold sm:text-3xl">{book.title}</span></>}
            <span className="relative mt-auto w-full bg-ink/80 px-3 py-4 text-center text-sm text-paper-soft">Chạm để mở sách</span>
          </button>
        </div>
        <div className="flex flex-wrap items-center justify-center gap-3"><Button variant="outline" onClick={() => { setOpened(!opened); setListening(false); }}>{opened ? "Đóng sách" : "Mở sách"}</Button><Button variant="ghost" size="icon" disabled={!opened || page === 0} onClick={() => turn(page - 1)} aria-label="Chương trước"><CaretLeft /></Button><span aria-live="polite" className="text-xs text-muted-foreground">Chương {chapter ? page + 1 : 0} / {detail.data?.episodes.length ?? 0}</span><Button variant="ghost" size="icon" disabled={!opened || !detail.data || page >= detail.data.episodes.length - 1} onClick={() => turn(page + 1)} aria-label="Chương sau"><CaretRight /></Button></div>
      </div>
      <aside className="w-full space-y-6 lg:w-80 lg:shrink-0">
        {detail.isPending ? <LibraryState loading /> : detail.isError ? <LibraryState error retry={() => { void detail.refetch(); }} /> : detail.data.episodes.length === 0 ? <LibraryState title="Chưa có chương được phát hành" /> : <><LibrarySelect id="reader-chapter" label="Mục lục sách" value={chapter?.id ?? ""} allLabel="Chọn chương" options={detail.data.episodes.map((value, index) => ({ id: value.id, name: `${index + 1}. ${value.title}` }))} onChange={(value) => { const index = detail.data.episodes.findIndex((item) => item.id === value); if (index >= 0) { turn(index); setOpened(true); } }} />{chapter && opened && (listening ? <PodcastPlayer key={chapter.id} chapter={chapter} /> : <Button className="w-full" onClick={() => setListening(true)}><Headphones aria-hidden="true" /> Nghe chương này</Button>)}<p className="text-xs leading-6 text-muted-foreground">Phần chữ hiển thị giới thiệu chương. Giọng đọc phát từ bản thu của từng tập podcast.</p></>}
      </aside>
    </div>
  </DialogContent></Dialog>;
}
