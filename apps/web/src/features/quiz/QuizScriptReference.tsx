import { useState, type ReactElement } from "react";
import type { QuizDraftQuestion, QuizWorkspace } from "@repo/shared";
import { BookOpen } from "@phosphor-icons/react/dist/icons/BookOpen";
import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle";
import { Button } from "@/shared/components/ui/button";
import { Skeleton } from "@/shared/components/ui/skeleton";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { useQuizScript } from "./useQuiz";

interface QuizScriptReferenceProps {
  episodeId: string;
  episodeTitle: string;
  script: QuizWorkspace["script"];
  evidence: QuizDraftQuestion["evidence"];
  questionNumber: number;
}

export function QuizScriptReference({ episodeId, episodeTitle, script, evidence, questionNumber }: QuizScriptReferenceProps): ReactElement {
  const [showFull, setShowFull] = useState(false);
  const fullScript = useQuizScript(episodeId, script?.hash, showFull || !evidence);
  const outdated = Boolean(evidence && evidence.scriptHash !== script?.hash);

  return <section className="quiz-reference">
    <div className="quiz-panel-heading">
      <h2>Kịch bản tham chiếu</h2>
      <p>Đối chiếu nội dung khi biên soạn.</p>
    </div>
    {evidence && <div className="quiz-reference-tabs" role="group" aria-label="Nội dung tham chiếu">
      <Button variant="ghost" size="sm" aria-pressed={!showFull} onClick={() => setShowFull(false)}>Đoạn liên quan</Button>
      <Button variant="ghost" size="sm" aria-pressed={showFull} onClick={() => setShowFull(true)}>Toàn bộ</Button>
    </div>}
    {evidence && !showFull ? <>
      <p className="quiz-section-eyebrow">Căn cứ câu {String(questionNumber).padStart(2, "0")}</p>
      <blockquote className="quiz-evidence-quote">{evidence.quote}</blockquote>
      {outdated && <CardBadge type="status" tone="warning">Căn cứ từ bản kịch bản cũ</CardBadge>}
    </> : !script ? <div className="quiz-script-empty">
      <BookOpen size={24} aria-hidden="true" />
      <h3>Chưa có kịch bản</h3>
      <p>Bạn vẫn có thể tự soạn câu hỏi. Lưu kịch bản trong phần Sản xuất podcast để tham chiếu và tạo câu hỏi.</p>
    </div> : fullScript.isPending ? <div className="space-y-3" role="status" aria-label="Đang tải kịch bản">
      <Skeleton className="h-4 w-2/3" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-4/5" />
    </div> : fullScript.isError ? <div className="quiz-script-empty">
      <p role="status">Chưa tải được kịch bản. Nội dung đang soạn vẫn được giữ nguyên.</p>
      <Button variant="outline" size="sm" onClick={() => void fullScript.refetch()}>Thử lại</Button>
    </div> : <div className="quiz-script-document">
      <h3>{episodeTitle}</h3>
      <p>{fullScript.data || "Bản kịch bản này chưa có nội dung văn bản để tham chiếu."}</p>
    </div>}
    {script && <p className="quiz-script-saved">
      <span>Bản lưu · {new Date(script.updatedAt).toLocaleDateString("vi-VN")}</span>
      {!outdated && <CheckCircle size={16} className="text-mod-success" aria-label="Kịch bản hiện tại" />}
    </p>}
  </section>;
}
