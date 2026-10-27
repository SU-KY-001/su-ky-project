import { useEffect, useRef, useState, type ReactElement } from "react";
import { useBlocker } from "react-router";
import type { QuizDraftData, QuizDraftQuestion, QuizWorkspace } from "@repo/shared";
import { validateReadyQuiz } from "@repo/shared";
import { ArrowLeft } from "@phosphor-icons/react/dist/icons/ArrowLeft";
import { ArrowUp } from "@phosphor-icons/react/dist/icons/ArrowUp";
import { ArrowDown } from "@phosphor-icons/react/dist/icons/ArrowDown";
import { Check } from "@phosphor-icons/react/dist/icons/Check";
import { Copy } from "@phosphor-icons/react/dist/icons/Copy";
import { Eye } from "@phosphor-icons/react/dist/icons/Eye";
import { FloppyDisk } from "@phosphor-icons/react/dist/icons/FloppyDisk";
import { Plus } from "@phosphor-icons/react/dist/icons/Plus";
import { Sparkle } from "@phosphor-icons/react/dist/icons/Sparkle";
import { Trash } from "@phosphor-icons/react/dist/icons/Trash";
import { BookOpen } from "@phosphor-icons/react/dist/icons/BookOpen";
import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle";
import { Clock } from "@phosphor-icons/react/dist/icons/Clock";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
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

const errorMessage = (error: unknown): string => error instanceof Error ? error.message : "Không thực hiện được. Vui lòng thử lại.";
const shapes = ["▲", "◆", "●", "■"];
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
      <div className="min-w-0 flex-1"><label className="sr-only" htmlFor="quiz-name">Tên bộ quiz</label><Input id="quiz-name" maxLength={200} value={data.title} disabled={busy} onChange={e => setData(d => ({ ...d, title: e.target.value }))} placeholder="Nhập tên bộ quiz…" className="border-transparent bg-transparent text-base font-bold shadow-none" /><p className="truncate px-3 text-xs text-mod-text-secondary">{initial.seriesTitle} / {initial.episodeTitle}</p></div>
      <span className="hidden text-xs text-mod-text-secondary md:inline" role="status">{busy ? "Đang xử lý…" : dirty ? "Chưa lưu thay đổi" : saved.revision ? "Đã lưu" : "Bản nháp mới"}</span>
      <Button variant="outline" disabled={busy} onClick={() => setSettings(true)}>Thiết lập</Button>
      <Button variant="outline" disabled={busy} onClick={() => setPreview(true)}><Eye /><span className="hidden sm:inline">Xem thử</span></Button>
      <Button disabled={busy} onClick={() => void persist()}><FloppyDisk /><span>Lưu nháp</span></Button>
    </header>
    {latest.data && latest.data.revision > saved.revision && <div className="flex flex-wrap items-center justify-between gap-3 border-b border-mod-border p-4 text-sm"><p>Bản nháp đã được cập nhật ở nơi khác. Nội dung bạn đang soạn vẫn được giữ nguyên.</p><Button variant="outline" disabled={busy} onClick={() => void (async () => {
      if (dirty && !await requestConfirmation({ title: "Tải bản nháp mới nhất?", description: "Thay đổi chưa lưu trên màn hình này sẽ được thay bằng bản nháp đã lưu ở nơi khác.", confirmLabel: "Tải bản mới" })) return;
      const remote = latest.data; if (remote) { remember(remote); setSelectedId(remote.data.questions[0].id); }
    })()}>Tải bản mới nhất</Button></div>}
    <fieldset disabled={busy} className="quiz-editor-body">
      <legend className="sr-only">Biên tập câu hỏi</legend>
      <aside className="quiz-question-sidebar mod-scrollbar-hidden" aria-label="Danh sách câu hỏi">
        <div className="flex items-center justify-between px-4 py-4"><strong className="text-sm">Câu hỏi</strong><span className="text-xs text-mod-text-secondary">{data.questions.length}/100</span></div>
        <ol className="quiz-question-list">
          {data.questions.map((q, i) => <li key={q.id}><button type="button" aria-current={q.id === question.id ? "step" : undefined} onClick={() => setSelectedId(q.id)} className={cn("quiz-question-thumb", q.id === question.id && "is-selected")}>
            <span className="flex items-center justify-between gap-2 text-[11px] font-semibold"><span>{i + 1}. Trắc nghiệm</span>{isComplete(q) ? <CheckCircle className="text-mod-success" weight="fill" aria-label="Đủ nội dung" /> : <span className="text-mod-text-low">Chưa đủ</span>}</span>
            <span className="my-3 line-clamp-2 block min-h-8 text-center text-xs">{q.text || "Nhập câu hỏi của bạn"}</span>
            <span className="grid grid-cols-2 gap-1" aria-hidden="true">{q.options.map((o, n) => <span key={n} className={cn("truncate rounded border border-mod-border p-1 text-[8px]", n === q.correctIndex && "border-mod-success text-mod-success")}>{o || `Đáp án ${"ABCD"[n]}`}</span>)}</span>
          </button></li>)}
        </ol>
        <div className="p-3"><Button className="w-full" disabled={data.questions.length >= 100} onClick={add}><Plus />Thêm câu hỏi</Button></div>
        <p className="hidden px-4 pb-5 text-xs leading-5 text-mod-text-secondary lg:block">{completed}/{data.questions.length} câu đủ nội dung.<br />Bản nháp có thể lưu khi chưa hoàn chỉnh.</p>
      </aside>
      <section className="quiz-question-canvas mod-scrollbar-hidden" aria-label="Nội dung câu hỏi đang chọn">
        <div className="mb-4 flex items-center justify-between gap-3 text-xs"><span className="font-semibold uppercase tracking-wider text-mod-primary">Câu {activeIndex + 1} / {data.questions.length}</span><CardBadge type="status" tone={question.evidence ? "info" : "neutral"}>{question.evidence ? "Từ kịch bản" : "Tự soạn"}</CardBadge></div>
        <label htmlFor="quiz-question" className="sr-only">Nội dung câu hỏi</label>
        <Textarea id="quiz-question" maxLength={2000} value={question.text} onChange={e => update({ ...question, text: e.target.value })} placeholder="Nhập câu hỏi của bạn tại đây…" className="quiz-question-title" />
        <div className="quiz-source-stage">
          <BookOpen size={34} weight="duotone" className="text-mod-primary/65" aria-hidden="true" />
          <p className="mt-3 font-semibold">{question.evidence ? "Câu hỏi có căn cứ từ kịch bản" : "Một câu hỏi hay bắt đầu từ câu chuyện"}</p>
          <p className="mt-2 max-w-md text-sm leading-6 text-mod-text-secondary">{question.evidence ? "Đối chiếu nội dung và đáp án với đoạn trích trước khi sử dụng." : "Chọn một ý trọng tâm của tập podcast, diễn đạt rõ ràng và viết bốn lựa chọn khác nhau."}</p>
          {question.evidence && <details className="mt-4 max-w-xl text-left text-sm"><summary className="cursor-pointer font-semibold text-mod-primary">Xem căn cứ trong kịch bản</summary><blockquote className="mt-3 border-l-2 border-mod-primary/30 pl-4 leading-6 text-mod-text-secondary">{question.evidence.quote}</blockquote></details>}
        </div>
        <fieldset><legend className="mb-3 text-xs text-mod-text-secondary">Nhập bốn đáp án và chọn một đáp án đúng.</legend><div className="quiz-answer-grid">
          {question.options.map((option, i) => <div key={i} className={cn("quiz-answer", question.correctIndex === i && "is-correct")}>
            <span className={`quiz-answer-symbol quiz-answer-symbol-${i}`} aria-hidden="true">{shapes[i]}</span>
            <label htmlFor={`quiz-answer-${i}`} className="sr-only">Đáp án {"ABCD"[i]}</label><Textarea id={`quiz-answer-${i}`} maxLength={1000} value={option} onChange={e => update({ ...question, options: question.options.map((o, n) => n === i ? e.target.value : o) })} placeholder={`Nhập đáp án ${"ABCD"[i]}`} className="quiz-answer-input" />
            <label className="quiz-correct-toggle"><input type="radio" name={`correct-${question.id}`} className="absolute inset-0 h-full w-full cursor-pointer opacity-0" checked={question.correctIndex === i} aria-label={`Chọn ${"ABCD"[i]} là đáp án đúng`} onChange={() => update({ ...question, correctIndex: i })} />{question.correctIndex === i && <Check weight="bold" className="pointer-events-none" aria-hidden="true" />}</label>
          </div>)}
        </div></fieldset>
      </section>
      <aside className="quiz-properties mod-scrollbar-hidden" aria-label="Thuộc tính câu hỏi">
        <h2 className="border-b border-mod-border pb-4 text-base font-bold">Thuộc tính câu hỏi</h2>
        <div className="quiz-property"><h3>Loại câu hỏi</h3><p className="rounded-lg border border-mod-border p-3 text-sm">Trắc nghiệm · Một đáp án đúng</p></div>
        <div className="quiz-property"><label htmlFor="quiz-time" className="flex items-center gap-2 text-sm font-semibold"><Clock />Thời gian gợi ý</label><ModeratorSelect id="quiz-time" label="Thời gian gợi ý" value={String(question.timeLimit)} onValueChange={value => update({ ...question, timeLimit: Number(value) })} options={[10, 20, 30, 60, 120].map(n => ({ value: String(n), label: `${n} giây` }))} placeholder="Chọn thời gian" /><button type="button" className="text-left text-xs text-mod-primary underline underline-offset-4" onClick={() => setData(d => ({ ...d, questions: d.questions.map(q => ({ ...q, timeLimit: question.timeLimit })) }))}>Áp dụng cho tất cả câu</button><p className="text-xs leading-5 text-mod-text-secondary">Gợi ý khi biên soạn; bài làm hiện chưa giới hạn thời gian.</p></div>
        <div className="quiz-property"><label htmlFor="quiz-explanation" className="text-sm font-semibold">Giải thích đáp án</label><Textarea id="quiz-explanation" maxLength={4000} value={question.explanation} onChange={e => update({ ...question, explanation: e.target.value })} placeholder="Vì sao đáp án này đúng?" className="min-h-28 text-sm" /></div>
        {stale && <p className="text-xs leading-5 text-mod-attention" role="status">Kịch bản đã thay đổi. Tạo lại các câu có căn cứ cũ trước khi sử dụng.</p>}
        <div className="quiz-property"><h3 className="flex items-center gap-2"><Sparkle />Tạo từ kịch bản</h3><p className="text-xs leading-5 text-mod-text-secondary">{currentScript ? `Bản lưu ngày ${new Date(currentScript.updatedAt).toLocaleDateString("vi-VN")}. Có thể dùng kịch bản nháp.` : "Tập chưa có kịch bản. Hãy lưu kịch bản trong phần sản xuất podcast."}</p>
          <div className="grid gap-2"><ModeratorSelect label="Số câu hỏi" value={count} onValueChange={setCount} options={[5, 6, 7, 8, 9, 10].map(n => ({ value: String(n), label: `${n} câu` }))} placeholder="Số câu" /><Button variant="outline" disabled={!currentScript} onClick={() => void runGeneration(false)}>Tạo bộ câu</Button></div>
          <Button variant="ghost" className="justify-start px-0 text-mod-primary" disabled={!currentScript} onClick={() => void runGeneration(true)}><Sparkle />Tạo lại câu này</Button>
          {mode === "script" && !dirty && !saved.revision && <p className="text-xs text-mod-text-secondary">Chọn số câu rồi bấm “Tạo bộ câu” để bắt đầu.</p>}
        </div>
        <div className="mt-auto flex flex-wrap gap-2 border-t border-mod-border pt-4">
          <Button variant="outline" size="sm" aria-label="Di chuyển câu lên" disabled={!activeIndex} onClick={() => setData(d => ({ ...d, questions: moveQuestion(d.questions, question.id, -1) }))}><ArrowUp /></Button>
          <Button variant="outline" size="sm" aria-label="Di chuyển câu xuống" disabled={activeIndex === data.questions.length - 1} onClick={() => setData(d => ({ ...d, questions: moveQuestion(d.questions, question.id, 1) }))}><ArrowDown /></Button>
          <Button variant="outline" size="sm" disabled={data.questions.length >= 100} onClick={() => { const q = cloneQuestion(question); setData(d => ({ ...d, questions: [...d.questions.slice(0, activeIndex + 1), q, ...d.questions.slice(activeIndex + 1)] })); setSelectedId(q.id); }}><Copy />Nhân bản</Button>
          <Button variant="ghost" size="sm" className="text-mod-danger" disabled={data.questions.length === 1} onClick={() => void remove()}><Trash />Xóa câu</Button>
        </div>
      </aside>
    </fieldset>
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-mod-border bg-mod-surface px-5 py-3"><span className="text-xs text-mod-text-secondary">{saved.attemptCount ? `${saved.attemptCount} lượt làm · Giữ nguyên quiz đang sử dụng` : "Rà soát nội dung trước khi đưa quiz vào sử dụng."}</span><Button variant="outline" disabled={busy || Boolean(saved.attemptCount) || saved.active && !dirty} onClick={() => void publish()}>{saved.active && !dirty ? "Đang sử dụng" : "Đưa vào sử dụng"}</Button></footer>
    {generate.isPending && <div role="status" className="flex items-center justify-between gap-3 border-t border-mod-border bg-mod-surface p-4 text-sm"><span>Đang tạo và kiểm tra câu hỏi từ kịch bản…</span><Button variant="outline" onClick={() => controller.current?.abort()}>Hủy tạo</Button></div>}
    <Dialog open={settings} onOpenChange={setSettings}><DialogContent className="font-moderator"><DialogHeader><DialogTitle>Thiết lập bộ quiz</DialogTitle><DialogDescription>Thông tin chung và tiêu chí hoàn thành.</DialogDescription></DialogHeader><label htmlFor="quiz-description" className="text-sm font-semibold">Mô tả</label><Textarea id="quiz-description" maxLength={2000} value={data.description} onChange={e => setData(d => ({ ...d, description: e.target.value }))} /><ModeratorSelect label="Điểm đạt" value={String(data.passScorePercent)} onValueChange={v => setData(d => ({ ...d, passScorePercent: Number(v) }))} options={[50, 60, 70, 80, 90, 100].map(n => ({ value: String(n), label: `Đạt từ ${n}%` }))} placeholder="Điểm đạt" /><Button onClick={() => setSettings(false)}>Xong</Button></DialogContent></Dialog>
    <QuizPreview open={preview} onOpenChange={setPreview} data={data} />
    <ConfirmationDialog {...confirmation} />
    <ConfirmationDialog request={blocker.state === "blocked" ? discardRequest : null} onResolve={confirmed => { if (blocker.state === "blocked") { if (confirmed) { controller.current?.abort(); blocker.proceed(); } else blocker.reset(); } }} />
  </section>;
}
