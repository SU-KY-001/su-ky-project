import { useRef, useState, type ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/shared/components/ui/dialog";
import { notify } from "@/shared/lib/notifications";
import { libraryService } from "../../services/libraryService";
import { LibraryState } from "./LibraryPrimitives";

export function EpisodeQuiz({ slug, signedIn }: { slug: string; signedIn: boolean }): ReactElement {
  const [open, setOpen] = useState(false);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const key = useRef(crypto.randomUUID());
  const queryClient = useQueryClient();
  const quiz = useQuery({ queryKey: ["library-quiz", slug], queryFn: ({ signal }) => libraryService.quiz(slug, signal), enabled: open });
  const submit = useMutation({ mutationFn: async () => {
    if (!quiz.data) throw new Error("Chưa tải được câu hỏi");
    return libraryService.attempt(quiz.data.id, quiz.data.questions.map((q) => ({ questionId: q.id, optionId: answers[q.id] })), key.current);
  }, onSuccess: () => { void queryClient.invalidateQueries({ queryKey: ["library-missions"] }); void queryClient.invalidateQueries({ queryKey: ["library-honors"] }); }, onError: () => notify.error({ title: "Chưa gửi được câu trả lời", description: "Vui lòng thử lại." }) });
  return <><Button variant="outline" onClick={() => setOpen(true)}>Ôn lại bằng quiz</Button><Dialog open={open} onOpenChange={setOpen}><DialogContent className="max-h-[90dvh] max-w-2xl overflow-y-auto"><DialogTitle>Kiểm tra điều bạn vừa nghe</DialogTitle><DialogDescription>Trả lời câu hỏi để ôn kiến thức và ghi nhận thành tích.</DialogDescription>
    {quiz.isPending ? <LibraryState loading /> : quiz.isError ? <LibraryState error retry={() => { void quiz.refetch(); }} /> : submit.data ? <div className="space-y-5"><p className="text-3xl font-semibold">{submit.data.scorePercent}%</p><p>{submit.data.isPassed ? "Bạn đã vượt qua bài quiz." : "Bạn có thể nghe lại và ôn thêm."} +{submit.data.xpAwarded} XP</p>{submit.data.answers.map((answer, index) => { const question = quiz.data.questions.find((q) => q.id === answer.questionId); return <div key={answer.questionId} className="border-t border-line pt-4"><p className="font-medium">{index + 1}. {question?.text}</p><p className="mt-2 text-sm text-muted-foreground">Đáp án: {question?.options.find((o) => o.id === answer.correctOptionId)?.text}</p>{answer.explanation && <p className="mt-2 text-sm leading-6">{answer.explanation}</p>}</div>; })}</div> : <form onSubmit={(event) => { event.preventDefault(); submit.mutate(); }} className="space-y-6">{quiz.data.questions.map((question, index) => <fieldset key={question.id} disabled={submit.isPending} className="space-y-3"><legend className="mb-3 font-medium">{index + 1}. {question.text}</legend>{question.options.map((option) => <label key={option.id} className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-3 text-sm leading-6 has-[:checked]:border-primary has-[:checked]:bg-primary/5"><input type="radio" name={question.id} value={option.id} required checked={answers[question.id] === option.id} onChange={() => { setAnswers({ ...answers, [question.id]: option.id }); key.current = crypto.randomUUID(); }} className="mt-1 accent-primary" />{option.label}. {option.text}</label>)}</fieldset>)}{signedIn ? <Button type="submit" disabled={submit.isPending}>{submit.isPending ? "Đang chấm bài…" : "Nộp bài"}</Button> : <Button asChild><Link to="/login">Đăng nhập để ghi nhận kết quả</Link></Button>}</form>}
  </DialogContent></Dialog></>;
}
