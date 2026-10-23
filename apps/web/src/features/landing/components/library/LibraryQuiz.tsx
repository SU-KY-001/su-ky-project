import { useMemo, useState, type ReactElement } from "react";
import {
  ArrowCounterClockwise,
  ArrowRight,
  Brain,
  Cards,
  CheckCircle,
  Clock,
  DotsThree,
  FunnelSimple,
  Headphones,
  SquaresFour,
  Trophy,
  UsersThree,
  XCircle,
} from "@phosphor-icons/react";
import { Badge } from "@/shared/components/ui/badge";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { mockQuizSets, quizTopics, type MockQuizSet, type QuizTopic } from "@/features/quiz/mockData";
import "./quiz-library.css";

const answerLetters = ["A", "B", "C", "D"];

function QuizCover({ quiz }: { quiz: MockQuizSet }): ReactElement {
  return (
    <div className="quiz-set-cover" style={{ "--quiz-accent": quiz.accent } as React.CSSProperties}>
      <div className="quiz-cover-orbit quiz-cover-orbit-one" />
      <div className="quiz-cover-orbit quiz-cover-orbit-two" />
      <Brain size={39} weight="duotone" aria-hidden="true" />
      <span>{quiz.topic}</span>
      <strong>{quiz.questions.length}</strong>
      <small>câu hỏi</small>
    </div>
  );
}

function QuizSetCard({ quiz, onPlay }: { quiz: MockQuizSet; onPlay: () => void }): ReactElement {
  return (
    <article className="quiz-set-card">
      <button type="button" className="quiz-set-card-button" onClick={onPlay} aria-label={`Chơi bộ quiz ${quiz.title}`}>
        <div className="quiz-set-copy">
          <div className="quiz-set-topline">
            <span className="quiz-set-icon"><Cards size={22} weight="duotone" aria-hidden="true" /></span>
            <span className="quiz-set-activity"><UsersThree aria-hidden="true" /> {quiz.plays} lượt chơi</span>
          </div>
          <h3>{quiz.title}</h3>
          <div className="quiz-series-line"><Headphones aria-hidden="true" /><span>{quiz.seriesTitle}</span></div>
          <div className="quiz-card-footer"><span>{quiz.questions.length} câu hỏi · {quiz.author}</span><DotsThree size={18} weight="bold" aria-hidden="true" /></div>
        </div>
      </button>
    </article>
  );
}

function QuizResult({ quiz, score, onRetry, onClose }: { quiz: MockQuizSet; score: number; onRetry: () => void; onClose: () => void }): ReactElement {
  const percent = Math.round((score / quiz.questions.length) * 100);
  return (
    <div className="quiz-result-view">
      <div className="quiz-result-medal"><Trophy size={52} weight="fill" aria-hidden="true" /></div>
      <p className="quiz-kicker">Hoàn thành thử thách</p>
      <h3>{percent >= 80 ? "Xuất sắc!" : percent >= 50 ? "Bạn làm khá tốt!" : "Thử lại để nhớ lâu hơn nhé!"}</h3>
      <p className="quiz-result-score">{score}<span>/{quiz.questions.length}</span></p>
      <p className="quiz-result-note">Bạn trả lời đúng {percent}% số câu hỏi trong bộ “{quiz.title}”.</p>
      <div className="quiz-result-actions">
        <Button variant="outline" onClick={onClose}>Về danh sách</Button>
        <Button onClick={onRetry}><ArrowCounterClockwise aria-hidden="true" /> Chơi lại</Button>
      </div>
    </div>
  );
}

function QuizPlayer({ quiz, onClose }: { quiz: MockQuizSet; onClose: () => void }): ReactElement {
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<string | null>(null);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);
  const current = quiz.questions[index];
  const progress = ((index + 1) / quiz.questions.length) * 100;

  const retry = (): void => {
    setStarted(true);
    setIndex(0);
    setSelected(null);
    setScore(0);
    setFinished(false);
  };

  const choose = (optionId: string): void => {
    if (selected) return;
    setSelected(optionId);
    if (optionId === current.correctOptionId) setScore((value) => value + 1);
  };

  const next = (): void => {
    if (index === quiz.questions.length - 1) {
      setFinished(true);
      return;
    }
    setIndex((value) => value + 1);
    setSelected(null);
  };

  if (!started) {
    return (
      <div className="quiz-intro">
        <QuizCover quiz={quiz} />
        <Badge variant="outline" className="border-line bg-paper-soft text-ink-soft">{quiz.topic}</Badge>
        <h3>{quiz.title}</h3>
        <p>{quiz.description}</p>
        <div className="quiz-intro-facts">
          <span><SquaresFour aria-hidden="true" /> {quiz.questions.length} câu hỏi</span>
          <span><Clock aria-hidden="true" /> Khoảng {Math.ceil(quiz.questions.length * 0.5)} phút</span>
          <span><Headphones aria-hidden="true" /> {quiz.episodeTitle}</span>
        </div>
        <Button size="lg" onClick={() => setStarted(true)}>Bắt đầu chơi <ArrowRight aria-hidden="true" /></Button>
      </div>
    );
  }

  if (finished) return <QuizResult quiz={quiz} score={score} onRetry={retry} onClose={onClose} />;

  const isCorrect = selected === current.correctOptionId;
  return (
    <div className="quiz-play-view">
      <div className="quiz-play-header">
        <div>
          <span className="quiz-play-kicker">Phiếu ôn tập · {quiz.topic}</span>
          <strong>Câu hỏi {index + 1} <small>trên {quiz.questions.length}</small></strong>
        </div>
        <span className="quiz-time-chip"><Clock aria-hidden="true" /> {current.timeLimit} giây</span>
      </div>
      <div className="quiz-progress"><span style={{ width: `${progress}%` }} /></div>
      <div className="quiz-question-panel">
        <span className="quiz-question-number">{String(index + 1).padStart(2, "0")}</span>
        <p>{current.text}</p>
      </div>
      <div className="quiz-answer-grid">
        {current.options.map((option, optionIndex) => {
          const correct = option.id === current.correctOptionId;
          const picked = option.id === selected;
          const state = selected ? correct ? "correct" : picked ? "wrong" : "muted" : "idle";
          return (
            <button key={option.id} type="button" className="quiz-answer" data-state={state} onClick={() => choose(option.id)} disabled={Boolean(selected)}>
              <span className="quiz-answer-letter">{answerLetters[optionIndex]}</span>
              <span className="quiz-answer-text">{option.text}</span>
              {state === "correct" && <CheckCircle weight="fill" aria-label="Đáp án đúng" />}
              {state === "wrong" && <XCircle weight="fill" aria-label="Đáp án đã chọn chưa đúng" />}
            </button>
          );
        })}
      </div>
      {selected && (
        <div className="quiz-feedback" data-correct={isCorrect}>
          <div><strong>{isCorrect ? "Chính xác!" : "Chưa đúng rồi"}</strong><p>{current.explanation}</p></div>
          <Button onClick={next}>{index === quiz.questions.length - 1 ? "Xem kết quả" : "Câu tiếp theo"} <ArrowRight aria-hidden="true" /></Button>
        </div>
      )}
    </div>
  );
}

export function LibraryQuiz(): ReactElement {
  const [topic, setTopic] = useState<QuizTopic>("Tất cả");
  const [activeQuiz, setActiveQuiz] = useState<MockQuizSet | null>(null);
  const filtered = useMemo(() => topic === "Tất cả" ? mockQuizSets : mockQuizSets.filter((quiz) => quiz.topic === topic), [topic]);

  return (
    <div className="quiz-library">
      <div className="quiz-library-toolbar">
        <div>
          <p className="quiz-library-eyebrow">Học bằng thử thách</p>
          <h3>Chọn một bộ quiz để bắt đầu</h3>
          <p>Mỗi bộ câu hỏi được biên soạn theo nội dung của một series podcast.</p>
        </div>
        <div className="quiz-topic-filter">
          <label htmlFor="quiz-topic-select"><FunnelSimple weight="bold" aria-hidden="true" /> Lọc theo chủ đề</label>
          <Select value={topic} onValueChange={(value) => setTopic(value as QuizTopic)}>
            <SelectTrigger id="quiz-topic-select" aria-label="Lọc quiz theo chủ đề" className="quiz-topic-select">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="quiz-topic-menu border-[#dedbd6] bg-white font-body text-[#2d2926]">
              {quizTopics.map((item) => <SelectItem key={item} value={item} className="quiz-topic-option focus:bg-[#f3f1ee] focus:text-[#211e1b] data-[state=checked]:bg-[#f7f5f2] data-[state=checked]:text-[#211e1b]">{item === "Tất cả" ? "Tất cả chủ đề" : item}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="quiz-card-grid">
        {filtered.map((quiz) => <QuizSetCard key={quiz.id} quiz={quiz} onPlay={() => setActiveQuiz(quiz)} />)}
      </div>

      <Dialog open={Boolean(activeQuiz)} onOpenChange={(open) => { if (!open) setActiveQuiz(null); }}>
        <DialogContent showCloseButton className="quiz-player-dialog max-h-[92dvh] max-w-4xl gap-0 overflow-y-auto border-line bg-paper p-0 sm:p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>{activeQuiz?.title ?? "Bộ quiz"}</DialogTitle>
            <DialogDescription>Chơi quiz ôn tập kiến thức lịch sử.</DialogDescription>
          </DialogHeader>
          {activeQuiz && <QuizPlayer key={activeQuiz.id} quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
