import type { ReactElement } from "react";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";

interface QuizScriptReferenceProps {
  text: string;
  onTextChange: (text: string) => void;
}

export function QuizScriptReference({ text, onTextChange }: QuizScriptReferenceProps): ReactElement {
  return <section className="quiz-reference">
    <div className="quiz-panel-heading">
      <h2>Kịch bản quiz</h2>
      <p>Tự soạn nội dung, ghi chú và nguồn tham khảo để làm căn cứ tạo và xem lại câu hỏi.</p>
    </div>
    <Label htmlFor="quiz-reference-text" className="sr-only">Nội dung kịch bản quiz</Label>
    <Textarea id="quiz-reference-text" maxLength={100_000} aria-describedby="quiz-reference-help" className="quiz-script-reference-input" value={text} onChange={event => onTextChange(event.target.value)} placeholder="Soạn hoặc dán nội dung làm căn cứ cho bộ quiz…" />
    <p id="quiz-reference-help" className="text-xs leading-5 text-mod-text-secondary">Bấm “Lưu nháp” để lưu cùng bộ quiz và mở lại khi cần đối chiếu. Kịch bản quiz được quản lý riêng với kịch bản podcast.</p>
  </section>;
}
