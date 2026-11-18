import { useEffect, useRef, useState, type ReactElement } from "react";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router";
import type { z } from "zod";
import { PublicQuizCardSchema } from "@repo/shared";
import { CaretLeft } from "@phosphor-icons/react/dist/icons/CaretLeft";
import { CaretRight } from "@phosphor-icons/react/dist/icons/CaretRight";
import { Headphones } from "@phosphor-icons/react/dist/icons/Headphones";
import { Image } from "@phosphor-icons/react/dist/icons/Image";
import { Button } from "@/shared/components/ui/button";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { usePodcastAccess } from "../../hooks/usePodcastAccess";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { libraryService } from "../../services/libraryService";
import { LibrarySelect, LibraryState } from "./LibraryPrimitives";
import { QuizCompletionBadge } from "./QuizCompletionBadge";

/** Fraction of the visible width scrolled per arrow click, so the last visible card stays as context. */
const PAGE_RATIO = 0.85;

function QuizCard({ quiz, onStart }: { quiz: z.infer<typeof PublicQuizCardSchema>; onStart: () => void }): ReactElement {
  const [failedImage, setFailedImage] = useState(false);
  return <article className="flex h-full min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-paper-soft">
    <div className="relative aspect-video shrink-0 overflow-hidden bg-paper-deep">{quiz.posterUrl && !failedImage ? <img src={quiz.posterUrl} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" onError={() => setFailedImage(true)} /> : <div className="absolute inset-0 grid place-items-center text-bronze-dark"><Image size={40} aria-hidden="true" /></div>}<span className="absolute right-3 top-3 rounded-full bg-paper-soft px-3 py-1.5 text-xs text-ink">{quiz.plays} lượt chơi</span></div>
    <div className="flex flex-1 flex-col p-4"><h4 className="text-base font-semibold leading-6">{quiz.title}</h4><p className="mt-2 flex items-center gap-2 text-xs text-ink-soft"><Headphones aria-hidden="true" /> {quiz.seriesTitle}</p><p className="mt-3 line-clamp-3 text-sm leading-6 text-ink-soft">{quiz.description || quiz.episodeTitle}</p><p className="mt-auto pt-5 text-xs text-ink-soft">{quiz.questionCount} câu hỏi · {quiz.episodeTitle}</p>{quiz.hasCompleted !== null && <div className="mt-3"><QuizCompletionBadge completed={quiz.hasCompleted} /></div>}<Button className="mt-4 w-full" onClick={onStart}>{quiz.hasCompleted ? "Làm lại" : "Bắt đầu"}</Button></div>
  </article>;
}

export function LibraryQuiz(): ReactElement {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const topic = searchParams.get("quizTopic") ?? "";
  const seriesSlug = searchParams.get("quizSeries") ?? "";
  const episodeSlug = searchParams.get("quizEpisode") || undefined;
  const user = useCurrentUser();
  const reducedMotion = useReducedMotion();
  const { requestAccess, accessDialog } = usePodcastAccess("quiz");
  const rail = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const topics = useQuery({ queryKey: ["quiz-topics"], queryFn: ({ signal }) => libraryService.topics(signal) });
  const seriesOptions = useQuery({ queryKey: ["quiz-series-options"], queryFn: ({ signal }) => libraryService.series({ page: 1, limit: 50 }, signal), staleTime: 300000 });
  const episodes = useQuery({ queryKey: ["library-series", seriesSlug], queryFn: ({ signal }) => libraryService.seriesDetail(seriesSlug, signal), enabled: Boolean(seriesSlug), staleTime: 60000 });
  const quizzes = useInfiniteQuery({
    queryKey: ["quiz-catalog", user.data?.id ?? "guest", topic, seriesSlug, episodeSlug],
    initialPageParam: 1,
    queryFn: ({ pageParam, signal }) => libraryService.quizzes({ page: pageParam, topicId: episodeSlug || !topic ? undefined : topic, seriesSlug: seriesSlug || undefined, episodeSlug }, signal),
    getNextPageParam: page => page.page * page.limit < page.total ? page.page + 1 : undefined,
    enabled: !user.isPending,
  });
  const items = quizzes.data?.pages.flatMap(page => page.items) ?? [];

  useEffect(() => {
    rail.current?.scrollTo({ left: 0 });
  }, [topic, seriesSlug, episodeSlug]);

  useEffect(() => {
    const element = rail.current;
    if (!element) return;
    const update = (): void => {
      const style = window.getComputedStyle(element);
      const startInset = Number.parseFloat(style.paddingLeft) || 0;
      const endInset = Number.parseFloat(style.paddingRight) || 0;
      setEdges({ start: element.scrollLeft <= startInset + 2, end: element.scrollLeft + element.clientWidth >= element.scrollWidth - endInset - 2 });
    };
    const observer = new ResizeObserver(update);
    observer.observe(element);
    element.addEventListener("scroll", update, { passive: true });
    update();
    return () => { observer.disconnect(); element.removeEventListener("scroll", update); };
  }, [items.length]);

  function move(direction: 1 | -1): void { if (rail.current) rail.current.scrollBy({ left: direction * rail.current.clientWidth * PAGE_RATIO, behavior: reducedMotion ? "auto" : "smooth" }); }
  function apply(updates: Record<string, string>): void {
    const next = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(updates)) { if (value) next.set(key, value); else next.delete(key); }
    setSearchParams(next, { replace: true, preventScrollReset: true });
  }
  function chooseTopic(value: string): void { apply({ quizTopic: value, quizSeries: "", quizEpisode: "" }); }
  function chooseSeries(value: string): void { apply({ quizSeries: value, quizEpisode: "" }); }
  function chooseEpisode(value: string): void { apply({ quizEpisode: value }); }

  return <div className="min-w-0">{accessDialog}
    <div className="mb-7 flex flex-col items-start justify-between gap-7 md:flex-row md:items-end">
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-vermilion">Học bằng thử thách</p><h3 className="text-2xl font-bold tracking-tight sm:text-3xl">Chọn một bộ quiz để bắt đầu</h3><p className="mt-2 text-sm leading-7 text-ink-soft">Ôn tập kiến thức qua những câu chuyện trong podcast.</p></div>
      <div className="flex w-full flex-wrap items-end gap-4 md:w-auto md:justify-end">
        <div className="w-full sm:w-52"><LibrarySelect id="quiz-topic-select" label="Lọc theo chủ đề" value={topic} onChange={chooseTopic} options={topics.data?.items ?? []} allLabel="Tất cả chủ đề" /></div>
        <div className="w-full sm:w-56"><LibrarySelect id="quiz-series-select" label="Lọc theo series" value={seriesSlug} onChange={chooseSeries} options={(seriesOptions.data?.items ?? []).map(item => ({ id: item.slug, name: item.title }))} disabled={seriesOptions.isPending} allLabel="Tất cả series" /></div>
        {seriesSlug && <div className="w-full sm:w-56"><LibrarySelect id="quiz-episode-select" label="Lọc theo tập podcast" value={episodeSlug ?? ""} onChange={chooseEpisode} options={(episodes.data?.episodes ?? []).map(item => ({ id: item.slug, name: item.title }))} disabled={episodes.isPending} allLabel="Tất cả tập" /></div>}
      </div>
    </div>
    {(topics.isError || seriesOptions.isError) && <p className="mb-4 text-xs text-ink-soft">Chưa tải được bộ lọc.</p>}
    {episodeSlug && <div className="mb-5 flex flex-wrap items-center gap-3 text-sm text-ink-soft"><span>Quiz của tập: {items[0]?.episodeTitle ?? "đang chọn"}</span><Button variant="link" size="sm" onClick={() => chooseEpisode("")}>Xem tất cả quiz</Button></div>}
    {quizzes.isPending ? <LibraryState loading /> : quizzes.isError ? <LibraryState error title="Chưa tải được danh sách quiz" retry={() => { void quizzes.refetch(); }} /> : items.length === 0 ? <LibraryState title="Chưa có quiz phù hợp" description="Hãy quay lại sau hoặc chọn bộ lọc khác." /> : <>
      <div className="relative min-w-0">
        <ul id="quiz-rail" ref={rail} className="flex snap-x snap-proximity gap-4 overflow-x-auto overscroll-x-contain scroll-smooth px-1 pb-3.5 pt-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden motion-reduce:scroll-auto" aria-label="Danh sách quiz">{items.map(quiz => <li key={`${quiz.id}-${quiz.posterUrl}`} className="min-w-0 flex-[0_0_86%] snap-start sm:flex-[0_0_18rem] lg:flex-[0_0_20rem]"><QuizCard quiz={quiz} onStart={() => { void (async () => { if (await requestAccess()) navigate(`/quiz/${encodeURIComponent(quiz.episodeSlug)}`); })(); }} /></li>)}</ul>
        {!edges.start && <Button size="icon" variant="outline" className="absolute left-0 top-1/3 z-[3] size-11 -translate-y-1/2 rounded-full border-line bg-paper-soft text-ink shadow-lg hover:bg-paper-deep" aria-controls="quiz-rail" aria-label="Quiz trước" onClick={() => move(-1)}><CaretLeft weight="bold" /></Button>}
        {!edges.end && <Button size="icon" variant="outline" className="absolute right-0 top-1/3 z-[3] size-11 -translate-y-1/2 rounded-full border-line bg-paper-soft text-ink shadow-lg hover:bg-paper-deep" aria-controls="quiz-rail" aria-label="Quiz tiếp theo" onClick={() => move(1)}><CaretRight weight="bold" /></Button>}
      </div>
      {quizzes.isFetchNextPageError && <p role="alert" className="mt-6 text-sm text-destructive">Chưa tải thêm được quiz. Bạn có thể thử lại.</p>}
      {quizzes.hasNextPage && <div className="mt-9 flex justify-center"><Button variant="outline" disabled={quizzes.isFetchingNextPage} onClick={() => { void quizzes.fetchNextPage(); }}>{quizzes.isFetchingNextPage ? "Đang tải…" : quizzes.isFetchNextPageError ? "Thử tải thêm quiz" : "Tải thêm quiz"}</Button></div>}
    </>}
  </div>;
}
