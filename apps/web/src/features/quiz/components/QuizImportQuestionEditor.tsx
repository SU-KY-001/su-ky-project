import { useState, type ReactElement } from "react";
import type { QuizDraftQuestion } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Textarea } from "@/shared/components/ui/textarea";
import { ModeratorSelect } from "@/features/moderator/components/ModeratorSelect";
import { importQuestionIssues } from "../utils/quizTextImport";

export function QuizImportQuestionEditor({
  initial,
  onSave,
  onCancel,
}: {
  initial: QuizDraftQuestion;
  onSave: (question: QuizDraftQuestion) => void;
  onCancel: () => void;
}): ReactElement {
  const [question, setQuestion] = useState(initial);
  const [errors, setErrors] = useState<string[]>([]);
  const kind = question.kind ?? "SINGLE";
  const changeKind = (value: string): void => {
    if (value !== "SINGLE" && value !== "MULTIPLE" && value !== "TEXT") return;
    setQuestion((q) => ({
      ...q,
      kind: value,
      correctIndex: null,
      correctIndexes: [],
      options:
        value !== "TEXT" && q.options.length < 2
          ? [...q.options, ""]
          : q.options,
    }));
  };
  return (
    <div
      className="space-y-4 rounded-lg border border-mod-border p-4"
      aria-label="Chỉnh sửa câu nhập"
    >
      <div className="space-y-2">
        <Label htmlFor="import-kind">Loại câu hỏi</Label>
        <ModeratorSelect
          id="import-kind"
          label="Loại câu hỏi nhập"
          placeholder="Chọn loại câu"
          value={kind}
          onValueChange={changeKind}
          options={[
            { value: "SINGLE", label: "Chọn một" },
            { value: "MULTIPLE", label: "Chọn nhiều" },
            { value: "TEXT", label: "Điền đáp án" },
          ]}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="import-question">Nội dung câu hỏi</Label>
        <Textarea
          id="import-question"
          maxLength={2000}
          value={question.text}
          onChange={(event) =>
            setQuestion((q) => ({ ...q, text: event.target.value }))
          }
        />
      </div>
      {kind === "TEXT" ? (
        <div className="space-y-2">
          <Label htmlFor="import-text-answer">Đáp án đúng</Label>
          <Textarea
            id="import-text-answer"
            value={question.options.join("\n")}
            onChange={(event) =>
              setQuestion((q) => ({
                ...q,
                options: event.target.value.split("\n"),
              }))
            }
          />
          <p className="text-xs text-mod-text-secondary">
            Mỗi cách trả lời được chấp nhận trên một dòng, tối đa 6.
          </p>
        </div>
      ) : (
        <fieldset className="space-y-2">
          <legend className="mb-2 text-sm font-semibold">
            Lựa chọn và đáp án đúng
          </legend>
          {question.options.map((option, i) => (
            <div key={i} className="flex items-center gap-2">
              <input
                type={kind === "MULTIPLE" ? "checkbox" : "radio"}
                name="import-correct"
                className="size-4 accent-mod-success"
                aria-label={`Đáp án ${"ABCDEF"[i] ?? i + 1} đúng`}
                checked={
                  kind === "MULTIPLE"
                    ? (question.correctIndexes?.includes(i) ?? false)
                    : question.correctIndex === i
                }
                onChange={() =>
                  setQuestion((q) =>
                    kind === "MULTIPLE"
                      ? {
                          ...q,
                          correctIndexes: q.correctIndexes?.includes(i)
                            ? q.correctIndexes.filter((index) => index !== i)
                            : [...(q.correctIndexes ?? []), i],
                        }
                      : { ...q, correctIndex: i },
                  )
                }
              />
              <span aria-hidden="true" className="w-5 shrink-0">
                {"ABCDEF"[i] ?? i + 1}.
              </span>
              <Textarea
                className="min-h-11"
                aria-label={`Nội dung đáp án ${"ABCDEF"[i] ?? i + 1}`}
                maxLength={1000}
                value={option}
                onChange={(event) =>
                  setQuestion((q) => ({
                    ...q,
                    options: q.options.map((text, n) =>
                      n === i ? event.target.value : text,
                    ),
                  }))
                }
              />
              <Button
                size="sm"
                variant="ghost"
                disabled={question.options.length <= 2}
                onClick={() =>
                  setQuestion((q) => ({
                    ...q,
                    options: q.options.filter((_, n) => n !== i),
                    correctIndex:
                      q.correctIndex === i
                        ? null
                        : q.correctIndex !== null && q.correctIndex > i
                          ? q.correctIndex - 1
                          : q.correctIndex,
                    correctIndexes: q.correctIndexes
                      ?.filter((n) => n !== i)
                      .map((n) => (n > i ? n - 1 : n)),
                  }))
                }
              >
                Xóa
              </Button>
            </div>
          ))}
          <Button
            size="sm"
            variant="outline"
            disabled={question.options.length >= 6}
            onClick={() =>
              setQuestion((q) => ({ ...q, options: [...q.options, ""] }))
            }
          >
            Thêm lựa chọn
          </Button>
        </fieldset>
      )}
      <div className="space-y-2">
        <Label htmlFor="import-explanation">Giải thích</Label>
        <Textarea
          id="import-explanation"
          maxLength={4000}
          value={question.explanation}
          onChange={(event) =>
            setQuestion((q) => ({ ...q, explanation: event.target.value }))
          }
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="import-time">Thời gian (giây)</Label>
        <Input
          id="import-time"
          type="number"
          min={10}
          max={120}
          value={question.timeLimit}
          onChange={(event) =>
            setQuestion((q) => ({
              ...q,
              timeLimit: Number(event.target.value),
            }))
          }
        />
      </div>
      {!!errors.length && (
        <ul role="alert" className="list-disc pl-5 text-sm text-mod-danger">
          {errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Hủy sửa
        </Button>
        <Button
          onClick={() => {
            const issues = importQuestionIssues(question);
            setErrors(issues);
            if (!issues.length) onSave(question);
          }}
        >
          Xác nhận bản đã sửa
        </Button>
      </div>
    </div>
  );
}
