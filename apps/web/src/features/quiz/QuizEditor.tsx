import { useEffect, useState, type ReactElement } from "react";
import { useBlocker } from "react-router";
import type { QuizDraftData, QuizDraftQuestion, QuizWorkspace } from "@repo/shared";
import { validateReadyQuiz } from "@repo/shared";
import { ArrowLeft } from "@phosphor-icons/react/dist/icons/ArrowLeft";
import { ArrowUp } from "@phosphor-icons/react/dist/icons/ArrowUp";
import { ArrowDown } from "@phosphor-icons/react/dist/icons/ArrowDown";
import { Copy } from "@phosphor-icons/react/dist/icons/Copy";
import { Eye } from "@phosphor-icons/react/dist/icons/Eye";
import { FloppyDisk } from "@phosphor-icons/react/dist/icons/FloppyDisk";
import { Plus } from "@phosphor-icons/react/dist/icons/Plus";
import { Trash } from "@phosphor-icons/react/dist/icons/Trash";
import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle";
import { GearSix } from "@phosphor-icons/react/dist/icons/GearSix";
import { Info } from "@phosphor-icons/react/dist/icons/Info";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/shared/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/shared/components/ui/dialog";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { ConfirmationDialog } from "@/shared/components/common/ConfirmationDialog";
import { useConfirmationDialog } from "@/shared/hooks/useConfirmationDialog";
import { notify } from "@/shared/lib/notifications";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import { cn } from "@/lib/utils";
import { newQuestion, cloneQuestion, moveQuestion, isComplete } from "./quizState";
import { useQuizMutations, useQuizWorkspace } from "./useQuiz";
import { QuizPreview } from "./QuizPreview";
import { QuizScriptReference } from "./QuizScriptReference";

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : "Không thực hiện được. Vui lòng thử lại.";
const discardRequest = { title: "Rời màn soạn quiz?", description: "Các thay đổi chưa lưu sẽ mất. Bạn có thể quay lại để lưu bản nháp trước.", confirmLabel: "Rời màn hình", destructive: true };

export function QuizEditor({ initial, onBack }: { initial: QuizWorkspace; onBack: () => void }): ReactElement {
  const [data, setData] = useState<QuizDraftData>(initial.data);
  const [saved, setSaved] = useState(initial);
  const [baseline, setBaseline] = useState(JSON.stringify(initial.data));
  const [selectedId, setSelectedId] = useState(initial.data.questions[0].id);
  const [preview, setPreview] = useState(false);
  const [settings, setSettings] = useState(false);
  const { requestConfirmation, confirmation } = useConfirmationDialog();
  const { save, activate } = useQuizMutations();
  const latest = useQuizWorkspace(initial.episodeId);
  const dirty = JSON.stringify(data) !== baseline;
  const busy = save.isPending || activate.isPending;
  const blocker = useBlocker(dirty || busy);
  const activeIndex = Math.max(0, data.questions.findIndex(q => q.id === selectedId));
  const question = data.questions[activeIndex];
  const completed = data.questions.filter(isComplete).length;
  const sharedTimeLimit = data.questions.every(q => q.timeLimit === data.questions[0].timeLimit) ? String(data.questions[0].timeLimit) : "";

  useEffect(() => {
    if (latest.isError) notify.warning({ title: "Chưa đồng bộ được bộ quiz", description: "Nội dung đang soạn được giữ nguyên. Hãy kiểm tra kết nối rồi thử lại." }, `quiz-sync-${initial.episodeId}`);
  }, [latest.isError, latest.error, initial.episodeId]);

  const update = (q: QuizDraftQuestion): void => setData(d => ({ ...d, questions: d.questions.map(item => item.id === q.id ? q : item) }));
  const remember = (workspace: QuizWorkspace): void => {
    setSaved(workspace); setData(workspace.data); setBaseline(JSON.stringify(workspace.data));
  };
  const leave = async (): Promise<void> => {
    if ((dirty || busy) && !await requestConfirmation(discardRequest)) return;
    onBack();
  };
  const persist = async (): Promise<void> => {
    if (busy) return;
    const submitted = data;
    try {
      const workspace = await save.mutateAsync([initial.episodeId, saved.revision, submitted]);
      setSaved(workspace);
      setBaseline(JSON.stringify(workspace.data));
      setData(current => current === submitted ? workspace.data : current);
      notify.success({ title: "Đã lưu bản nháp", description: "Nội dung gửi lưu đã được lưu lại." });
    }
    catch (error) { notify.error({ title: "Chưa lưu được quiz", description: errorMessage(error) }); }
  };
  const publish = async (): Promise<void> => {
    if (busy) return;
    try { validateReadyQuiz(data); }
    catch (error) { notify.warning({ title: "Quiz chưa hoàn chỉnh", description: errorMessage(error) }); return; }
    if (!await requestConfirmation({ title: "Gắn quiz với tập podcast?", description: `Bộ quiz “${data.title}” sẽ được lưu và gắn với tập “${initial.episodeTitle}”. Người nghe có thể làm quiz khi tập được công khai. Nếu tập đã công khai, bộ câu hỏi này sẽ được sử dụng ngay.`, confirmLabel: "Gắn quiz với tập" })) return;
    const submitted = data;
    try {
      const draft = dirty || !saved.revision ? await save.mutateAsync([initial.episodeId, saved.revision, submitted]) : saved;
      setSaved(draft);
      setBaseline(JSON.stringify(draft.data));
      setData(current => current === submitted ? draft.data : current);
      const activated = await activate.mutateAsync([initial.episodeId, draft.revision]);
      setSaved(activated);
      setBaseline(JSON.stringify(activated.data));
      setData(current => current === submitted || current === draft.data ? activated.data : current);
      notify.success({ title: "Đã gắn quiz với tập podcast", description: "Người nghe có thể làm bộ câu hỏi này khi tập được công khai." });
    } catch (error) { notify.error({ title: "Chưa gắn được quiz với tập podcast", description: errorMessage(error) }); }
  };
  const add = (): void => { const q = { ...newQuestion(), timeLimit: data.questions[0].timeLimit }; setData(d => ({ ...d, questions: [...d.questions, q] })); setSelectedId(q.id); };
  const remove = async (): Promise<void> => {
    if (!await requestConfirmation({ title: `Xóa câu ${activeIndex + 1}?`, description: "Câu hỏi này sẽ được bỏ khỏi bản đang soạn. Thay đổi chỉ được ghi lại khi bạn lưu.", confirmLabel: "Xóa câu", destructive: true })) return;
    const remaining = data.questions.filter(q => q.id !== question.id); setData(d => ({ ...d, questions: remaining })); setSelectedId(remaining[Math.min(activeIndex, remaining.length - 1)].id);
  };

  return <section className="quiz-editor font-moderator" aria-label="Soạn bộ quiz">
    <header className="quiz-editor-toolbar">
      <Button variant="ghost" size="icon" aria-label="Quay lại danh sách quiz" onClick={() => void leave()}><ArrowLeft /></Button>
      <div className="quiz-editor-breadcrumb"><span>Quiz</span><span aria-hidden="true">/</span><h1>Tạo bộ câu hỏi</h1></div>
      <div className="quiz-editor-toolbar-actions">
        <span className="quiz-save-status" role="status"><span aria-hidden="true" />{busy ? "Đang xử lý…" : dirty ? "Chưa lưu thay đổi" : saved.revision ? "Đã lưu bản nháp" : "Bản nháp mới"}</span>
        <Button variant="outline" disabled={busy} onClick={() => setPreview(true)}><Eye />Xem thử</Button>
      </div>
    </header>
    <div className="quiz-editor-titlebar">
      <div className="quiz-editor-title-field">
        <Label className="sr-only" htmlFor="quiz-name">Tên bộ quiz</Label>
        <Input id="quiz-name" maxLength={200} value={data.title} onChange={e => setData(d => ({ ...d, title: e.target.value }))} placeholder="Đặt tên bộ quiz…" className="h-11 font-semibold md:text-lg" />
        <p title={`${initial.seriesTitle} / ${initial.episodeTitle}`}>Podcast · {initial.seriesTitle} / {initial.episodeTitle}</p>
      </div>
      <Button variant="outline" disabled={busy} onClick={() => setSettings(true)}><GearSix />Thiết lập</Button>
    </div>
    {!busy && latest.data && latest.data.revision > saved.revision && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mod-border p-4 text-sm"><p>Bản nháp đã được cập nhật ở nơi khác. Nội dung bạn đang soạn vẫn được giữ nguyên.</p><Button variant="outline" disabled={busy} onClick={() => void (async () => {
      if (dirty && !await requestConfirmation({ title: "Tải bản nháp mới nhất?", description: "Thay đổi chưa lưu trên màn hình này sẽ được thay bằng bản nháp đã lưu ở nơi khác.", confirmLabel: "Tải bản mới" })) return;
      const remote = latest.data; if (remote) { remember(remote); setSelectedId(remote.data.questions[0].id); }
    })()}>Tải bản mới nhất</Button></div>}
    <fieldset className="quiz-editor-body">
      <legend className="sr-only">Biên tập câu hỏi</legend>
      <aside className="quiz-question-sidebar" aria-label="Danh sách câu hỏi">
        <div className="quiz-outline-heading"><h2>Câu hỏi</h2><span>{data.questions.length} / 100</span></div>
        <ol className="quiz-question-list">
          {data.questions.map(q => <li key={q.id}><Button type="button" variant="ghost" disabled={busy} aria-current={q.id === question.id ? "step" : undefined} onClick={() => setSelectedId(q.id)} className={cn("quiz-question-link", q.id === question.id && "is-selected")}>
            <span className="quiz-question-summary">
              <span className="quiz-question-name">{q.text || "Câu hỏi mới"}</span>
              <span className="quiz-question-completion">{isComplete(q) ? <CheckCircle weight="fill" className="text-mod-success" aria-hidden="true" /> : <span className="quiz-incomplete-dot" aria-hidden="true" />}{isComplete(q) ? "Đủ nội dung" : "Chưa hoàn chỉnh"}</span>
            </span>
          </Button></li>)}
        </ol>
        <div className="quiz-outline-footer">
          <Button variant="outline" className="w-full" disabled={busy || data.questions.length >= 100} onClick={add}><Plus />Thêm câu hỏi</Button>
          <p><strong>{completed}/{data.questions.length} câu đủ nội dung</strong><br />Có thể lưu bản nháp bất cứ lúc nào.</p>
        </div>
      </aside>
      <section className="quiz-question-canvas" aria-label="Nội dung câu hỏi đang chọn">
        <div className="quiz-question-meta"><span className="quiz-section-eyebrow">Câu hỏi {String(activeIndex + 1).padStart(2, "0")}</span><CardBadge type="status" tone={question.evidence ? "info" : "neutral"}>{question.evidence ? "Từ kịch bản" : "Tự soạn"}</CardBadge></div>
        <div className="quiz-form-field">
          <Label htmlFor="quiz-question">Nội dung câu hỏi</Label>
          <Textarea id="quiz-question" maxLength={2000} autoGrow value={question.text} onChange={e => update({ ...question, text: e.target.value })} placeholder="Viết câu hỏi dựa trên nội dung tập podcast…" className="min-h-28" />
        </div>
        <fieldset className="quiz-options-fieldset"><legend>Các lựa chọn</legend>
          <div className="quiz-options-help"><p id="quiz-options-help">Nhập 4 lựa chọn và đánh dấu đáp án đúng.</p><span aria-hidden="true">Đáp án đúng</span></div>
          <div className="quiz-answer-list" aria-describedby="quiz-options-help">
          {question.options.map((option, i) => <div key={i} className={cn("quiz-answer-row", question.correctIndex === i && "is-correct")}>
            <span className="quiz-answer-letter" aria-hidden="true">{"ABCD"[i]}</span>
            <Label htmlFor={`quiz-answer-${i}`} className="sr-only">Đáp án {"ABCD"[i]}</Label>
            <Textarea id={`quiz-answer-${i}`} maxLength={1000} autoGrow value={option} onChange={e => update({ ...question, options: question.options.map((o, n) => n === i ? e.target.value : o) })} placeholder={`Nhập đáp án ${"ABCD"[i]}`} className="min-h-11" />
            <label className="quiz-correct-choice"><input type="radio" name={`correct-${question.id}`} className="quiz-answer-radio" checked={question.correctIndex === i} aria-label={`Chọn ${"ABCD"[i]} là đáp án đúng`} onChange={() => update({ ...question, correctIndex: i })} /><span aria-hidden="true">{question.correctIndex === i ? "Đúng" : ""}</span></label>
          </div>)}
          </div>
        </fieldset>
        <div className="quiz-form-field">
          <div className="flex flex-wrap items-center gap-2"><Label htmlFor="quiz-explanation">Giải thích đáp án</Label>{!question.evidence && <span className="text-xs text-mod-text-low">Không bắt buộc</span>}</div>
          <Textarea id="quiz-explanation" maxLength={4000} autoGrow value={question.explanation} onChange={e => update({ ...question, explanation: e.target.value })} placeholder="Bổ sung kiến thức để người nghe hiểu rõ hơn…" />
        </div>
        <div className="quiz-question-actions">
          <Button variant="outline" size="icon-sm" aria-label="Di chuyển câu lên" disabled={busy || !activeIndex} onClick={() => setData(d => ({ ...d, questions: moveQuestion(d.questions, question.id, -1) }))}><ArrowUp /></Button>
          <Button variant="outline" size="icon-sm" aria-label="Di chuyển câu xuống" disabled={busy || activeIndex === data.questions.length - 1} onClick={() => setData(d => ({ ...d, questions: moveQuestion(d.questions, question.id, 1) }))}><ArrowDown /></Button>
          <Button variant="outline" size="sm" disabled={busy || data.questions.length >= 100} onClick={() => { const q = cloneQuestion(question); setData(d => ({ ...d, questions: [...d.questions.slice(0, activeIndex + 1), q, ...d.questions.slice(activeIndex + 1)] })); setSelectedId(q.id); }}><Copy />Nhân bản</Button>
          <Button variant="outline" size="sm" className="ml-auto" disabled={busy} onClick={() => void persist()}><FloppyDisk />{save.isPending ? "Đang lưu…" : "Lưu nháp"}</Button>
          <Button variant="destructive" size="sm" disabled={busy || data.questions.length === 1} onClick={() => void remove()}><Trash />Xóa câu</Button>
        </div>
      </section>
      <aside className="quiz-properties" aria-label="Kịch bản tham chiếu">
        <div className="quiz-time-guidance">
          <Accordion type="single" collapsible defaultValue="time"><AccordionItem value="time" className="border-b-0">
            <AccordionTrigger disabled={busy}>Thời gian gợi ý cho tất cả câu hỏi</AccordionTrigger>
            <AccordionContent><ModeratorSelect id="quiz-time" label="Thời gian gợi ý cho tất cả câu hỏi" value={sharedTimeLimit} onValueChange={value => setData(d => ({ ...d, questions: d.questions.map(q => ({ ...q, timeLimit: Number(value) })) }))} options={[10, 20, 30, 60, 120].map(n => ({ value: String(n), label: `${n} giây / câu` }))} placeholder="Chọn thời gian chung" disabled={busy} /></AccordionContent>
          </AccordionItem></Accordion>
          <p>Lựa chọn áp dụng ngay cho toàn bộ {data.questions.length} câu và các câu thêm mới. Đây là thời gian tham khảo; bài làm hiện chưa giới hạn thời gian.</p>
        </div>
        <QuizScriptReference text={data.referenceText ?? ""} onTextChange={referenceText => setData(d => ({ ...d, referenceText }))} />
      </aside>
    </fieldset>
    <footer className="quiz-editor-footer">
      <div className="quiz-publish-summary"><Info size={18} aria-hidden="true" /><div>
        <p className="font-semibold text-mod-text">{saved.attemptCount ? `Bộ quiz đã có ${saved.attemptCount} lượt làm` : saved.active && !dirty ? "Quiz đã được gắn với tập podcast" : "Cho phép người nghe làm quiz của tập này"}</p>
        <p>{saved.attemptCount ? "Bạn vẫn có thể lưu bản nháp, nhưng không thể thay bộ câu hỏi đã có lượt làm." : saved.active && !dirty ? "Người nghe có thể làm quiz khi tập podcast được công khai." : "Gắn bộ câu hỏi với tập podcast sau khi rà soát. Người nghe thấy quiz khi tập được công khai; lưu nháp chỉ giữ nội dung để tiếp tục biên soạn."}</p>
      </div></div>
      {saved.active && !dirty ? <CardBadge type="status" tone="success"><CheckCircle weight="fill" />Đã gắn với tập podcast</CardBadge> : saved.attemptCount ? <CardBadge type="status" tone="neutral">Quiz đã có lượt làm</CardBadge> : <Button variant="outline" disabled={busy} onClick={() => void publish()}>{busy ? "Đang xử lý…" : "Gắn quiz với tập podcast"}</Button>}
    </footer>
    <Dialog open={settings} onOpenChange={setSettings}><DialogContent className="max-h-[90dvh] overflow-y-auto border-mod-border bg-mod-surface font-moderator text-mod-text">
      <DialogHeader><DialogTitle>Thiết lập bộ quiz</DialogTitle><DialogDescription>Bổ sung mô tả và chọn mức điểm để người nghe được tính là đạt.</DialogDescription></DialogHeader>
      <div className="space-y-2">
        <Label htmlFor="quiz-description">Mô tả bộ quiz <span className="text-xs font-normal text-mod-text-low">Không bắt buộc</span></Label>
        <Textarea id="quiz-description" aria-describedby="quiz-description-help" maxLength={2000} value={data.description} onChange={e => setData(d => ({ ...d, description: e.target.value }))} placeholder="Bộ câu hỏi này giúp ôn lại nội dung gì?" />
        <p id="quiz-description-help" className="text-xs leading-5 text-mod-text-secondary">Ghi lại chủ đề hoặc mục đích của bộ câu hỏi để thuận tiện khi biên soạn.</p>
      </div>
      <div className="space-y-2">
        <Label htmlFor="quiz-pass-score">Điểm tối thiểu để đạt</Label>
        <ModeratorSelect id="quiz-pass-score" label="Điểm tối thiểu để đạt" value={String(data.passScorePercent)} onValueChange={v => setData(d => ({ ...d, passScorePercent: Number(v) }))} options={[50, 60, 70, 80, 90, 100].map(n => ({ value: String(n), label: `${n}% số điểm` }))} placeholder="Chọn mức điểm tối thiểu" />
        <p className="text-xs leading-5 text-mod-text-secondary">Bài làm đạt từ {data.passScorePercent}% số điểm trở lên được tính là đạt.</p>
      </div>
      <div className="border-t border-mod-border pt-4"><p className="mb-4 text-xs leading-5 text-mod-text-secondary">Cài đặt áp dụng cho bản đang soạn. Bấm “Lưu nháp” ở trình soạn để lưu lại các thay đổi.</p><DialogFooter><Button onClick={() => setSettings(false)}>Quay lại soạn câu hỏi</Button></DialogFooter></div>
    </DialogContent></Dialog>
    <QuizPreview open={preview} onOpenChange={setPreview} data={data} />
    <ConfirmationDialog {...confirmation} />
    <ConfirmationDialog request={blocker.state === "blocked" ? discardRequest : null} onResolve={confirmed => { if (blocker.state === "blocked") { if (confirmed) blocker.proceed(); else blocker.reset(); } }} />
  </section>;
}
