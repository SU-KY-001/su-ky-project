import { useMemo, useState, type ReactElement } from "react";
import {
  ArrowLeft,
  Check,
  Clock,
  Copy,
  DotsThree,
  Headphones,
  ListNumbers,
  PencilSimple,
  Plus,
  Question,
  Trash,
  UsersThree,
} from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { notify } from "@/shared/lib/notifications";
import { cn } from "@/lib/utils";
import { CreationPage, FormField, formField } from "@/features/moderator/components/CreationPage";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import { mockQuizSets, type MockQuizQuestion, type MockQuizSet } from "./mockData";

interface QuizDraft {
  title: string;
  description: string;
  seriesTitle: string;
  episodeTitle: string;
  passScore: string;
  questions: MockQuizQuestion[];
}

const answerLetters = ["A", "B", "C", "D"];

function blankQuestion(index: number): MockQuizQuestion {
  const id = `draft-${Date.now()}-${index}`;
  return {
    id,
    text: "",
    correctOptionId: `${id}-1`,
    explanation: "",
    timeLimit: 20,
    options: answerLetters.map((_, optionIndex) => ({ id: `${id}-${optionIndex + 1}`, text: "" })),
  };
}

function toDraft(quiz?: MockQuizSet): QuizDraft {
  return quiz ? {
    title: quiz.title,
    description: quiz.description,
    seriesTitle: quiz.seriesTitle,
    episodeTitle: quiz.episodeTitle,
    passScore: "80",
    questions: quiz.questions.map((item) => ({ ...item, options: item.options.map((option) => ({ ...option })) })),
  } : {
    title: "",
    description: "",
    seriesTitle: mockQuizSets[0].seriesTitle,
    episodeTitle: mockQuizSets[0].episodeTitle,
    passScore: "80",
    questions: [blankQuestion(1)],
  };
}

function QuizList({ onCreate, onEdit }: { onCreate: () => void; onEdit: (quiz: MockQuizSet) => void }): ReactElement {
  return (
    <section className="flex w-full min-w-0 flex-col gap-6 font-moderator">
      <header className="flex flex-col gap-4 border-b border-mod-border pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[.14em] text-mod-primary">Tương tác sau khi nghe</p>
          <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-mod-text">Bộ quiz</h1>
          <p className="mt-1 max-w-2xl text-sm leading-6 text-mod-text-secondary">Tạo bộ câu hỏi gắn với series hoặc tập podcast để người nghe ôn lại kiến thức.</p>
        </div>
        <Button onClick={onCreate} className="bg-mod-primary text-white hover:bg-mod-primary-hover"><Plus weight="bold" aria-hidden="true" /> Tạo quiz</Button>
      </header>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {mockQuizSets.map((quiz) => (
          <article key={quiz.id} className="group flex min-h-64 flex-col overflow-hidden rounded-xl border border-mod-border bg-mod-surface shadow-sm transition hover:-translate-y-0.5 hover:border-mod-primary/40 hover:shadow-md">
            <div className="relative flex h-28 items-center justify-center overflow-hidden text-white" style={{ background: `linear-gradient(135deg, ${quiz.accent}, color-mix(in srgb, ${quiz.accent} 58%, #0f172a))` }}>
              <Question size={38} weight="duotone" aria-hidden="true" />
              <span className="absolute bottom-3 left-4 rounded-md bg-black/20 px-2 py-1 text-[10px] font-bold uppercase tracking-widest backdrop-blur-sm">{quiz.topic}</span>
              <span className="absolute right-4 top-3 rounded-full bg-white/15 px-2.5 py-1 text-xs font-bold backdrop-blur-sm">{quiz.questions.length} câu</span>
            </div>
            <div className="flex flex-1 flex-col p-4">
              <h2 className="line-clamp-2 text-base font-bold leading-6 text-mod-text">{quiz.title}</h2>
              <p className="mt-2 flex items-center gap-2 text-xs text-mod-text-secondary"><Headphones aria-hidden="true" /><span className="truncate">{quiz.seriesTitle}</span></p>
              <div className="mt-auto flex items-center justify-between border-t border-mod-border pt-4">
                <span className="flex items-center gap-1.5 text-xs text-mod-text-secondary"><UsersThree aria-hidden="true" /> {quiz.plays} lượt chơi</span>
                <Button size="sm" variant="ghost" onClick={() => onEdit(quiz)} className="text-mod-primary"><PencilSimple aria-hidden="true" /> Chỉnh sửa</Button>
              </div>
            </div>
          </article>
        ))}
        <button type="button" onClick={onCreate} className="grid min-h-64 place-content-center justify-items-center rounded-xl border-2 border-dashed border-mod-border bg-mod-canvas-accent/40 p-6 text-center text-mod-text-secondary transition-colors hover:border-mod-primary hover:bg-mod-canvas-accent hover:text-mod-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-mod-primary">
          <span className="grid size-12 place-items-center rounded-full bg-mod-surface shadow-sm"><Plus size={24} weight="bold" aria-hidden="true" /></span>
          <strong className="mt-4 text-sm">Tạo bộ quiz mới</strong>
          <span className="mt-1 text-xs font-normal">Bắt đầu từ câu hỏi trống</span>
        </button>
      </div>
    </section>
  );
}

function QuestionNavigator({ questions, activeIndex, onSelect, onAdd, onClone, onDelete }: { questions: MockQuizQuestion[]; activeIndex: number; onSelect: (index: number) => void; onAdd: () => void; onClone: (index: number) => void; onDelete: (index: number) => void }): ReactElement {
  return (
    <aside className="border-b border-mod-border bg-mod-canvas-accent/60 lg:border-b-0 lg:border-r">
      <div className="flex items-center justify-between border-b border-mod-border px-4 py-3">
        <strong className="text-xs font-bold uppercase tracking-wider text-mod-text-secondary">Câu hỏi ({questions.length})</strong>
        <Button size="icon-sm" variant="ghost" onClick={onAdd} aria-label="Thêm câu hỏi"><Plus aria-hidden="true" /></Button>
      </div>
      <ol className="flex max-h-56 gap-2 overflow-x-auto p-3 lg:max-h-[650px] lg:flex-col lg:overflow-y-auto">
        {questions.map((question, index) => (
          <li key={question.id} className="w-44 shrink-0 lg:w-auto">
            <button type="button" onClick={() => onSelect(index)} className={cn("w-full rounded-lg border bg-mod-surface p-3 text-left shadow-xs transition", activeIndex === index ? "border-mod-primary ring-2 ring-mod-primary/15" : "border-mod-border hover:border-mod-text-low")}>
              <span className="flex items-center justify-between gap-2 text-[11px] font-bold text-mod-text-secondary"><span>Câu {index + 1}</span><DotsThree aria-hidden="true" /></span>
              <span className="mt-2 line-clamp-2 block min-h-9 text-xs font-semibold leading-5 text-mod-text">{question.text || "Chưa nhập câu hỏi"}</span>
              <span className="mt-3 flex items-center gap-1 text-[10px] text-mod-text-low"><Clock aria-hidden="true" /> {question.timeLimit} giây</span>
            </button>
            {activeIndex === index && <div className="mt-1 flex justify-end gap-1"><Button size="icon-sm" variant="ghost" onClick={() => onClone(index)} aria-label={`Nhân bản câu ${index + 1}`}><Copy aria-hidden="true" /></Button><Button size="icon-sm" variant="ghost" disabled={questions.length === 1} onClick={() => onDelete(index)} aria-label={`Xóa câu ${index + 1}`} className="text-red-600"><Trash aria-hidden="true" /></Button></div>}
          </li>
        ))}
      </ol>
      <div className="p-3"><Button variant="outline" className="w-full border-dashed" onClick={onAdd}><Plus aria-hidden="true" /> Thêm câu hỏi</Button></div>
    </aside>
  );
}

function QuestionEditor({ question, index, onChange }: { question: MockQuizQuestion; index: number; onChange: (question: MockQuizQuestion) => void }): ReactElement {
  const updateOption = (optionIndex: number, text: string): void => onChange({ ...question, options: question.options.map((option, currentIndex) => currentIndex === optionIndex ? { ...option, text } : option) });
  return (
    <div className="min-w-0 p-4 sm:p-6 xl:p-8">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div><p className="text-xs font-bold uppercase tracking-wider text-mod-primary">Câu {index + 1}</p><h2 className="mt-1 text-xl font-extrabold text-mod-text">Soạn câu hỏi</h2></div>
          <ModeratorSelect label="Thời gian trả lời" value={String(question.timeLimit)} onValueChange={(value) => onChange({ ...question, timeLimit: Number(value) })} placeholder="Chọn thời gian" options={[10, 20, 30, 60].map((value) => ({ value: String(value), label: `${value} giây` }))} />
        </div>

        <FormField htmlFor={`question-${question.id}`} label="Nội dung câu hỏi">
          <Textarea id={`question-${question.id}`} value={question.text} onChange={(event) => onChange({ ...question, text: event.target.value })} placeholder="Ví dụ: Chiến dịch Điện Biên Phủ diễn ra trong bao nhiêu ngày đêm?" className="min-h-28 border-mod-text-low/50 bg-mod-surface text-base font-semibold text-mod-text focus-visible:border-mod-primary focus-visible:ring-mod-primary/20" />
        </FormField>

        <fieldset className="mt-7">
          <legend className="text-sm font-bold text-mod-text">Đáp án <span className="font-normal text-mod-text-secondary">· Chọn một đáp án đúng</span></legend>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {question.options.map((option, optionIndex) => {
              const correct = option.id === question.correctOptionId;
              return (
                <label key={option.id} className={cn("flex min-h-20 cursor-text items-center gap-3 rounded-xl border-2 bg-mod-surface p-3 transition", correct ? "border-mod-success bg-green-50/60" : "border-mod-border focus-within:border-mod-primary/60")}>
                  <button type="button" onClick={() => onChange({ ...question, correctOptionId: option.id })} className={cn("grid size-9 shrink-0 place-items-center rounded-lg text-sm font-extrabold", correct ? "bg-mod-success text-white" : "bg-mod-canvas-accent text-mod-text-secondary")} aria-label={`Đánh dấu đáp án ${answerLetters[optionIndex]} là đáp án đúng`}>{correct ? <Check weight="bold" /> : answerLetters[optionIndex]}</button>
                  <Input value={option.text} onChange={(event) => updateOption(optionIndex, event.target.value)} placeholder={`Nhập đáp án ${answerLetters[optionIndex]}`} className="h-auto border-0 bg-transparent px-0 py-2 text-sm font-semibold text-mod-text shadow-none" />
                </label>
              );
            })}
          </div>
        </fieldset>

        <div className="mt-7"><FormField htmlFor={`explanation-${question.id}`} label="Giải thích đáp án" hint="Hiển thị sau khi người chơi trả lời để củng cố kiến thức."><Textarea id={`explanation-${question.id}`} autoGrow value={question.explanation} onChange={(event) => onChange({ ...question, explanation: event.target.value })} placeholder="Giải thích ngắn gọn vì sao đây là đáp án đúng…" className="border-mod-text-low/50 bg-mod-surface text-mod-text focus-visible:border-mod-primary focus-visible:ring-mod-primary/20" /></FormField></div>
      </div>
    </div>
  );
}

function QuizBuilder({ initialQuiz, onBack }: { initialQuiz?: MockQuizSet; onBack: () => void }): ReactElement {
  const [draft, setDraft] = useState(() => toDraft(initialQuiz));
  const [activeIndex, setActiveIndex] = useState(0);
  const seriesOptions = useMemo(() => [...new Set(mockQuizSets.map((quiz) => quiz.seriesTitle))].map((value) => ({ value, label: value })), []);
  const episodeOptions = useMemo(() => mockQuizSets.filter((quiz) => quiz.seriesTitle === draft.seriesTitle).map((quiz) => ({ value: quiz.episodeTitle, label: quiz.episodeTitle })), [draft.seriesTitle]);
  const currentQuestion = draft.questions[activeIndex];

  const updateQuestion = (question: MockQuizQuestion): void => setDraft((value) => ({ ...value, questions: value.questions.map((item, index) => index === activeIndex ? question : item) }));
  const addQuestion = (): void => setDraft((value) => { const questions = [...value.questions, blankQuestion(value.questions.length + 1)]; setActiveIndex(questions.length - 1); return { ...value, questions }; });
  const cloneQuestion = (index: number): void => setDraft((value) => { const source = value.questions[index]; const clone = blankQuestion(value.questions.length + 1); const copy = { ...source, id: clone.id, options: source.options.map((option, optionIndex) => ({ ...option, id: clone.options[optionIndex].id })), correctOptionId: clone.options[source.options.findIndex((option) => option.id === source.correctOptionId)].id }; const questions = [...value.questions.slice(0, index + 1), copy, ...value.questions.slice(index + 1)]; setActiveIndex(index + 1); return { ...value, questions }; });
  const deleteQuestion = (index: number): void => setDraft((value) => ({ ...value, questions: value.questions.filter((_, currentIndex) => currentIndex !== index) }));
  const save = (): void => {
    const incomplete = !draft.title.trim() || draft.questions.some((item) => !item.text.trim() || item.options.some((option) => !option.text.trim()));
    if (incomplete) { notify.warning({ title: "Quiz còn thiếu nội dung", description: "Vui lòng nhập tiêu đề, câu hỏi và đầy đủ các đáp án." }); return; }
    notify.success({ title: initialQuiz ? "Đã cập nhật bản nháp quiz" : "Đã tạo bản nháp quiz", description: "Dữ liệu đang được lưu ở chế độ mock trong phiên làm việc này." });
    onBack();
  };

  return (
    <CreationPage title={initialQuiz ? "Chỉnh sửa bộ quiz" : "Tạo bộ quiz mới"} onBack={onBack} description="Thiết kế câu hỏi theo kiểu Kahoot và gắn bộ quiz với nội dung podcast.">
      <div className="grid gap-4 rounded-xl border border-mod-border bg-mod-surface p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
        <FormField htmlFor="quiz-title" label="Tên bộ quiz"><Input id="quiz-title" value={draft.title} onChange={(event) => setDraft((value) => ({ ...value, title: event.target.value }))} placeholder="Tên bộ quiz" className={formField} /></FormField>
        <FormField htmlFor="quiz-series" label="Series podcast"><ModeratorSelect id="quiz-series" label="Series podcast" value={draft.seriesTitle} onValueChange={(seriesTitle) => { const episodeTitle = mockQuizSets.find((quiz) => quiz.seriesTitle === seriesTitle)?.episodeTitle ?? ""; setDraft((value) => ({ ...value, seriesTitle, episodeTitle })); }} placeholder="Chọn series" options={seriesOptions} /></FormField>
        <FormField htmlFor="quiz-episode" label="Tập podcast"><ModeratorSelect id="quiz-episode" label="Tập podcast" value={draft.episodeTitle} onValueChange={(episodeTitle) => setDraft((value) => ({ ...value, episodeTitle }))} placeholder="Chọn tập" options={episodeOptions} /></FormField>
        <FormField htmlFor="quiz-score" label="Điểm đạt"><ModeratorSelect id="quiz-score" label="Điểm đạt" value={draft.passScore} onValueChange={(passScore) => setDraft((value) => ({ ...value, passScore }))} placeholder="Chọn điểm đạt" options={[50, 60, 70, 80, 90].map((value) => ({ value: String(value), label: `${value}%` }))} /></FormField>
        <div className="md:col-span-2 xl:col-span-4"><FormField htmlFor="quiz-description" label="Mô tả ngắn"><Input id="quiz-description" value={draft.description} onChange={(event) => setDraft((value) => ({ ...value, description: event.target.value }))} placeholder="Giới thiệu nội dung bộ câu hỏi" className={formField} /></FormField></div>
      </div>

      <div className="grid min-w-0 overflow-hidden rounded-xl border border-mod-border bg-mod-surface shadow-sm lg:grid-cols-[230px_minmax(0,1fr)]">
        <QuestionNavigator questions={draft.questions} activeIndex={activeIndex} onSelect={setActiveIndex} onAdd={addQuestion} onClone={cloneQuestion} onDelete={(index) => { deleteQuestion(index); setActiveIndex(Math.max(0, Math.min(index, draft.questions.length - 2))); }} />
        <QuestionEditor question={currentQuestion} index={activeIndex} onChange={updateQuestion} />
      </div>

      <footer className="sticky bottom-3 z-10 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-mod-border bg-mod-surface/95 p-3 shadow-lg backdrop-blur">
        <span className="flex items-center gap-2 text-xs text-mod-text-secondary"><ListNumbers aria-hidden="true" /> {draft.questions.length} câu hỏi · Điểm đạt {draft.passScore}%</span>
        <div className="flex gap-2"><Button variant="outline" onClick={onBack}><ArrowLeft aria-hidden="true" /> Hủy</Button><Button onClick={save} className="bg-mod-primary text-white hover:bg-mod-primary-hover">Lưu bản nháp</Button></div>
      </footer>
    </CreationPage>
  );
}

export function QuizWorkspace(): ReactElement {
  const [editing, setEditing] = useState<MockQuizSet | "new" | null>(null);
  if (editing) return <QuizBuilder initialQuiz={editing === "new" ? undefined : editing} onBack={() => setEditing(null)} />;
  return <QuizList onCreate={() => setEditing("new")} onEdit={setEditing} />;
}
