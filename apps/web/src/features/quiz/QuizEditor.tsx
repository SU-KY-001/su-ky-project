import { useEffect, useRef, useState, type ReactElement } from "react";
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
import { Sparkle } from "@phosphor-icons/react/dist/icons/Sparkle";
import { Trash } from "@phosphor-icons/react/dist/icons/Trash";
import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle";
import { Clock } from "@phosphor-icons/react/dist/icons/Clock";
import { GearSix } from "@phosphor-icons/react/dist/icons/GearSix";
import { Info } from "@phosphor-icons/react/dist/icons/Info";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { Label } from "@/shared/components/ui/label";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/shared/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/shared/components/ui/dialog";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { ConfirmationDialog } from "@/shared/components/common/ConfirmationDialog";
import { useConfirmationDialog } from "@/shared/hooks/useConfirmationDialog";
import { notify } from "@/shared/lib/notifications";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import { cn } from "@/lib/utils";
import { newQuestion, cloneQuestion, moveQuestion, replaceQuestion, isComplete } from "./quizState";
import { useQuizMutations, useQuizWorkspace } from "./useQuiz";
import { QuizPreview } from "./QuizPreview";
import { QuizScriptReference } from "./QuizScriptReference";

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : "Không thực hiện được. Vui lòng thử lại.";
const discardRequest = { title: "Rời màn soạn quiz?", description: "Các thay đổi chưa lưu sẽ mất. Bạn có thể quay lại để lưu bản nháp trước.", confirmLabel: "Rời màn hình", destructive: true };

export function QuizEditor({ initial, mode, onBack }: { initial: QuizWorkspace; mode: "manual" | "script"; onBack: () => void }): ReactElement {
  const [data, setData] = useState<QuizDraftData>(initial.data);
  const [saved, setSaved] = useState(initial);
  const [baseline, setBaseline] = useState(JSON.stringify(initial.data));
  const [selectedId, setSelectedId] = useState(initial.data.questions[0].id);
  const [count, setCount] = useState("5");
  const [preview, setPreview] = useState(false);
  const [settings, setSettings] = useState(false);
  const { requestConfirmation, confirmation } = useConfirmationDialog();
  const { save, activate, generate } = useQuizMutations();
  const latest = useQuizWorkspace(initial.episodeId);
  const controller = useRef<AbortController | null>(null);
  const currentScript = latest.data ? latest.data.script : saved.script;
  const dirty = JSON.stringify(data) !== baseline;
  const busy = save.isPending || activate.isPending || generate.isPending;
  const blocker = useBlocker(dirty || busy);
  const activeIndex = Math.max(0, data.questions.findIndex(q => q.id === selectedId));
  const question = data.questions[activeIndex];
  const stale = data.questions.some(q => q.evidence && q.evidence.scriptHash !== currentScript?.hash);
  const completed = data.questions.filter(isComplete).length;

  useEffect(() => {
    const unload = (event: BeforeUnloadEvent): void => { if (dirty || busy) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", unload); return () => window.removeEventListener("beforeunload", unload);
  }, [dirty, busy]);
  useEffect(() => () => controller.current?.abort(), []);
  useEffect(() => {
    if (latest.isError) notify.warning({ title: "Chưa đồng bộ được bộ quiz", description: "Nội dung đang soạn được giữ nguyên. Hãy kiểm tra kết nối rồi thử lại." }, `quiz-sync-${initial.episodeId}`);
  }, [latest.isError, latest.error, initial.episodeId]);

  const update = (q: QuizDraftQuestion): void => setData(d => ({ ...d, questions: d.questions.map(item => item.id === q.id ? q : item) }));
  const remember = (workspace: QuizWorkspace): void => {
    setSaved(workspace); setData(workspace.data); setBaseline(JSON.stringify(workspace.data));
  };
  const leave = async (): Promise<void> => {
    if ((dirty || busy) && !await requestConfirmation(discardRequest)) return;
    controller.current?.abort(); onBack();
  };
  const persist = async (): Promise<void> => {
    try { remember(await save.mutateAsync([initial.episodeId, saved.revision, data])); notify.success({ title: "Đã lưu bản nháp", description: "Bạn có thể quay lại tiếp tục soạn bất cứ lúc nào." }); }
    catch (error) { notify.error({ title: "Chưa lưu được quiz", description: errorMessage(error) }); }
  };
  const publish = async (): Promise<void> => {
    try { validateReadyQuiz(data); }
    catch (error) { notify.warning({ title: "Quiz chưa hoàn chỉnh", description: errorMessage(error) }); return; }
    if (stale) { notify.warning({ title: "Kịch bản đã thay đổi", description: "Hãy tạo lại các câu có căn cứ cũ trước khi sử dụng." }); return; }
    if (!await requestConfirmation({ title: "Đưa quiz vào sử dụng?", description: `Bộ quiz “${data.title}” sẽ được gắn với tập “${initial.episodeTitle}”. Người nghe có thể làm quiz khi tập được công khai.`, confirmLabel: "Đưa vào sử dụng" })) return;
    try {
      const draft = dirty || !saved.revision ? await save.mutateAsync([initial.episodeId, saved.revision, data]) : saved;
      remember(draft);
      remember(await activate.mutateAsync([initial.episodeId, draft.revision]));
      notify.success({ title: "Quiz đã sẵn sàng", description: "Bộ câu hỏi đã được gắn với tập podcast." });
    } catch (error) { notify.error({ title: "Chưa đưa quiz vào sử dụng", description: errorMessage(error) }); }
  };
  const runGeneration = async (single: boolean): Promise<void> => {
    if (!currentScript) return;
    if (single && !await requestConfirmation({ title: "Tạo lại câu hỏi này?", description: "Nội dung, đáp án và giải thích của câu đang chọn sẽ được thay bằng bản mới. Các câu khác được giữ nguyên.", confirmLabel: "Tạo lại câu" })) return;
    if (!single && data.questions.some(q => q.text.trim() || q.options.some(o => o.trim())) && !await requestConfirmation({ title: "Tạo bộ câu hỏi mới?", description: "Toàn bộ câu hỏi đang soạn sẽ được thay thế. Hãy lưu bản nháp trước nếu cần giữ lại.", confirmLabel: "Tạo bộ mới" })) return;
    controller.current = new AbortController();
    try {
      const result = await generate.mutateAsync([initial.episodeId, { count: single ? 1 : Number(count), scriptHash: currentScript.hash,
        exclude: single ? data.questions.map(q => q.text).filter(Boolean) : [] }, controller.current.signal]);
      setData(d => ({ ...d, title: d.title || `Quiz · ${initial.episodeTitle}`, questions: single ? replaceQuestion(d.questions, question.id, result.questions[0]) : result.questions }));
      if (!single) setSelectedId(result.questions[0].id);
      notify.success({ title: single ? "Đã tạo lại câu hỏi" : `Đã tạo ${result.questions.length} câu hỏi`, description: "Hãy kiểm tra đáp án và căn cứ trước khi sử dụng." });
    } catch (error) { if (!controller.current.signal.aborted) notify.error({ title: "Chưa tạo được câu hỏi", description: errorMessage(error) }); }
    finally { controller.current = null; }
  };
  const add = (): void => { const q = newQuestion(); setData(d => ({ ...d, questions: [...d.questions, q] })); setSelectedId(q.id); };
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
        <Button disabled={busy} onClick={() => void persist()}><FloppyDisk />Lưu nháp</Button>
      </div>
    </header>
    <div className="quiz-editor-titlebar">
      <div className="quiz-editor-title-field">
        <Label className="sr-only" htmlFor="quiz-name">Tên bộ quiz</Label>
        <Input id="quiz-name" maxLength={200} value={data.title} disabled={busy} onChange={e => setData(d => ({ ...d, title: e.target.value }))} placeholder="Đặt tên bộ quiz…" className="h-11 font-semibold md:text-lg" />
        <p title={`${initial.seriesTitle} / ${initial.episodeTitle}`}>Podcast · {initial.seriesTitle} / {initial.episodeTitle}</p>
      </div>
      <Button variant="outline" disabled={busy} onClick={() => setSettings(true)}><GearSix />Thiết lập</Button>
    </div>
    {latest.data && latest.data.revision > saved.revision && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mod-border p-4 text-sm"><p>Bản nháp đã được cập nhật ở nơi khác. Nội dung bạn đang soạn vẫn được giữ nguyên.</p><Button variant="outline" disabled={busy} onClick={() => void (async () => {
      if (dirty && !await requestConfirmation({ title: "Tải bản nháp mới nhất?", description: "Thay đổi chưa lưu trên màn hình này sẽ được thay bằng bản nháp đã lưu ở nơi khác.", confirmLabel: "Tải bản mới" })) return;
      const remote = latest.data; if (remote) { remember(remote); setSelectedId(remote.data.questions[0].id); }
    })()}>Tải bản mới nhất</Button></div>}
    <fieldset disabled={busy} className="quiz-editor-body">
      <legend className="sr-only">Biên tập câu hỏi</legend>
      <aside className="quiz-question-sidebar" aria-label="Danh sách câu hỏi">
        <div className="quiz-outline-heading"><h2>Câu hỏi</h2><span>{data.questions.length} / 100</span></div>
        <ol className="quiz-question-list">
          {data.questions.map((q, i) => <li key={q.id}><Button type="button" variant="ghost" disabled={busy} aria-current={q.id === question.id ? "step" : undefined} onClick={() => setSelectedId(q.id)} className={cn("quiz-question-link", q.id === question.id && "is-selected")}>
            <span className="quiz-question-number">{String(i + 1).padStart(2, "0")}</span>
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
          <Button variant="ghost" size="sm" className="ml-auto text-mod-danger" disabled={busy || data.questions.length === 1} onClick={() => void remove()}><Trash />Xóa câu</Button>
        </div>
      </section>
      <aside className="quiz-properties" aria-label="Kịch bản tham chiếu">
        <QuizScriptReference key={question.id} episodeId={initial.episodeId} episodeTitle={initial.episodeTitle} script={currentScript} evidence={question.evidence} questionNumber={activeIndex + 1} />
        <div className="quiz-generation">
          <div className="quiz-panel-heading"><h2>Tạo từ kịch bản</h2><p>Tạo gợi ý câu hỏi từ nội dung tập podcast. Rà soát trước khi sử dụng.</p></div>
          {stale && <p className="text-xs leading-5 text-mod-attention" role="status">Kịch bản đã thay đổi. Tạo lại các câu có căn cứ cũ trước khi sử dụng.</p>}
          <div className="quiz-generation-controls"><ModeratorSelect label="Số câu hỏi" value={count} onValueChange={setCount} options={[5, 6, 7, 8, 9, 10].map(n => ({ value: String(n), label: `${n} câu` }))} placeholder="Số câu" disabled={busy || !currentScript} /><Button variant="outline" disabled={busy || !currentScript} onClick={() => void runGeneration(false)}><Sparkle />Tạo bộ câu hỏi</Button></div>
          <Button variant="ghost" className="w-full" disabled={busy || !currentScript} onClick={() => void runGeneration(true)}><Sparkle />Tạo lại câu này</Button>
          {mode === "script" && !dirty && !saved.revision && <p className="text-xs text-mod-text-secondary">Chọn số câu rồi bấm “Tạo bộ câu hỏi” để bắt đầu.</p>}
        </div>
        <div className="quiz-time-guidance">
          <Accordion type="single" collapsible><AccordionItem value="time" className="border-b-0">
            <AccordionTrigger disabled={busy}><span className="flex items-center gap-2"><Clock className="shrink-0" />Thời gian gợi ý · {question.timeLimit} giây</span></AccordionTrigger>
            <AccordionContent className="space-y-3"><ModeratorSelect id="quiz-time" label="Thời gian gợi ý" value={String(question.timeLimit)} onValueChange={value => update({ ...question, timeLimit: Number(value) })} options={[10, 20, 30, 60, 120].map(n => ({ value: String(n), label: `${n} giây` }))} placeholder="Chọn thời gian" disabled={busy} /><Button variant="link" size="sm" disabled={busy} onClick={() => setData(d => ({ ...d, questions: d.questions.map(q => ({ ...q, timeLimit: question.timeLimit })) }))}>Áp dụng cho tất cả câu</Button></AccordionContent>
          </AccordionItem></Accordion>
          <p>Chỉ hỗ trợ biên soạn, không giới hạn thời gian làm bài.</p>
        </div>
      </aside>
    </fieldset>
    <footer className="quiz-editor-footer"><span><Info size={16} aria-hidden="true" />{saved.attemptCount ? `${saved.attemptCount} lượt làm · Giữ nguyên quiz đang sử dụng` : "Rà soát toàn bộ câu hỏi trước khi sử dụng."}</span><Button variant="outline" disabled={busy || Boolean(saved.attemptCount) || saved.active && !dirty} onClick={() => void publish()}>{saved.active && !dirty ? "Đang sử dụng" : "Đưa vào sử dụng"}</Button></footer>
    {generate.isPending && <div role="status" className="flex items-center justify-between gap-3 border-t border-mod-border bg-mod-surface p-4 text-sm"><span>Đang tạo và kiểm tra câu hỏi từ kịch bản…</span><Button variant="outline" onClick={() => controller.current?.abort()}>Hủy tạo</Button></div>}
    <Dialog open={settings} onOpenChange={setSettings}><DialogContent className="font-moderator"><DialogHeader><DialogTitle>Thiết lập bộ quiz</DialogTitle><DialogDescription>Thông tin chung và tiêu chí hoàn thành.</DialogDescription></DialogHeader><label htmlFor="quiz-description" className="text-sm font-semibold">Mô tả</label><Textarea id="quiz-description" maxLength={2000} value={data.description} onChange={e => setData(d => ({ ...d, description: e.target.value }))} /><ModeratorSelect label="Điểm đạt" value={String(data.passScorePercent)} onValueChange={v => setData(d => ({ ...d, passScorePercent: Number(v) }))} options={[50, 60, 70, 80, 90, 100].map(n => ({ value: String(n), label: `Đạt từ ${n}%` }))} placeholder="Điểm đạt" /><Button onClick={() => setSettings(false)}>Xong</Button></DialogContent></Dialog>
    <QuizPreview open={preview} onOpenChange={setPreview} data={data} />
    <ConfirmationDialog {...confirmation} />
    <ConfirmationDialog request={blocker.state === "blocked" ? discardRequest : null} onResolve={confirmed => { if (blocker.state === "blocked") { if (confirmed) { controller.current?.abort(); blocker.proceed(); } else blocker.reset(); } }} />
  </section>;
}
