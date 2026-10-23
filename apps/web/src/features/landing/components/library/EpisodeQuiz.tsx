import { useRef, useState, type FormEvent, type ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowRight, Brain, Check, CheckCircle, LockKey, Trophy, XCircle } from "@phosphor-icons/react";
import { Link } from "react-router";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { notify } from "@/shared/lib/notifications";
import { libraryService } from "../../services/libraryService";
import { LibraryState } from "./LibraryPrimitives";

type PublicQuiz = Awaited<ReturnType<typeof libraryService.quiz>>;
type QuizAttemptResult = Awaited<ReturnType<typeof libraryService.attempt>>;

interface QuizProgressProps {
  answered: number;
  total: number;
}

function QuizProgress({ answered, total }: QuizProgressProps): ReactElement {
  const percentage = total > 0 ? Math.round((answered / total) * 100) : 0;

  return (
    <div className="space-y-2" aria-label={`Đã trả lời ${answered} trên ${total} câu`}>
      <div className="flex items-center justify-between gap-4 text-xs font-medium text-ink-soft">
        <span>Tiến độ bài làm</span>
        <span>{answered}/{total} câu</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-paper-deep" aria-hidden="true">
        <div className="h-full rounded-full bg-vermilion transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${percentage}%` }} />
      </div>
    </div>
  );
}

interface QuizFormProps {
  quiz: PublicQuiz;
  answers: Record<string, string>;
  signedIn: boolean;
  isSubmitting: boolean;
  onSelect: (questionId: string, optionId: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function QuizForm({ quiz, answers, signedIn, isSubmitting, onSelect, onSubmit }: QuizFormProps): ReactElement {
  const answeredCount = quiz.questions.filter((question) => Boolean(answers[question.id])).length;
  const unansweredCount = quiz.questions.length - answeredCount;
  const complete = unansweredCount === 0;

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-line bg-paper-soft px-5 py-4 sm:px-8">
        <QuizProgress answered={answeredCount} total={quiz.questions.length} />
      </div>

      <div className="overflow-y-auto px-5 sm:px-8">
        {quiz.questions.map((question, index) => (
          <fieldset key={question.id} disabled={isSubmitting} className="border-b border-line py-7 last:border-b-0 sm:py-8">
            <legend className="w-full px-0">
              <span className="flex items-start gap-3">
                <span className="shrink-0 pt-1 font-mono text-xs text-vermilion" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span>
                <span className="pt-1 text-sm font-semibold leading-6 text-ink sm:text-base">{question.text}</span>
              </span>
            </legend>

            <div className="mt-4 grid gap-2.5 sm:grid-cols-2">
              {question.options.map((option) => {
                const selected = answers[question.id] === option.id;
                return (
                  <label
                    key={option.id}
                    className={`group flex min-h-14 cursor-pointer items-center gap-3 border px-3.5 py-3 text-sm leading-6 transition-colors ${selected ? "border-vermilion bg-vermilion/5 text-ink" : "border-line bg-transparent text-ink-soft hover:border-bronze"}`}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      value={option.id}
                      required
                      checked={selected}
                      onChange={() => onSelect(question.id, option.id)}
                      className="sr-only"
                    />
                    <span className={`grid size-7 shrink-0 place-items-center border text-xs font-semibold ${selected ? "border-vermilion bg-vermilion text-paper-soft" : "border-line text-bronze-dark group-hover:border-bronze"}`}>
                      {selected ? <Check size={16} weight="bold" aria-hidden="true" /> : option.label}
                    </span>
                    <span>{option.text}</span>
                  </label>
                );
              })}
            </div>
          </fieldset>
        ))}
      </div>

      <div className="sticky bottom-0 mt-auto flex flex-col gap-3 border-t border-line bg-paper-soft/95 px-5 py-4 backdrop-blur sm:flex-row sm:items-center sm:justify-between sm:px-8">
        <p className="text-xs leading-5 text-ink-soft" aria-live="polite">
          {complete ? "Bạn đã hoàn tất. Sẵn sàng xem kết quả." : `Còn ${unansweredCount} câu chưa trả lời.`}
        </p>
        {signedIn ? (
          <Button type="submit" size="lg" disabled={!complete || isSubmitting} className="min-w-36">
            {isSubmitting ? "Đang chấm bài…" : "Nộp bài"}
            {!isSubmitting && <ArrowRight aria-hidden="true" />}
          </Button>
        ) : (
          <Button asChild size="lg">
            <Link to="/login"><LockKey aria-hidden="true" /> Đăng nhập để nộp bài</Link>
          </Button>
        )}
      </div>
    </form>
  );
}

interface QuizResultProps {
  quiz: PublicQuiz;
  result: QuizAttemptResult;
  onRetry: () => void;
}

function QuizResult({ quiz, result, onRetry }: QuizResultProps): ReactElement {
  const correctCount = result.answers.filter((answer) => answer.isCorrect).length;

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="border-b border-line bg-paper-soft px-5 py-7 sm:px-8">
        <div className="grid gap-5 sm:grid-cols-[auto_minmax(0,1fr)] sm:items-center">
          <div className={`grid size-24 place-items-center border-l-4 ${result.isPassed ? "border-bronze" : "border-vermilion"}`}>
            <div className="text-center">
              <strong className="block text-3xl font-bold leading-none text-ink">{result.scorePercent}%</strong>
              <span className="mt-1 block text-[11px] text-ink-soft">điểm số</span>
            </div>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-bronze-dark">
              {result.isPassed ? <Trophy size={24} weight="fill" aria-hidden="true" /> : <Brain size={24} aria-hidden="true" />}
              <span className="text-xs font-semibold uppercase tracking-[0.16em]">{result.isPassed ? "Hoàn thành thử thách" : "Tiếp tục ôn luyện"}</span>
            </div>
            <h3 className="text-xl font-semibold leading-8 text-ink sm:text-2xl">
              {result.isPassed ? "Bạn đã vượt qua bài quiz" : "Chỉ còn một chút nữa thôi"}
            </h3>
            <p className="mt-2 text-sm leading-6 text-ink-soft">
              Trả lời đúng {correctCount}/{result.answers.length} câu · Nhận <strong className="text-vermilion">+{result.xpAwarded} XP</strong> · Tổng {result.totalXp.toLocaleString("vi-VN")} XP
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-4 px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-semibold text-ink">Xem lại đáp án</h3>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>Làm lại</Button>
        </div>

        {result.answers.map((answer, index) => {
          const question = quiz.questions.find((item) => item.id === answer.questionId);
          const selectedOption = question?.options.find((option) => option.id === answer.selectedOptionId);
          const correctOption = question?.options.find((option) => option.id === answer.correctOptionId);

          return (
            <article key={answer.questionId} className="border-t border-line py-5 first:border-t-0">
              <div className="flex items-start gap-3">
                {answer.isCorrect ? <CheckCircle size={23} weight="fill" className="mt-0.5 shrink-0 text-bronze-dark" aria-label="Trả lời đúng" /> : <XCircle size={23} weight="fill" className="mt-0.5 shrink-0 text-vermilion" aria-label="Trả lời chưa đúng" />}
                <div className="min-w-0">
                  <h4 className="text-sm font-semibold leading-6 text-ink">{index + 1}. {question?.text}</h4>
                  <p className="mt-2 text-sm leading-6 text-ink-soft">Bạn chọn: <span className={answer.isCorrect ? "font-medium text-bronze-dark" : "font-medium text-vermilion"}>{selectedOption?.label}. {selectedOption?.text}</span></p>
                  {!answer.isCorrect && <p className="mt-1 text-sm leading-6 text-ink-soft">Đáp án đúng: <span className="font-medium text-ink">{correctOption?.label}. {correctOption?.text}</span></p>}
                  {answer.explanation && <p className="mt-3 border-l-2 border-bronze pl-3 text-sm leading-6 text-ink-soft">{answer.explanation}</p>}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

export function EpisodeQuiz({ slug, signedIn }: { slug: string; signedIn: boolean }): ReactElement {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const key = useRef(crypto.randomUUID());
  const queryClient = useQueryClient();
  const quiz = useQuery({ queryKey: ["library-quiz", slug], queryFn: ({ signal }) => libraryService.quiz(slug, signal), enabled: open });
  const submit = useMutation({
    mutationFn: async () => {
      if (!quiz.data) throw new Error("Chưa tải được câu hỏi");
      return libraryService.attempt(quiz.data.id, quiz.data.questions.map((question) => ({ questionId: question.id, optionId: answers[question.id] })), key.current);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["library-missions"] });
      void queryClient.invalidateQueries({ queryKey: ["library-honors"] });
    },
    onError: () => notify.error({ title: "Chưa gửi được câu trả lời", description: "Vui lòng thử lại." }),
  });

  const selectAnswer = (questionId: string, optionId: string): void => {
    setAnswers((current) => ({ ...current, [questionId]: optionId }));
    key.current = crypto.randomUUID();
  };

  const retry = (): void => {
    setAnswers({});
    key.current = crypto.randomUUID();
    submit.reset();
  };

  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)} className="group w-full sm:w-auto">
        <Brain aria-hidden="true" /> Bắt đầu thử thách
        <ArrowRight className="transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" aria-hidden="true" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[92dvh] max-w-3xl grid-rows-none flex-col gap-0 overflow-hidden rounded-lg border-bronze/50 bg-paper p-0 sm:p-0">
          <DialogHeader className="shrink-0 bg-night px-5 py-5 pr-16 text-paper-soft sm:px-8 sm:py-6 sm:pr-16">
            <div className="mb-1 text-bronze"><span className="text-[11px] font-semibold tracking-[0.12em]">THỬ TÀI LỊCH SỬ</span></div>
            <DialogTitle className="text-xl text-paper-soft sm:text-2xl">Kiểm tra điều bạn vừa nghe</DialogTitle>
            <DialogDescription className="text-paper-deep">Trả lời câu hỏi để ôn kiến thức và ghi nhận thành tích.</DialogDescription>
          </DialogHeader>

          {quiz.isPending ? (
            <div className="px-5 py-8 sm:px-8"><LibraryState loading /></div>
          ) : quiz.isError ? (
            <div className="px-5 py-8 sm:px-8"><LibraryState error title="Chưa tải được bộ câu hỏi" description="Kết nối có thể đang gián đoạn. Bạn hãy thử lại." retry={() => { void quiz.refetch(); }} /></div>
          ) : submit.data ? (
            <QuizResult quiz={quiz.data} result={submit.data} onRetry={retry} />
          ) : (
            <QuizForm
              quiz={quiz.data}
              answers={answers}
              signedIn={signedIn}
              isSubmitting={submit.isPending}
              onSelect={selectAnswer}
              onSubmit={(event) => { event.preventDefault(); submit.mutate(); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
