import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Link, useLocation } from "react-router";
import {
  CheckCircle,
  CircleNotch,
  Question,
  Sparkle,
  Trophy,
  XCircle,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { listeningService } from "../services/listeningService";
import type { QuizAttemptResult } from "../services/listeningService";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { APP_PATHS } from "@/shared/constants/routes";
import { useIdempotentMutation } from "@/lib/useIdempotentMutation";

interface EpisodeQuizSectionProps {
  episodeSlug: string;
}

export function EpisodeQuizSection({ episodeSlug }: EpisodeQuizSectionProps) {
  const session = useCurrentUser();
  const location = useLocation();

  // Selected options: questionId -> optionId
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<QuizAttemptResult | null>(null);

  const { data: quiz, status } = useQuery({
    queryKey: ["episode-quiz", episodeSlug],
    queryFn: () => listeningService.getQuiz(episodeSlug),
    staleTime: 5 * 60_000,
    retry: false,
  });

  const submitMutation = useIdempotentMutation(
    ({ quizId, answers }: { quizId: string; answers: { questionId: string; optionId: string }[] }, idempotencyKey) =>
      listeningService.submitQuizAttempt(quizId, answers, idempotencyKey),
    (data) => setResult(data),
  );

  if (status === "pending") {
    return (
      <section className="mt-12 rounded-2xl border border-line bg-paper-soft p-6 md:p-8 animate-pulse">
        <div className="h-6 w-48 rounded bg-paper-deep" />
        <div className="mt-4 h-24 rounded bg-paper-deep" />
      </section>
    );
  }

  if (status === "error" || !quiz || quiz.questions.length === 0) {
    return null;
  }

  const allAnswered = quiz.questions.every((q) => Boolean(selectedAnswers[q.id]));

  const handleSelectOption = (questionId: string, optionId: string) => {
    if (result) return; // locked after submission
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionId]: optionId,
    }));
  };

  const handleRetry = () => {
    submitMutation.reset();
    setResult(null);
    setSelectedAnswers({});
  };

  const handleSubmit = () => {
    if (!quiz || !allAnswered) return;
    submitMutation.mutate({
      quizId: quiz.id,
      answers: quiz.questions.map((question) => ({
        questionId: question.id,
        optionId: selectedAnswers[question.id] ?? "",
      })),
    });
  };

  return (
    <section className="mt-12 rounded-2xl border border-line bg-paper-soft p-6 md:p-8 shadow-sm">
      {/* Section Header */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line pb-4">
        <div className="flex items-center gap-2.5">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-bronze/15 text-bronze-dark">
            <Trophy size={20} weight="fill" />
          </div>
          <div>
            <h2 className="font-serif text-xl font-bold text-ink">
              Khảo Hạch Sử Ký (Mini-Quiz)
            </h2>
            <p className="text-xs text-ink-soft">
              Điểm đạt yêu cầu: <span className="font-semibold text-bronze-dark">{quiz.passScorePercent}%</span> · {quiz.questions.length} câu hỏi
            </p>
          </div>
        </div>

        {result ? (
          <div className={cn(
            "flex items-center gap-1.5 rounded-full px-3 py-1 font-mono text-xs font-bold",
            result.isPassed ? "bg-emerald-100 text-emerald-800" : "bg-red-100 text-red-800",
          )}>
            {result.isPassed ? <CheckCircle size={15} weight="fill" /> : <XCircle size={15} weight="fill" />}
            {result.scorePercent}% · {result.isPassed ? "Đạt chuẩn" : "Chưa đạt"}
          </div>
        ) : null}
      </div>

      {/* Result Banner */}
      {result ? (
        <div className={cn(
          "my-6 flex flex-col gap-2 rounded-xl border p-4 text-sm md:flex-row md:items-center md:justify-between",
          result.isPassed
            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
            : "border-amber-300 bg-amber-50 text-amber-900",
        )}>
          <div className="flex items-center gap-3">
            <Sparkle size={24} weight="fill" className={result.isPassed ? "text-emerald-600" : "text-amber-600"} />
            <div>
              <p className="font-bold">
                {result.isPassed ? "Chúc mừng! Bạn đã hoàn thành xuất sắc bài khảo hạch." : "Rất tiếc! Bạn chưa đạt điểm tiêu chuẩn lần này."}
              </p>
              {result.xpAwarded > 0 ? (
                <p className="text-xs font-semibold text-emerald-700">
                  +{result.xpAwarded} XP đã được cộng vào tài khoản (Tổng: {result.totalXp} XP)
                </p>
              ) : null}
            </div>
          </div>
          <button
            type="button"
            onClick={handleRetry}
            className={cn(
              "self-start rounded-lg px-4 py-1.5 text-xs font-semibold md:self-auto",
              result.isPassed
                ? "bg-emerald-700 text-white hover:bg-emerald-800"
                : "bg-amber-700 text-white hover:bg-amber-800",
            )}
          >
            Làm lại Quiz
          </button>
        </div>
      ) : null}

      {/* Questions List */}
      <div className="mt-6 flex flex-col gap-6">
        {quiz.questions.map((question, qIdx) => {
          const selectedOptionId = selectedAnswers[question.id];
          const answerResult = result?.answers.find((a) => a.questionId === question.id);

          return (
            <div key={question.id} className="rounded-xl border border-line/70 bg-paper p-4 md:p-5">
              <p className="font-medium text-ink leading-relaxed">
                <span className="font-mono font-bold text-bronze-dark mr-1.5">Câu {qIdx + 1}.</span>
                {question.text}
              </p>

              {/* Options */}
              <div className="mt-3.5 grid grid-cols-1 gap-2 sm:grid-cols-2" role="radiogroup">
                {question.options.map((option) => {
                  const isSelected = selectedOptionId === option.id;
                  const isCorrect = answerResult?.correctOptionId === option.id;
                  const isWrongSelected = isSelected && answerResult && !answerResult.isCorrect;

                  let optionStyle = "border-line bg-paper-soft text-ink hover:border-bronze/50";
                  if (isSelected && !result) {
                    optionStyle = "border-bronze bg-bronze/10 text-bronze-dark font-semibold";
                  } else if (result) {
                    if (isCorrect) {
                      optionStyle = "border-emerald-500 bg-emerald-50 text-emerald-900 font-semibold";
                    } else if (isWrongSelected) {
                      optionStyle = "border-red-400 bg-red-50 text-red-900";
                    } else {
                      optionStyle = "border-line/50 bg-paper-soft/50 text-ink/60";
                    }
                  }

                  return (
                    <button
                      key={option.id}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      disabled={Boolean(result)}
                      onClick={() => handleSelectOption(question.id, option.id)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-lg border p-3 text-left text-sm transition-[border-color,background-color] duration-150",
                        optionStyle,
                      )}
                    >
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-current text-xs font-bold">
                        {option.label}
                      </span>
                      <span className="flex-1">{option.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation after submission */}
              {answerResult?.explanation ? (
                <div className="mt-3 rounded-lg border-l-2 border-bronze/70 bg-paper-soft px-3 py-2 text-xs text-ink-soft">
                  <span className="font-semibold text-bronze-dark">Chú giải sử liệu: </span>
                  {answerResult.explanation}
                </div>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Submission Footer */}
      {!result ? (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-line pt-4">
          {submitMutation.error ? (
            <p className="w-full rounded-lg border border-vermilion/30 bg-vermilion/5 px-3 py-2 text-sm text-vermilion" role="alert">
              {submitMutation.error.message || "Không thể chấm điểm lúc này. Vui lòng thử lại."}
            </p>
          ) : null}
          {!session.data ? (
            <div className="flex items-center gap-2 text-sm text-ink-soft">
              <Question size={18} className="text-bronze" />
              <span>
                Bạn cần{" "}
                <Link
                  to={APP_PATHS.login}
                  state={{ from: { pathname: location.pathname } }}
                  className="font-bold text-vermilion hover:underline"
                >
                  đăng nhập
                </Link>{" "}
                để nộp bài và nhận điểm danh vọng (XP).
              </span>
            </div>
          ) : (
            <p className="text-xs text-ink-soft">
              Hãy chọn câu trả lời cho tất cả {quiz.questions.length} câu hỏi trước khi nộp.
            </p>
          )}

          {session.data ? (
            <button
              type="button"
              disabled={!allAnswered || submitMutation.isPending}
              onClick={handleSubmit}
              className={cn(
                "flex items-center gap-2 rounded-lg bg-vermilion px-6 py-2.5 text-sm font-semibold text-paper-soft shadow-sm transition-all hover:bg-vermilion-dark active:scale-[.98]",
                (!allAnswered || submitMutation.isPending) && "cursor-not-allowed opacity-50",
              )}
            >
              {submitMutation.isPending ? (
                <>
                  <CircleNotch size={16} className="animate-spin" /> Đang chấm điểm…
                </>
              ) : (
                "Nộp bài kiểm tra"
              )}
            </button>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
