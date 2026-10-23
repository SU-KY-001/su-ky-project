import { useRef, useState, type FormEvent, type ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, Brain, Check, CheckCircle, LockKey, Trophy, XCircle } from "@phosphor-icons/react";
import { Link } from "react-router";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { notify } from "@/shared/lib/notifications";
import { libraryService } from "../../services/libraryService";
import { LibraryState } from "./LibraryPrimitives";

type PublicQuiz = Awaited<ReturnType<typeof libraryService.quiz>>;
type QuizAttemptResult = Awaited<ReturnType<typeof libraryService.attempt>>;

interface QuizFormProps {
  quiz: PublicQuiz;
  currentIndex: number;
  answers: Record<string, string>;
  signedIn: boolean;
  isSubmitting: boolean;
  onSelect: (questionId: string, optionId: string) => void;
  onPrevious: () => void;
  onNext: () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

function QuizForm({ quiz, currentIndex, answers, signedIn, isSubmitting, onSelect, onPrevious, onNext, onSubmit }: QuizFormProps): ReactElement {
  const question = quiz.questions[currentIndex];
  const selectedOptionId = answers[question.id];
  const isLastQuestion = currentIndex === quiz.questions.length - 1;
  const progress = Math.round(((currentIndex + 1) / quiz.questions.length) * 100);

  return (
    <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-line px-5 py-4 sm:px-8">
        <div className="mb-3 flex items-center justify-between gap-4">
          <span className="text-xs font-medium text-ink-soft">Câu {currentIndex + 1} / {quiz.questions.length}</span>
          <span className="text-xs text-ink-soft">{progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-paper-deep" role="progressbar" aria-label="Tiến độ bài quiz" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
          <div className="h-full rounded-full bg-vermilion transition-[width] duration-300 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <fieldset disabled={isSubmitting} className="min-h-0 flex-1 overflow-y-auto px-5 py-7 sm:px-8 sm:py-9">
        <legend className="sr-only">Câu {currentIndex + 1}: {question.text}</legend>
        <Badge variant="outline" className="border-line bg-paper-soft text-ink-soft">Chọn một đáp án</Badge>
        <h3 className="mt-4 max-w-2xl text-xl font-semibold leading-8 text-ink sm:text-2xl">{question.text}</h3>

        <div className="mt-7 grid gap-3">
          {question.options.map((option) => {
            const selected = selectedOptionId === option.id;
            return (
              <label
                key={option.id}
                className={`group flex min-h-16 cursor-pointer items-center gap-4 rounded-lg border px-4 py-3.5 text-sm leading-6 transition-colors ${selected ? "border-vermilion bg-vermilion/5 text-ink" : "border-line bg-paper-soft text-ink-soft hover:border-bronze hover:text-ink"}`}
              >
                <input
                  type="radio"
                  name={question.id}
                  value={option.id}
                  checked={selected}
                  onChange={() => onSelect(question.id, option.id)}
                  className="sr-only"
                />
                <span className={`grid size-8 shrink-0 place-items-center rounded-md border text-xs font-semibold ${selected ? "border-vermilion bg-vermilion text-paper-soft" : "border-line bg-paper text-ink-soft group-hover:border-bronze"}`}>
                  {selected ? <Check size={16} weight="bold" aria-hidden="true" /> : option.label}
                </span>
                <span>{option.text}</span>
              </label>
            );
          })}
        </div>
      </fieldset>

      <div className="flex items-center justify-between gap-3 border-t border-line bg-paper-soft px-5 py-4 sm:px-8">
        <Button type="button" variant="ghost" onClick={onPrevious} disabled={currentIndex === 0 || isSubmitting}>
          <ArrowLeft aria-hidden="true" /> Câu trước
        </Button>

        {!isLastQuestion ? (
          <Button type="button" onClick={onNext} disabled={!selectedOptionId || isSubmitting}>
            Câu tiếp theo <ArrowRight aria-hidden="true" />
          </Button>
        ) : signedIn ? (
          <Button type="submit" disabled={!selectedOptionId || isSubmitting}>
            {isSubmitting ? "Đang chấm bài…" : "Nộp bài"}
            {!isSubmitting && <ArrowRight aria-hidden="true" />}
          </Button>
        ) : (
          <Button asChild>
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
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <div className="min-w-28 border-l-4 border-vermilion pl-4">
            <strong className="block text-4xl font-bold leading-none text-ink">{result.scorePercent}%</strong>
            <span className="mt-2 block text-xs text-ink-soft">{correctCount}/{result.answers.length} câu đúng</span>
          </div>
          <div>
            <div className="mb-2 flex items-center gap-2 text-bronze-dark">
              {result.isPassed ? <Trophy size={21} weight="fill" aria-hidden="true" /> : <Brain size={21} aria-hidden="true" />}
              <span className="text-xs font-medium">{result.isPassed ? "Đã vượt qua" : "Chưa đạt điểm qua"}</span>
            </div>
            <h3 className="text-xl font-semibold leading-8 text-ink">{result.isPassed ? "Hoàn thành bài quiz" : "Bạn có thể thử lại"}</h3>
            <p className="mt-1 text-sm leading-6 text-ink-soft">+{result.xpAwarded} XP · Tổng {result.totalXp.toLocaleString("vi-VN")} XP</p>
          </div>
        </div>
      </div>

      <div className="px-5 py-6 sm:px-8">
        <div className="flex items-center justify-between gap-4">
          <h3 className="font-semibold text-ink">Đáp án và lời giải</h3>
          <Button type="button" variant="outline" size="sm" onClick={onRetry}>Làm lại</Button>
        </div>

        <div className="mt-4">
          {result.answers.map((answer, index) => {
            const question = quiz.questions.find((item) => item.id === answer.questionId);
            const selectedOption = question?.options.find((option) => option.id === answer.selectedOptionId);
            const correctOption = question?.options.find((option) => option.id === answer.correctOptionId);

            return (
              <article key={answer.questionId} className="border-t border-line py-5 first:border-t-0">
                <div className="flex items-start gap-3">
                  {answer.isCorrect ? <CheckCircle size={21} weight="fill" className="mt-0.5 shrink-0 text-bronze-dark" aria-label="Trả lời đúng" /> : <XCircle size={21} weight="fill" className="mt-0.5 shrink-0 text-vermilion" aria-label="Trả lời chưa đúng" />}
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
    </div>
  );
}

export function EpisodeQuiz({ slug, signedIn }: { slug: string; signedIn: boolean }): ReactElement {
  const [open, setOpen] = useState(false);
  const [currentQuestion, setCurrentQuestion] = useState(0);
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
    setCurrentQuestion(0);
    setAnswers({});
    key.current = crypto.randomUUID();
    submit.reset();
  };

  return (
    <>
      <Button size="lg" onClick={() => setOpen(true)} className="w-full sm:w-auto">
        Bắt đầu quiz <ArrowRight aria-hidden="true" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="flex max-h-[90dvh] min-h-[580px] max-w-2xl grid-rows-none flex-col gap-0 overflow-hidden border-line bg-paper p-0 sm:p-0">
          <DialogHeader className="shrink-0 border-b border-line bg-paper-soft px-5 py-5 pr-16 sm:px-8 sm:pr-16">
            <DialogTitle className="text-xl text-ink">Ôn tập sau khi nghe</DialogTitle>
            <DialogDescription>Chọn đáp án đúng nhất cho từng câu hỏi.</DialogDescription>
          </DialogHeader>

          {quiz.isPending ? (
            <div className="px-5 py-8 sm:px-8"><LibraryState loading /></div>
          ) : quiz.isError ? (
            <div className="px-5 py-8 sm:px-8"><LibraryState error title="Chưa tải được bộ câu hỏi" description="Kết nối có thể đang gián đoạn. Bạn hãy thử lại." retry={() => { void quiz.refetch(); }} /></div>
          ) : quiz.data.questions.length === 0 ? (
            <div className="px-5 py-8 sm:px-8"><LibraryState title="Bộ câu hỏi đang được chuẩn bị" description="Bạn có thể quay lại tập này sau." /></div>
          ) : submit.data ? (
            <QuizResult quiz={quiz.data} result={submit.data} onRetry={retry} />
          ) : (
            <QuizForm
              quiz={quiz.data}
              currentIndex={currentQuestion}
              answers={answers}
              signedIn={signedIn}
              isSubmitting={submit.isPending}
              onSelect={selectAnswer}
              onPrevious={() => setCurrentQuestion((value) => Math.max(0, value - 1))}
              onNext={() => setCurrentQuestion((value) => Math.min(quiz.data.questions.length - 1, value + 1))}
              onSubmit={(event) => { event.preventDefault(); submit.mutate(); }}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
