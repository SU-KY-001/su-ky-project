import { useState, type ReactElement } from "react";
import type { QuizDraftData } from "@repo/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
function PreviewContent({ data }: { data: QuizDraftData }): ReactElement {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const question = data.questions[index];
  const choice = answers[question.id];
  return <><p className="mb-4 text-xs text-mod-text-secondary">Câu {index + 1}/{data.questions.length} · Xem thử, không ghi nhận lượt làm</p><h3 className="mb-6 text-xl font-bold">{question.text || "Câu hỏi chưa có nội dung"}</h3><div className="grid gap-3 sm:grid-cols-2">{question.options.map((o, i) => <Button key={i} variant="outline" disabled={choice !== undefined} className={cn("h-auto min-h-16 whitespace-normal justify-start text-left", choice !== undefined && i === question.correctIndex && "border-mod-success bg-mod-success/10 text-mod-success", choice === i && i !== question.correctIndex && "border-mod-danger text-mod-danger")} onClick={() => setAnswers(a => ({ ...a, [question.id]: i }))}>{"ABCD"[i]}. {o || "Chưa nhập đáp án"}</Button>)}</div>{choice !== undefined && <div className="mt-5 text-sm leading-6" role="status"><p className="font-semibold">{question.correctIndex === null ? "Chưa chọn đáp án đúng." : choice === question.correctIndex ? "Chính xác!" : `Đáp án đúng: ${"ABCD"[question.correctIndex]}.`}</p><p className="mt-1 text-mod-text-secondary">{question.explanation || "Chưa có giải thích."}</p></div>}<div className="mt-6 flex justify-between"><Button variant="outline" disabled={index === 0} onClick={() => setIndex(i => i - 1)}>Câu trước</Button><Button disabled={index === data.questions.length - 1} onClick={() => setIndex(i => i + 1)}>Câu tiếp</Button></div></>;
}
export function QuizPreview({ open, onOpenChange, data }: { open: boolean; onOpenChange: (open: boolean) => void; data: QuizDraftData }): ReactElement {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="mod-scrollbar-hidden max-h-[90dvh] max-w-3xl overflow-y-auto font-moderator"><DialogHeader><DialogTitle>{data.title || "Xem thử bộ quiz"}</DialogTitle><DialogDescription>Chọn đáp án để kiểm tra trải nghiệm và giải thích.</DialogDescription></DialogHeader>{open && <PreviewContent data={data} />}</DialogContent></Dialog>;
}
