import type { ReactElement } from "react";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";

interface QuizScriptReferenceProps {
  text: string;
  onTextChange: (text: string) => void;
}

export function QuizScriptReference({ text, onTextChange }: QuizScriptReferenceProps): ReactElement {
  return <section className="flex min-w-0 flex-col gap-4">
    <div>
      <h2 className="text-[15px] font-bold">Kịch bản quiz</h2>
      <p className="mt-1.5 text-xs leading-[1.7] text-mod-text-secondary">Tự soạn nội dung, ghi chú và nguồn tham khảo để làm căn cứ tạo và xem lại câu hỏi.</p>
    </div>
    <Label htmlFor="quiz-reference-text" className="sr-only">Nội dung kịch bản quiz</Label>
    <Textarea id="quiz-reference-text" maxLength={100_000} aria-describedby="quiz-reference-help" className="mt-3 h-80 min-h-[200px] resize-y text-[13px] leading-[1.9]" value={text} onChange={event => onTextChange(event.target.value)} placeholder="Soạn hoặc dán nội dung làm căn cứ cho bộ quiz…" />
    <p id="quiz-reference-help" className="text-xs leading-5 text-mod-text-secondary">Bấm “Lưu nháp” để lưu cùng bộ quiz và mở lại khi cần đối chiếu. Kịch bản quiz được quản lý riêng với kịch bản podcast.</p>
  </section>;
}
