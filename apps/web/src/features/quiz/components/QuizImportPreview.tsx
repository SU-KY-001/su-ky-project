import type { ReactElement } from "react";
import type { QuizImportDiagnostic, QuizImportPreview as Preview, QuizImportSource } from "@repo/shared";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { WarningCircle } from "@phosphor-icons/react/dist/icons/WarningCircle";
import { cn } from "@/lib/utils";

function location(source: QuizImportSource): string {
  if (source.pageStart !== null) return `trang ${source.pageStart}${source.pageEnd !== source.pageStart ? `–${source.pageEnd}` : ""}`;
  if (source.lineStart !== null) return `dòng ${source.lineStart}${source.lineEnd !== source.lineStart ? `–${source.lineEnd}` : ""}`;
  return `đoạn ${source.blockStart + 1}${source.blockEnd !== source.blockStart ? `–${source.blockEnd + 1}` : ""}`;
}
function Issue({ issue, label, targetId }: { issue: QuizImportDiagnostic; label?: string; targetId?: string }): ReactElement {
  return <li className="space-y-1 text-sm leading-6">
    {label && (targetId ? <a className="font-semibold text-mod-danger underline underline-offset-4" href={`#${targetId}`} onClick={event => { event.preventDefault(); const target = document.getElementById(targetId); target?.scrollIntoView({ behavior: "smooth", block: "start" }); target?.focus({ preventScroll: true }); }}>{label}</a> : <p className="font-semibold text-mod-danger">{label}</p>)}
    <p className={issue.severity === "error" ? "font-medium text-mod-danger" : "text-mod-text-secondary"}>{issue.message}</p><p className="text-xs text-mod-text-secondary">{location(issue.source)}</p><p><span className="font-semibold">Cách sửa: </span>{issue.suggestion}</p></li>;
}
export function QuizImportPreview({ result }: { result: Preview }): ReactElement {
  const kinds = { SINGLE: "Chọn một", MULTIPLE: "Chọn nhiều", TEXT: "Điền đáp án" };
  const errors = result.diagnostics.filter(d => d.severity === "error");
  const invalidQuestions = result.questions.filter(q => q.diagnostics.some(d => d.severity === "error"));
  const questionsById = new Map(result.questions.map(q => [q.id, q]));
  return <section className="space-y-5" aria-label="Xem trước câu hỏi nhập">
    <div className="flex flex-wrap items-center justify-between gap-2"><p className="min-w-0 break-all text-sm font-semibold">{result.fileName}</p><CardBadge type="status" tone={result.status === "ready" ? "success" : "danger"}>{result.status === "ready" ? "Đọc tài liệu thành công" : "Cần sửa file"}</CardBadge></div>
    <p className="text-sm leading-6 text-mod-text-secondary">{result.summary.total} câu · {result.summary.single} chọn một · {result.summary.multiple} chọn nhiều · {result.summary.text} điền đáp án</p>
    {result.status !== "ready" && <section role="alert" aria-label="Tổng hợp lỗi import" className="space-y-4 rounded-lg border border-mod-danger/30 bg-mod-danger/5 p-4">
      <div className="flex items-start gap-2.5"><WarningCircle className="mt-0.5 size-5 shrink-0 text-mod-danger" aria-hidden="true" /><div className="space-y-1"><h3 className="text-sm font-bold text-mod-danger">{errors.length} lỗi cần sửa trước khi nhập</h3><p className="text-sm leading-6 text-mod-text">{invalidQuestions.length > 0 ? `${invalidQuestions.length}/${result.questions.length} câu có lỗi. ` : ""}Sửa file gốc theo hướng dẫn rồi tải lại để tiếp tục.</p></div></div>
      <ul className="space-y-3 [&>li+li]:border-t [&>li+li]:border-mod-danger/15 [&>li+li]:pt-3">{errors.map((issue, i) => {
        const question = issue.questionId ? questionsById.get(issue.questionId) : undefined;
        return <Issue key={i} issue={issue} label={question ? `${question.section ? `${question.section} · ` : ""}Câu ${question.sourceNumber}` : "Cấu trúc tài liệu"} targetId={question ? `quiz-import-question-${question.id}` : undefined} />;
      })}</ul>
      <p className="text-xs leading-5 text-mod-text-secondary">Chưa nhập câu hỏi từ file này. Bộ quiz đang soạn được giữ nguyên.</p>
    </section>}
    {result.diagnostics.some(d => d.questionId === null && d.severity === "warning") && <ul className="space-y-3 rounded-md border border-mod-border p-3">{result.diagnostics.filter(d => d.questionId === null && d.severity === "warning").map((d, i) => <Issue key={i} issue={d} />)}</ul>}
    <ol className="space-y-4">{result.questions.map(q => <li key={q.id} id={`quiz-import-question-${q.id}`} aria-label={`Câu ${q.sourceNumber}`} tabIndex={-1} className={cn("scroll-mt-3 space-y-3 rounded-lg border p-4", q.diagnostics.some(d => d.severity === "error") ? "border-mod-danger/30 bg-mod-danger/5" : "border-mod-border")}>
      <div className="flex flex-wrap items-center gap-2"><h3 className="text-sm font-semibold">{q.section ? `${q.section} · ` : ""}Câu {q.sourceNumber}</h3><CardBadge type="status" tone="neutral">{q.kind ? kinds[q.kind] : "Chưa xác định loại"}</CardBadge><CardBadge type="status" tone={q.diagnostics.some(d => d.severity === "error") ? "danger" : "success"}>{q.diagnostics.some(d => d.severity === "error") ? "Cần sửa" : "Hợp lệ"}</CardBadge></div>
      <p className="text-xs text-mod-text-secondary">{location(q.source)} · {q.timeLimit} giây</p>
      <p className="whitespace-pre-wrap break-words text-sm leading-6">{q.text || "Chưa có nội dung câu hỏi"}</p>
      <ul className="space-y-1.5 text-sm leading-6">{q.options.map((option, index) => {
        const correct = q.kind === "TEXT" || (q.kind === "MULTIPLE" ? q.correctIndexes.includes(index) : q.correctIndex === index);
        return <li key={index} className="whitespace-pre-wrap break-words">{q.kind === "TEXT" ? "Chấp nhận: " : `${"ABCDEF"[index] ?? index + 1}. `}{option || "(Trống)"}{correct && q.kind !== "TEXT" && <span className="ml-2 font-semibold text-mod-success">Đáp án đúng</span>}</li>;
      })}</ul>
      {q.explanation && <p className="whitespace-pre-wrap text-sm leading-6"><span className="font-semibold">Giải thích: </span>{q.explanation}</p>}
      {q.diagnostics.length > 0 && <ul className="space-y-3 border-t border-mod-border pt-3">{q.diagnostics.map((d, i) => <Issue key={i} issue={d} />)}</ul>}
      {q.diagnostics.length > 0 && <details className="text-xs text-mod-text-secondary"><summary className="cursor-pointer">Đối chiếu nội dung nguồn</summary><pre className="mt-2 whitespace-pre-wrap break-words font-moderator leading-6">{q.source.excerpt}</pre></details>}
    </li>)}</ol>
    {result.unparsedRegions.length > 0 && <section className="space-y-3"><h3 className="text-sm font-semibold">Nội dung chưa nhận diện</h3>{result.unparsedRegions.map((source, i) => <div key={i} className="rounded-md border border-mod-border p-3"><p className="text-xs text-mod-text-secondary">{location(source)}</p><pre className="mt-2 whitespace-pre-wrap break-words font-moderator text-sm">{source.excerpt}</pre></div>)}</section>}
  </section>;
}
