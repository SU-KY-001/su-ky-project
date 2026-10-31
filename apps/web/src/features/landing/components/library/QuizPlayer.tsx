import { useEffect, useRef, useState, type ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { ArrowLeft } from "@phosphor-icons/react/dist/icons/ArrowLeft";
import { ArrowRight } from "@phosphor-icons/react/dist/icons/ArrowRight";
import { Clock } from "@phosphor-icons/react/dist/icons/Clock";
import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle";
import { XCircle } from "@phosphor-icons/react/dist/icons/XCircle";
import { Button } from "@/shared/components/ui/button";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { notify } from "@/shared/lib/notifications";
import { libraryService } from "../../services/libraryService";
import { LibraryState } from "./LibraryPrimitives";
import { QuizExplanation } from "./QuizExplanation";

export function QuizPlayer({ slug }: { slug: string }): ReactElement {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string | null>>({});
  const [remaining, setRemaining] = useState<number | null>(null);
  const deadlines = useRef<Record<string, number>>({});
  const [expired, setExpired] = useState<Record<string, boolean>>({});
  const requestKey = useRef(crypto.randomUUID());
  const cache = useQueryClient();
  const user = useCurrentUser();
  const quiz = useQuery({ queryKey: ["library-quiz", slug], queryFn: ({ signal }) => libraryService.quiz(slug, signal) });
  const card = useQuery({ queryKey: ["quiz-card", user.data?.id, slug], queryFn: ({ signal }) => libraryService.quizzes({ episodeSlug: slug }, signal), enabled: Boolean(user.data?.id) });
  const submit = useMutation({
    mutationFn: () => {
      if (!quiz.data) throw new Error("Chưa tải được câu hỏi");
      return libraryService.attempt(quiz.data.id, quiz.data.questions.map(question => ({ questionId: question.id, optionId: answers[question.id] })), requestKey.current);
    },
    onSuccess: () => { void cache.invalidateQueries({ queryKey: ["library-missions"] }); void cache.invalidateQueries({ queryKey: ["library-honors"] }); void cache.invalidateQueries({ queryKey: ["quiz-catalog"] }); void cache.invalidateQueries({ queryKey: ["quiz-card"] }); },
    onError: () => notify.error({ title: "Chưa gửi được bài quiz", description: "Vui lòng thử lại." }),
  });
  useEffect(() => {
    if (!quiz.data || submit.data) return;
    const question = quiz.data.questions[index];
    if (!question?.timeLimit || expired[question.id]) { setRemaining(null); return; }
    const deadline = deadlines.current[question.id] ?? Date.now() + question.timeLimit * 1000;
    deadlines.current[question.id] = deadline;
    const tick = (): void => {
      const seconds = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setRemaining(seconds);
      if (seconds === 0) {
        setExpired(current => ({ ...current, [question.id]: true }));
        setAnswers(current => question.id in current ? current : { ...current, [question.id]: null });
        requestKey.current = crypto.randomUUID();
      }
    };
    tick();
    const timer = window.setInterval(tick, 250);
    return () => window.clearInterval(timer);
  }, [quiz.data, index, expired, submit.data]);
  const info = card.data?.items[0];
  const retry = (): void => { setIndex(0); setAnswers({}); setExpired({}); deadlines.current = {}; requestKey.current = crypto.randomUUID(); submit.reset(); };
  if (quiz.isPending || card.isPending) return <main className="mx-auto min-h-[70vh] max-w-6xl px-5 pt-36"><LibraryState loading /></main>;
  if (quiz.isError || card.isError || !info) return <main className="mx-auto min-h-[70vh] max-w-6xl px-5 pt-36"><LibraryState error title="Chưa mở được quiz" description="Quiz có thể không còn công khai hoặc kết nối đang gián đoạn." retry={() => { void quiz.refetch(); void card.refetch(); }} /></main>;
  if (!quiz.data.questions.length) return <main className="mx-auto min-h-[70vh] max-w-6xl px-5 pt-36"><LibraryState title="Bộ câu hỏi đang được chuẩn bị" /></main>;
  const question = quiz.data.questions[index];
  const result = submit.data;
  const selected = answers[question.id];
  const complete = quiz.data.questions.every(item => item.id in answers);
  return <main className="relative isolate min-h-[80vh] overflow-hidden px-[clamp(20px,4vw,64px)] pb-20 pt-36 text-ink">
    {info.posterUrl && <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[clamp(680px,95vh,1000px)] overflow-hidden [mask-image:linear-gradient(to_bottom,black_40%,transparent_100%)] after:absolute after:inset-0 after:bg-paper/70"><img src={info.posterUrl} alt="" className="absolute inset-0 size-full object-cover object-center saturate-[.7]" /></div>}
    <div className="mx-auto w-full">
      {result ? <>
        <div className="mb-8"><p className="text-sm text-bronze-dark">{info.title}</p><h1 className="mt-2 text-3xl font-bold sm:text-4xl">Hoàn thành bài quiz</h1><p className="mt-3 text-sm text-ink-soft">Xem lại câu trả lời và lời giải của bạn.</p></div>
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_clamp(300px,24vw,400px)]">
          <div className="space-y-3">{result.answers.map((answer, number) => {
            const item = quiz.data.questions.find(q => q.id === answer.questionId);
            if (!item) return null;
            return <article key={answer.questionId} className="rounded-xl border border-line bg-paper-soft p-4 sm:p-6"><div className="grid grid-cols-[24px_minmax(0,1fr)] items-start gap-x-3 gap-y-4">{answer.isCorrect ? <CheckCircle size={24} className="mt-0.5 text-mod-success" weight="fill" aria-label="Đúng" /> : <XCircle size={24} className="mt-0.5 text-vermilion" weight="fill" aria-label="Sai" />}<h2 className="min-w-0 text-base font-semibold leading-7 [overflow-wrap:anywhere]">Câu {number + 1}. {item.text}</h2><div className="col-start-2 min-w-0">{answer.selectedOptionId === null && <p className="mb-3 text-sm text-vermilion">Chưa chọn đáp án</p>}<ul className="space-y-2">{item.options.map(option => {
              const correct = option.id === answer.correctOptionId;
              const selected = option.id === answer.selectedOptionId;
              return <li key={option.id} className={`flex flex-wrap items-center gap-x-2 gap-y-1 text-sm leading-6 [overflow-wrap:anywhere] ${correct ? "font-semibold text-mod-success" : selected ? "font-semibold text-vermilion" : "text-ink-soft"}`}><span>{option.label}. {option.text}</span>{correct && <span className="rounded-full bg-mod-success/10 px-2 py-0.5 text-xs font-semibold text-mod-success">Đáp án đúng</span>}{selected && <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${correct ? "bg-mod-success/10 text-mod-success" : "bg-vermilion/10 text-vermilion"}`}>Bạn chọn</span>}</li>;
            })}</ul>{answer.explanation && <QuizExplanation text={answer.explanation} />}</div></div></article>;
          })}</div>
          <aside className="h-fit rounded-xl border border-line bg-paper-soft p-6"><p className="text-sm font-semibold">Kết quả của bạn</p><p className="mt-5 text-5xl font-bold text-vermilion">{result.answers.filter(answer => answer.isCorrect).length} / {result.answers.length}</p><p className="mt-2 text-2xl font-semibold">{result.scorePercent}%</p><p className="mt-4 text-sm text-ink-soft">{result.isPassed ? "Đã vượt qua" : "Chưa đạt điểm qua"} · +{result.xpAwarded} XP</p><Button className="mt-6 w-full" onClick={retry}>Làm lại</Button><Button asChild variant="outline" className="mt-3 w-full"><Link to="/#library-quiz">Về danh sách</Link></Button><Button asChild variant="link" className="mt-4 h-auto px-0"><Link to={`/series/${encodeURIComponent(info.seriesSlug)}?episode=${encodeURIComponent(info.episodeSlug)}`}>Nghe podcast liên quan <ArrowRight /></Link></Button></aside>
        </div>
      </> : <>
        <div className="mb-7"><p className="text-sm text-ink-soft">{info.title}</p><h1 className="mt-2 text-3xl font-bold">Ôn tập kiến thức</h1></div>
        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_clamp(300px,24vw,400px)]">
          <section className="order-2 lg:order-1"><div className="mb-6 flex items-center gap-4"><span className="shrink-0 text-sm font-semibold text-vermilion">Câu {index + 1} / {quiz.data.questions.length}</span><div className="h-2 flex-1 overflow-hidden rounded-full bg-paper-deep" role="progressbar" aria-label="Tiến độ bài quiz" aria-valuemin={0} aria-valuemax={quiz.data.questions.length} aria-valuenow={index + 1}><div className="h-full bg-vermilion" style={{ width: `${(index + 1) / quiz.data.questions.length * 100}%` }} /></div></div>
            {question.timeLimit && !expired[question.id] && remaining === 10 && <span role="status" className="sr-only">Còn 10 giây để trả lời câu hỏi.</span>}
            {expired[question.id] && <p role="status" className="mb-4 text-sm text-ink-soft">{selected ? "Đáp án đã được giữ lại." : "Bạn chưa chọn đáp án; câu này được tính là chưa trả lời."}</p>}
            <fieldset disabled={submit.isPending || expired[question.id]}><legend className="mb-6 text-xl font-semibold leading-8 sm:text-2xl">{question.text}</legend><div className="grid gap-3">{question.options.map(option => <label key={option.id} className={`flex min-h-16 cursor-pointer items-center gap-4 rounded-xl border px-5 py-4 text-sm ${selected === option.id ? "border-vermilion bg-vermilion/5 text-ink" : "border-line bg-paper-soft text-ink-soft"}`}><input type="radio" name={question.id} value={option.id} checked={selected === option.id} onChange={() => { setAnswers(current => ({ ...current, [question.id]: option.id })); requestKey.current = crypto.randomUUID(); }} className="size-5 accent-vermilion" /><span>{option.label}. {option.text}</span></label>)}</div></fieldset>
            <div className="mt-7 flex justify-between gap-3"><Button variant="outline" disabled={index === 0 || submit.isPending} onClick={() => setIndex(value => value - 1)}><ArrowLeft /> Câu trước</Button>{index < quiz.data.questions.length - 1 ? <Button disabled={!(question.id in answers) || submit.isPending} onClick={() => setIndex(value => value + 1)}>Câu tiếp theo <ArrowRight /></Button> : <Button disabled={!complete || submit.isPending} onClick={() => submit.mutate()}>{submit.isPending ? "Đang chấm bài…" : "Nộp bài"}</Button>}</div>
          </section>
          <aside className="order-1 flex h-fit flex-col rounded-xl border border-line bg-paper-soft p-5 lg:order-2">{info.posterUrl && <img src={info.posterUrl} alt="" className="mb-4 aspect-video w-full rounded-lg object-cover" />}<h2 className="font-semibold">{info.title}</h2><p className="mt-2 text-sm text-ink-soft">{info.episodeTitle} · {info.seriesTitle}</p><p className="mt-4 text-sm text-ink-soft">{Object.values(answers).filter(answer => answer !== null).length} / {quiz.data.questions.length} câu đã trả lời</p>{question.timeLimit && <div role="timer" aria-label="Thời gian còn lại của câu hỏi" className={`order-first mb-4 flex items-center gap-3 rounded-lg border p-3 lg:order-none lg:mb-0 lg:mt-4 ${expired[question.id] || (remaining ?? question.timeLimit) <= 10 ? "border-vermilion bg-vermilion/10 text-vermilion" : "border-line bg-paper text-ink"}`}><Clock size={22} weight="bold" aria-hidden="true" /><span className="flex-1 text-sm font-medium">{expired[question.id] ? "Đã hết thời gian" : "Thời gian còn lại"}</span>{!expired[question.id] && <span className="text-xl font-bold tabular-nums">{Math.floor((remaining ?? question.timeLimit) / 60)}:{String((remaining ?? question.timeLimit) % 60).padStart(2, "0")}</span>}</div>}</aside>
        </div>
      </>}
    </div>
  </main>;
}
