import { useState, type ReactElement } from "react";
import type { QuizDraftData } from "@repo/shared";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { cn } from "@/lib/utils";
import { BookOpen } from "@phosphor-icons/react/dist/icons/BookOpen";
import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle";
import { XCircle } from "@phosphor-icons/react/dist/icons/XCircle";
import { ArrowLeft } from "@phosphor-icons/react/dist/icons/ArrowLeft";
import { ArrowRight } from "@phosphor-icons/react/dist/icons/ArrowRight";
function PreviewContent({ data }: { data: QuizDraftData }): ReactElement {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [multi, setMulti] = useState<Record<string, number[]>>({});
  const [textAnswers, setTextAnswers] = useState<Record<string, string>>({});
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const question = data.questions[index];
  const choice = answers[question.id];
  if (question.kind === "MULTIPLE" || question.kind === "TEXT") {
    const selected = multi[question.id] ?? [];
    const expected = question.correctIndexes ?? [];
    const normalize = (value: string): string => value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
    const correct = question.kind === "TEXT" ? Boolean(textAnswers[question.id]?.trim()) && question.options.some(option => normalize(option) === normalize(textAnswers[question.id])) : expected.length > 0 && selected.length === expected.length && selected.every(value => expected.includes(value));
    return <><div className="flex flex-col gap-4 px-5 py-6">
      <p className="text-sm text-mod-text-secondary">Câu {index + 1} / {data.questions.length}</p>
      <h3 className="text-xl font-bold">{question.text || "Câu hỏi chưa có nội dung"}</h3>
      {question.kind === "TEXT" ? <input className="rounded border border-mod-border p-3" aria-label="Câu trả lời" value={textAnswers[question.id] ?? ""} onChange={event => setTextAnswers(a => ({ ...a, [question.id]: event.target.value }))} disabled={checked[question.id]} /> : <><p className="text-sm">Chọn chính xác tất cả đáp án đúng.</p>{question.options.map((option, i) => <label key={i} className="flex items-center gap-3 rounded border border-mod-border p-3"><input type="checkbox" checked={selected.includes(i)} disabled={checked[question.id]} onChange={() => setMulti(a => ({ ...a, [question.id]: selected.includes(i) ? selected.filter(n => n !== i) : [...selected, i] }))} />{"ABCDEF"[i]}. {option || "Chưa nhập đáp án"}</label>)}</>}
      {checked[question.id] ? <div role="status"><p className="font-semibold">{correct ? "Chính xác!" : "Chưa chính xác."}</p><p className="mt-2 text-sm">Đáp án: {question.kind === "TEXT" ? question.options.join(" · ") : expected.map(i => ` ${"ABCDEF"[i]}`).join(", ") || "Chưa chọn"}</p><p className="mt-2 text-sm">{question.explanation || "Chưa có giải thích."}</p></div> : <Button onClick={() => setChecked(a => ({ ...a, [question.id]: true }))}>Kiểm tra</Button>}
    </div><div className="flex justify-between border-t border-mod-border p-4"><Button variant="outline" disabled={index === 0} onClick={() => setIndex(i => i - 1)}><ArrowLeft />Câu trước</Button><Button disabled={index === data.questions.length - 1} onClick={() => setIndex(i => i + 1)}>Câu tiếp<ArrowRight /></Button></div></>;
  }
  return <>
    <div className="flex min-w-0 flex-col gap-5 px-4 py-5 min-[481px]:p-6 sm:px-7">
      <p className="text-[11px] font-semibold uppercase tracking-[.05em] text-mod-primary [overflow-wrap:anywhere]">{data.title || "Bộ quiz chưa có tên"}</p>
      <div className="flex items-center gap-[18px] text-[13px] text-mod-text-secondary"><span className="shrink-0 tabular-nums">Câu {index + 1} / {data.questions.length}</span><progress className="quiz-preview-progress" aria-label="Tiến độ xem thử" value={index + 1} max={data.questions.length} /></div>
      <h3 className="text-[clamp(18px,2vw,24px)] font-bold leading-normal [overflow-wrap:anywhere]">{question.text || "Câu hỏi chưa có nội dung"}</h3>
      <div className="grid gap-2.5" role="group" aria-label="Các lựa chọn">
        {question.options.map((option, i) => <Button key={i} variant="outline" disabled={choice !== undefined} aria-pressed={choice === i}
          className={cn("group h-auto min-h-[54px] w-full flex-wrap justify-start gap-2 whitespace-normal py-1.5 pl-1.5 pr-3 text-left disabled:opacity-100 min-[481px]:flex-nowrap min-[481px]:gap-3.5", choice !== undefined && i === question.correctIndex && "border-2 border-mod-success bg-mod-success/10 [&_.quiz-letter]:bg-mod-success [&_.quiz-letter]:text-mod-surface", choice === i && question.correctIndex !== null && i !== question.correctIndex && "border-2 border-mod-danger bg-mod-danger/10 [&_.quiz-letter]:bg-mod-danger [&_.quiz-letter]:text-mod-surface", choice === i && question.correctIndex === null && "border-2 border-mod-primary")}
          onClick={() => setAnswers(a => ({ ...a, [question.id]: i }))}>
          <span className="quiz-letter grid min-h-11 w-8 shrink-0 place-items-center self-start rounded-md bg-mod-canvas-accent text-[13px] font-semibold text-mod-text" aria-hidden="true">{"ABCDEF"[i]}</span>
          <span className="min-w-0 flex-1 whitespace-pre-wrap leading-[1.6] [overflow-wrap:anywhere]"><span className="sr-only">{"ABCDEF"[i]}. </span>{option || "Chưa nhập đáp án"}</span>
          {choice !== undefined && i === question.correctIndex ? <span className="ml-10 flex shrink-0 items-center justify-end gap-1.5 text-xs font-bold text-mod-success min-[481px]:ml-0 [&>svg]:size-5"><CheckCircle weight="fill" aria-hidden="true" /><span>{choice === i ? "Bạn chọn đúng" : "Đáp án đúng"}</span></span>
            : choice === i && question.correctIndex !== null ? <span className="ml-10 flex shrink-0 items-center justify-end gap-1.5 text-xs font-bold text-mod-danger min-[481px]:ml-0 [&>svg]:size-5"><XCircle weight="fill" aria-hidden="true" /><span>Bạn chọn sai</span></span>
              : choice === i ? <span className="ml-10 flex shrink-0 items-center justify-end gap-1.5 text-xs font-bold text-mod-text min-[481px]:ml-0"><span>Đã chọn</span></span>
                : <span className="size-[18px] shrink-0 rounded-full border border-mod-text-low" aria-hidden="true" />}
        </Button>)}
      </div>
      {choice !== undefined && <div className="flex items-start gap-3.5 border-t border-mod-border pt-5 text-[13px] leading-[1.8] [overflow-wrap:anywhere] [&>div]:min-w-0 [&>svg]:shrink-0" role="status">
        {question.correctIndex !== null && (choice === question.correctIndex ? <CheckCircle size={26} weight="fill" className="text-mod-success" aria-hidden="true" /> : <XCircle size={26} weight="fill" className="text-mod-danger" aria-hidden="true" />)}
        <div><p className={cn("font-semibold", question.correctIndex === null ? "text-mod-text" : choice === question.correctIndex ? "text-mod-success" : "text-mod-danger")}>{question.correctIndex === null ? "Chưa chọn đáp án đúng." : choice === question.correctIndex ? "Chính xác!" : `Chưa chính xác. Đáp án đúng là ${"ABCDEF"[question.correctIndex]}.`}</p><h4 className="mt-3 font-semibold">Giải thích</h4><p className="mt-1 whitespace-pre-wrap text-mod-text-secondary">{question.explanation || "Chưa có giải thích."}</p></div>
      </div>}
    </div>
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-mod-border px-4 py-3.5 min-[481px]:px-6 min-[481px]:py-4 sm:px-7"><Button variant="outline" disabled={index === 0} onClick={() => setIndex(i => i - 1)}><ArrowLeft />Câu trước</Button><span className="hidden text-[11px] text-mod-text-low sm:inline">Chế độ xem thử</span><Button disabled={index === data.questions.length - 1} onClick={() => setIndex(i => i + 1)}>Câu tiếp<ArrowRight /></Button></div>
  </>;
}
export function QuizPreview({ open, onOpenChange, data }: { open: boolean; onOpenChange: (open: boolean) => void; data: QuizDraftData }): ReactElement {
  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent className="quiz-dialog max-h-[90dvh] max-w-3xl gap-0 overflow-y-auto border-mod-border bg-mod-surface p-0 font-moderator text-mod-text sm:p-0">
    <DialogHeader className="relative border-b border-mod-border px-5 py-5 pr-12 min-[481px]:py-6 min-[481px]:pl-16 min-[481px]:pr-14"><BookOpen size={25} className="absolute left-6 top-[25px] hidden text-mod-primary min-[481px]:block" aria-hidden="true" /><DialogTitle>Xem thử bộ quiz</DialogTitle><DialogDescription>Trải nghiệm của người nghe · Không ghi nhận lượt làm</DialogDescription></DialogHeader>
    {open && <PreviewContent data={data} />}
  </DialogContent></Dialog>;
}
