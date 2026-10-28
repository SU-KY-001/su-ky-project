import { useState, type ReactElement } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import type { z } from "zod";
import { PublicQuizCardSchema } from "@repo/shared";
import { Headphones } from "@phosphor-icons/react/dist/icons/Headphones";
import { Image } from "@phosphor-icons/react/dist/icons/Image";
import { Button } from "@/shared/components/ui/button";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { usePodcastAccess } from "../../hooks/usePodcastAccess";
import { libraryService } from "../../services/libraryService";
import { LibraryState } from "./LibraryPrimitives";
import { QuizCompletionBadge } from "./QuizCompletionBadge";

function QuizCard({ quiz, onStart }: { quiz: z.infer<typeof PublicQuizCardSchema>; onStart: () => void }): ReactElement {
  const [failedImage, setFailedImage] = useState(false);
  return <article className="flex min-w-0 flex-col overflow-hidden rounded-xl border border-line bg-paper-soft">
    <div className="relative aspect-video shrink-0 overflow-hidden bg-paper-deep">{quiz.posterUrl && !failedImage ? <img src={quiz.posterUrl} alt="" loading="lazy" className="absolute inset-0 size-full object-cover" onError={() => setFailedImage(true)} /> : <div className="absolute inset-0 grid place-items-center text-bronze-dark"><Image size={40} aria-hidden="true" /></div>}<span className="absolute right-3 top-3 rounded-full bg-paper-soft px-3 py-1.5 text-xs text-ink">{quiz.plays} lượt chơi</span></div>
    <div className="flex flex-1 flex-col p-4"><h4 className="text-base font-semibold leading-6">{quiz.title}</h4><p className="mt-2 flex items-center gap-2 text-xs text-ink-soft"><Headphones aria-hidden="true" /> {quiz.seriesTitle}</p><p className="mt-3 line-clamp-3 text-sm leading-6 text-ink-soft">{quiz.description || quiz.episodeTitle}</p><p className="mt-auto pt-5 text-xs text-ink-soft">{quiz.questionCount} câu hỏi · {quiz.episodeTitle}</p>{quiz.hasCompleted !== null && <div className="mt-3"><QuizCompletionBadge completed={quiz.hasCompleted} /></div>}<Button className="mt-4 w-full" onClick={onStart}>{quiz.hasCompleted ? "Làm lại" : "Bắt đầu"}</Button></div>
  </article>;
}

export function LibraryQuiz(): ReactElement {
  const [topic, setTopic] = useState("all");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();
  const user = useCurrentUser();
  const { requestAccess, accessDialog } = usePodcastAccess("quiz");
  const topics = useQuery({ queryKey: ["quiz-topics"], queryFn: ({ signal }) => libraryService.topics(signal) });
  const quizzes = useQuery({ queryKey: ["quiz-catalog", user.data?.id ?? "guest", topic, page], queryFn: ({ signal }) => libraryService.quizzes({ page, topicId: topic === "all" ? undefined : topic }, signal), enabled: !user.isPending });

  return <div className="min-w-0">{accessDialog}
    <div className="mb-7 flex flex-col items-start justify-between gap-7 md:flex-row md:items-end">
      <div><p className="mb-2 text-xs font-semibold uppercase tracking-widest text-vermilion">Học bằng thử thách</p><h3 className="text-2xl font-bold tracking-tight sm:text-3xl">Chọn một bộ quiz để bắt đầu</h3><p className="mt-2 text-sm leading-7 text-ink-soft">Ôn tập kiến thức qua những câu chuyện trong podcast.</p></div>
      <div className="w-full max-w-60"><label htmlFor="quiz-topic-select" className="mb-2 block text-xs font-semibold text-ink-soft">Lọc theo chủ đề</label><Select value={topic} onValueChange={value => { setTopic(value); setPage(1); }}><SelectTrigger id="quiz-topic-select" className="w-full border-line bg-paper-soft"><SelectValue /></SelectTrigger><SelectContent className="border-line bg-paper-soft text-ink"><SelectItem value="all">Tất cả chủ đề</SelectItem>{topics.data?.items.map(item => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}</SelectContent></Select>{topics.isError && <p className="mt-2 text-xs text-ink-soft">Chưa tải được chủ đề.</p>}</div>
    </div>
    {quizzes.isPending ? <LibraryState loading /> : quizzes.isError ? <LibraryState error title="Chưa tải được danh sách quiz" retry={() => { void quizzes.refetch(); }} /> : quizzes.data.items.length === 0 ? <LibraryState title="Chưa có quiz phù hợp" description="Hãy quay lại sau hoặc chọn chủ đề khác." /> : <>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{quizzes.data.items.map(quiz => <QuizCard key={`${quiz.id}-${quiz.posterUrl}`} quiz={quiz} onStart={() => { void (async () => { if (await requestAccess()) navigate(`/quiz/${encodeURIComponent(quiz.episodeSlug)}`); })(); }} />)}</div>
      {quizzes.data.total > quizzes.data.limit && <div className="mt-6 flex items-center justify-center gap-4"><Button variant="outline" disabled={page === 1} onClick={() => setPage(value => value - 1)}>Trang trước</Button><span className="text-sm text-ink-soft">Trang {page}</span><Button variant="outline" disabled={page * quizzes.data.limit >= quizzes.data.total} onClick={() => setPage(value => value + 1)}>Trang sau</Button></div>}
    </>}
  </div>;
}
