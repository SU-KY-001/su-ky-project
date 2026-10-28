import { useState, type ReactElement } from "react";
import type { QuizDraftData } from "@repo/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { BookOpen } from "@phosphor-icons/react/dist/icons/BookOpen";
import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle";
import { ArrowLeft } from "@phosphor-icons/react/dist/icons/ArrowLeft";
import { ArrowRight } from "@phosphor-icons/react/dist/icons/ArrowRight";
function PreviewContent({ data }: { data: QuizDraftData }): ReactElement {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const question = data.questions[index];
  const choice = answers[question.id];
  return <>
    <div className="quiz-preview-body">
      <p className="quiz-section-eyebrow text-mod-primary">{data.title || "Bộ quiz chưa có tên"}</p>
      <div className="quiz-preview-progress"><span>Câu {index + 1} / {data.questions.length}</span><progress aria-label="Tiến độ xem thử" value={index + 1} max={data.questions.length} /></div>
      <h3 className="quiz-preview-question">{question.text || "Câu hỏi chưa có nội dung"}</h3>
      <div className="quiz-preview-options" role="group" aria-label="Các lựa chọn">
        {question.options.map((option, i) => <Button key={i} variant="outline" disabled={choice !== undefined} aria-pressed={choice === i}
          className={cn("quiz-preview-option", choice !== undefined && i === question.correctIndex && "is-correct", choice === i && i !== question.correctIndex && "is-incorrect")}
          onClick={() => setAnswers(a => ({ ...a, [question.id]: i }))}>
          <span className="quiz-answer-letter" aria-hidden="true">{"ABCD"[i]}</span>
          <span className="quiz-preview-option-text"><span className="sr-only">{"ABCD"[i]}. </span>{option || "Chưa nhập đáp án"}</span>
          {choice !== undefined && i === question.correctIndex ? <span className="quiz-preview-correct-label"><CheckCircle weight="fill" aria-hidden="true" /><span>Đáp án đúng</span></span> : <span className="quiz-preview-radio" aria-hidden="true" />}
        </Button>)}
      </div>
      {choice !== undefined && <div className="quiz-preview-feedback" role="status">
        {choice === question.correctIndex && <CheckCircle size={26} weight="fill" className="text-mod-success" aria-hidden="true" />}
        <div><p className={cn("font-semibold", choice === question.correctIndex ? "text-mod-success" : "text-mod-text")}>{question.correctIndex === null ? "Chưa chọn đáp án đúng." : choice === question.correctIndex ? "Chính xác!" : `Đáp án đúng: ${"ABCD"[question.correctIndex]}.`}</p><h4 className="mt-3 font-semibold">Giải thích</h4><p className="mt-1 whitespace-pre-wrap text-mod-text-secondary">{question.explanation || "Chưa có giải thích."}</p></div>
      </div>}
    </div>
    <div className="quiz-preview-footer"><Button variant="outline" disabled={index === 0} onClick={() => setIndex(i => i - 1)}><ArrowLeft />Câu trước</Button><span>Chế độ xem thử</span><Button disabled={index === data.questions.length - 1} onClick={() => setIndex(i => i + 1)}>Câu tiếp<ArrowRight /></Button></div>
  </>;
}
export function QuizPreview({ open, onOpenChange, data }: { open: boolean; onOpenChange: (open: boolean) => void; data: QuizDraftData }): ReactElement {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="quiz-preview-dialog max-h-[90dvh] max-w-3xl gap-0 overflow-y-auto border-mod-border bg-mod-surface p-0 font-moderator text-mod-text sm:p-0">
    <DialogHeader className="quiz-preview-header"><BookOpen size={25} className="quiz-preview-header-icon text-mod-primary" aria-hidden="true" /><DialogTitle>Xem thử bộ quiz</DialogTitle><DialogDescription>Trải nghiệm của người nghe · Không ghi nhận lượt làm</DialogDescription></DialogHeader>
    {open && <PreviewContent data={data} />}
  </DialogContent></Dialog>;
}
