import { useEffect, useRef, useState, type ReactElement } from "react";
import type { QuizDraftQuestion } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { Textarea } from "@/shared/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { ConfirmationDialog } from "@/shared/components/common/ConfirmationDialog";
import { useConfirmationDialog } from "@/shared/hooks/useConfirmationDialog";
import { notify } from "@/shared/lib/notifications";
import { cn } from "@/lib/utils";
import { quizService } from "../services/quizService";
import {
  importQuestionIssues,
  MAX_IMPORT_TEXT,
  parseQuizText,
  type ImportedQuizQuestion,
} from "../utils/quizTextImport";
import { QUIZ_IMPORT_TEMPLATE } from "../utils/quizImportTemplate";
import { QuizImportQuestionEditor } from "./QuizImportQuestionEditor";

interface ImportProps {
  count: number;
  empty: boolean;
  defaultTime: number;
  onApply: (questions: QuizDraftQuestion[], replace: boolean) => void;
}
const kindNames = {
  SINGLE: "Chọn một",
  MULTIPLE: "Chọn nhiều",
  TEXT: "Điền đáp án",
};
const candidateIssues = (item: ImportedQuizQuestion): string[] => [
  ...item.issues,
  ...importQuestionIssues(item.question),
];

function ImportSession({
  count,
  empty,
  defaultTime,
  onApply,
  onClose,
  onDirtyChange,
  onBusyChange,
}: ImportProps & {
  onClose: () => void;
  onDirtyChange: (dirty: boolean) => void;
  onBusyChange: (busy: boolean) => void;
}): ReactElement {
  const [source, setSource] = useState("");
  const [fileName, setFileName] = useState("");
  const [tab, setTab] = useState<"paste" | "file">("paste");
  const [step, setStep] = useState<"source" | "review">("source");
  const [showTemplate, setShowTemplate] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [items, setItems] = useState<ImportedQuizQuestion[]>([]);
  const [sourceIssues, setSourceIssues] = useState<string[]>([]);
  const [edited, setEdited] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mobilePanel, setMobilePanel] = useState<"questions" | "source">(
    "questions",
  );
  const [replace, setReplace] = useState(false);
  const input = useRef<HTMLInputElement>(null);
  const upload = useRef<AbortController | null>(null);
  const selectedSource = useRef<HTMLElement | null>(null);
  const { requestConfirmation, confirmation } = useConfirmationDialog();
  useEffect(() => {
    onDirtyChange(Boolean(source.trim() || items.length));
  }, [source, items.length, onDirtyChange]);
  useEffect(() => {
    onBusyChange(loading);
  }, [loading, onBusyChange]);
  useEffect(() => () => upload.current?.abort(), []);
  useEffect(() => {
    if (step === "review")
      selectedSource.current?.scrollIntoView({ block: "nearest" });
  }, [selectedId, step, mobilePanel]);
  const selected = items.find((item) => item.question.id === selectedId);
  const included = items.filter((item) => item.included);
  const invalid = included.filter((item) => candidateIssues(item).length);
  const total = included.length + (empty || replace ? 0 : count);

  const read = async (): Promise<void> => {
    if (
      edited &&
      !(await requestConfirmation({
        title: "Đọc lại văn bản nguồn?",
        description:
          "Các chỉnh sửa và lựa chọn bỏ câu ở bước xem lại sẽ được thay bằng kết quả đọc mới.",
        confirmLabel: "Đọc lại",
      }))
    )
      return;
    const result = parseQuizText(source, defaultTime);
    setItems(result.items);
    setSourceIssues(result.issues);
    setEdited(false);
    setEditId(null);
    setSelectedId(result.items[0]?.question.id ?? null);
    setError("");
    if (result.items.length) {
      setStep("review");
      setMobilePanel("questions");
    } else setError(result.issues.join(" "));
  };
  const loadFile = async (files: File[]): Promise<void> => {
    if (loading) return;
    if (files.length !== 1) {
      setError("Mỗi lần chọn một tài liệu.");
      return;
    }
    const file = files[0];
    if (!file) return;
    if (!/\.(docx|txt|md|pdf)$/i.test(file.name)) {
      setError(
        /\.doc$/i.test(file.name)
          ? "Hãy lưu .doc thành .docx hoặc dán nội dung trực tiếp."
          : "Chỉ hỗ trợ .docx, .txt, .md và PDF có văn bản.",
      );
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Tài liệu tối đa 5 MB.");
      return;
    }
    if (
      source.trim() &&
      !(await requestConfirmation({
        title: "Thay văn bản nguồn?",
        description: `Nội dung nguồn hiện tại sẽ được thay bằng văn bản từ “${file.name}”. Kết quả xem lại được giữ đến khi bạn bấm đọc lại.`,
        confirmLabel: "Thay nguồn",
      }))
    )
      return;
    setLoading(true);
    setError("");
    const controller = new AbortController();
    upload.current = controller;
    try {
      const result = await quizService.extractDocument(file, controller.signal);
      if (!controller.signal.aborted) {
        setSource(result.text);
        setFileName(result.fileName);
        setTab("paste");
      }
    } catch (failure) {
      if (!controller.signal.aborted)
        setError(
          failure instanceof Error
            ? failure.message
            : "Không đọc được tài liệu. Hãy thử dán văn bản trực tiếp.",
        );
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };
  const changeSelection = async (id: string): Promise<boolean> => {
    if (
      editId &&
      editId !== id &&
      !(await requestConfirmation({
        title: "Bỏ chỉnh sửa câu đang mở?",
        description: "Phần sửa chưa xác nhận của câu này sẽ mất.",
        confirmLabel: "Bỏ chỉnh sửa",
      }))
    )
      return false;
    if (editId !== id) setEditId(null);
    setSelectedId(id);
    return true;
  };
  const apply = async (): Promise<void> => {
    if (
      !included.length ||
      invalid.length ||
      sourceIssues.length ||
      total > 100 ||
      editId
    )
      return;
    const replacing = empty || replace;
    if (
      !empty &&
      replace &&
      !(await requestConfirmation({
        title: `Thay thế ${count} câu đang soạn?`,
        description: `Nội dung câu hỏi trong trình soạn sẽ được thay bằng ${included.length} câu vừa nhập. Các thông tin khác của bộ quiz được giữ lại.`,
        confirmLabel: "Thay thế câu hỏi",
        destructive: true,
      }))
    )
      return;
    onApply(
      included.map((item) => ({ ...item.question, id: crypto.randomUUID() })),
      replacing,
    );
  };

  const renderSource = (): ReactElement => {
    if (!selected)
      return (
        <pre className="whitespace-pre-wrap break-words text-sm">{source}</pre>
      );
    const lines = source.replace(/\r\n?/g, "\n").split("\n");
    return (
      <pre className="whitespace-pre-wrap break-words text-sm leading-6">
        {lines.slice(0, selected.startLine - 1).join("\n")}
        {selected.startLine > 1 && "\n"}
        <mark
          ref={selectedSource}
          className="block rounded bg-mod-primary/10 px-2 py-1 text-mod-text"
        >
          {lines.slice(selected.startLine - 1, selected.endLine).join("\n")}
        </mark>
        {lines.slice(selected.endLine).join("\n")}
      </pre>
    );
  };
  return (
    <>
      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
        {step === "source" ? (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div
                role="tablist"
                aria-label="Cách nhập câu hỏi"
                className="flex gap-2"
              >
                <Button
                  id="import-paste-tab"
                  role="tab"
                  aria-selected={tab === "paste"}
                  aria-controls="import-source-panel"
                  variant={tab === "paste" ? "default" : "outline"}
                  onClick={() => setTab("paste")}
                >
                  Dán văn bản
                </Button>
                <Button
                  id="import-file-tab"
                  role="tab"
                  aria-selected={tab === "file"}
                  aria-controls="import-source-panel"
                  variant={tab === "file" ? "default" : "outline"}
                  onClick={() => setTab("file")}
                >
                  Tải tài liệu
                </Button>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  onClick={() => setShowTemplate((value) => !value)}
                >
                  {showTemplate ? "Ẩn mẫu" : "Xem mẫu"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(QUIZ_IMPORT_TEMPLATE)
                      .then(() =>
                        notify.success({ title: "Đã sao chép mẫu câu hỏi" }),
                      )
                      .catch(() => {
                        setShowTemplate(true);
                        setError(
                          "Chưa sao chép được tự động. Bạn có thể chọn và sao chép mẫu bên dưới.",
                        );
                      });
                  }}
                >
                  Sao chép mẫu
                </Button>
              </div>
            </div>
            {showTemplate && (
              <div className="space-y-2 rounded-lg border border-mod-border bg-mod-canvas-accent p-4">
                <p className="text-sm">
                  Loại câu, giải thích và thời gian có thể bỏ trống khi cấu trúc
                  đã rõ. Với câu điền, ghi từng cách gọi thêm bằng “Chấp nhận
                  thêm:”.
                </p>
                <pre className="max-h-64 overflow-auto whitespace-pre-wrap text-sm leading-6">
                  {QUIZ_IMPORT_TEMPLATE}
                </pre>
              </div>
            )}
            <div
              id="import-source-panel"
              role="tabpanel"
              aria-labelledby={
                tab === "paste" ? "import-paste-tab" : "import-file-tab"
              }
            >
              {tab === "paste" ? (
                <div className="space-y-2">
                  <label
                    htmlFor="quiz-import-source"
                    className="text-sm font-semibold"
                  >
                    Văn bản câu hỏi{fileName && ` · ${fileName}`}
                  </label>
                  <Textarea
                    id="quiz-import-source"
                    className="min-h-72 text-sm"
                    maxLength={MAX_IMPORT_TEXT}
                    disabled={loading}
                    value={source}
                    onChange={(event) => setSource(event.target.value)}
                    placeholder="Dán câu hỏi, các lựa chọn và đáp án đúng vào đây…"
                  />
                  <p className="text-xs text-mod-text-secondary">
                    {source.length.toLocaleString("vi-VN")} / 200.000 ký tự ·
                    Tối đa 100 câu khi đưa vào trình soạn.
                  </p>
                </div>
              ) : (
                <div
                  className={cn(
                    "flex min-h-64 flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-mod-border p-6 text-center",
                    dragging && "border-mod-primary bg-mod-primary/5",
                  )}
                  onDragOver={(event) => {
                    event.preventDefault();
                    setDragging(true);
                  }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(event) => {
                    event.preventDefault();
                    setDragging(false);
                    void loadFile(Array.from(event.dataTransfer.files));
                  }}
                >
                  <p className="font-semibold">
                    Kéo thả tài liệu câu hỏi vào đây
                  </p>
                  <p className="text-sm text-mod-text-secondary">
                    Word .docx, .txt, .md hoặc PDF có văn bản · Tối đa 5 MB
                  </p>
                  <Button
                    variant="outline"
                    disabled={loading}
                    onClick={() => input.current?.click()}
                  >
                    Chọn tệp
                  </Button>
                  <input
                    ref={input}
                    type="file"
                    accept=".docx,.txt,.md,.pdf,.doc"
                    className="sr-only"
                    aria-label="Chọn tài liệu câu hỏi"
                    disabled={loading}
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? []);
                      event.target.value = "";
                      if (files.length) void loadFile(files);
                    }}
                  />
                  <p className="max-w-prose text-xs text-mod-text-secondary">
                    Tệp .doc: lưu lại thành .docx hoặc dán nội dung. PDF scan:
                    cần OCR trước. Sau khi đọc tệp, bạn có thể xem và sửa văn
                    bản nguồn.
                  </p>
                </div>
              )}
            </div>
            {loading && (
              <p role="status" className="text-sm">
                Đang đọc văn bản trong tài liệu…
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p role="status" className="text-sm">
                {included.length} câu được chọn ·{" "}
                {included.length - invalid.length} hợp lệ · {invalid.length} cần
                sửa
              </p>
              <Button
                variant="outline"
                onClick={() => {
                  if (editId) {
                    void requestConfirmation({
                      title: "Bỏ chỉnh sửa câu đang mở?",
                      description:
                        "Phần sửa chưa xác nhận sẽ mất khi quay lại văn bản nguồn.",
                      confirmLabel: "Về văn bản nguồn",
                    }).then((confirmed) => {
                      if (confirmed) {
                        setEditId(null);
                        setStep("source");
                      }
                    });
                  } else setStep("source");
                }}
              >
                Sửa văn bản nguồn
              </Button>
            </div>
            {!!sourceIssues.length && (
              <div role="alert" className="text-sm text-mod-danger">
                {sourceIssues.map((issue) => (
                  <p key={issue}>{issue}</p>
                ))}
              </div>
            )}
            <div
              className="flex gap-2 lg:hidden"
              role="tablist"
              aria-label="Đối chiếu nội dung"
            >
              <Button
                role="tab"
                aria-selected={mobilePanel === "questions"}
                variant={mobilePanel === "questions" ? "default" : "outline"}
                onClick={() => setMobilePanel("questions")}
              >
                Câu hỏi
              </Button>
              <Button
                role="tab"
                aria-selected={mobilePanel === "source"}
                variant={mobilePanel === "source" ? "default" : "outline"}
                onClick={() => setMobilePanel("source")}
              >
                Văn bản nguồn
              </Button>
            </div>
            <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,.85fr)_minmax(0,1.15fr)]">
              <section
                aria-label="Văn bản nguồn đối chiếu"
                className={cn(
                  "min-w-0 rounded-lg border border-mod-border p-4 lg:block",
                  mobilePanel !== "source" && "hidden",
                )}
              >
                <h3 className="mb-3 font-semibold">
                  Văn bản nguồn{fileName ? ` · ${fileName}` : ""}
                </h3>
                <div className="max-h-[55dvh] overflow-auto">
                  {renderSource()}
                </div>
              </section>
              <section
                aria-label="Câu hỏi đã nhận diện"
                className={cn(
                  "min-w-0 space-y-3 lg:block",
                  mobilePanel !== "questions" && "hidden",
                )}
              >
                <h3 className="font-semibold">Câu hỏi đã nhận diện</h3>
                {items.map((item, i) => {
                  const question = item.question,
                    issues = candidateIssues(item);
                  return (
                    <article
                      key={question.id}
                      className={cn(
                        "space-y-3 rounded-lg border border-mod-border p-4",
                        selectedId === question.id && "border-mod-primary",
                        !item.included && "bg-mod-canvas-accent",
                      )}
                    >
                      <button
                        type="button"
                        className="w-full text-left text-sm font-semibold underline-offset-4 hover:underline"
                        onClick={() => void changeSelection(question.id)}
                      >
                        Câu {i + 1} · {kindNames[question.kind ?? "SINGLE"]}
                        {item.inferred ? " · Tự nhận diện" : ""} · Dòng{" "}
                        {item.startLine}–{item.endLine}
                      </button>
                      <p className="whitespace-pre-wrap text-sm">
                        {question.text || "Chưa có nội dung câu hỏi"}
                      </p>
                      {question.kind === "TEXT" ? (
                        <p className="whitespace-pre-wrap text-sm text-mod-text-secondary">
                          Đáp án: {question.options.join(" · ") || "Chưa có"}
                        </p>
                      ) : (
                        <ul className="space-y-1 text-sm text-mod-text-secondary">
                          {question.options.map((option, n) => (
                            <li key={n}>
                              {"ABCDEF"[n] ?? n + 1}.{" "}
                              {option || "Chưa có nội dung"}
                              {question.kind === "MULTIPLE"
                                ? question.correctIndexes?.includes(n)
                                  ? " — Đáp án đúng"
                                  : ""
                                : question.correctIndex === n
                                  ? " — Đáp án đúng"
                                  : ""}
                            </li>
                          ))}
                        </ul>
                      )}
                      {question.explanation && (
                        <p className="whitespace-pre-wrap text-sm text-mod-text-secondary">
                          Giải thích: {question.explanation}
                        </p>
                      )}
                      <p className="text-xs text-mod-text-secondary">
                        {question.timeLimit} giây
                      </p>
                      {item.included && issues.length > 0 && (
                        <ul
                          className="list-disc pl-5 text-sm text-mod-danger"
                          aria-label={`Lỗi câu ${i + 1}`}
                        >
                          {issues.map((issue, n) => (
                            <li key={n}>{issue}</li>
                          ))}
                        </ul>
                      )}
                      {!item.included && (
                        <p className="text-sm text-mod-text-secondary">
                          Đã bỏ khỏi lần nhập này
                        </p>
                      )}
                      {editId === question.id ? (
                        <QuizImportQuestionEditor
                          key={question.id}
                          initial={question}
                          onCancel={() => setEditId(null)}
                          onSave={(updated) => {
                            setItems((current) =>
                              current.map((candidate) =>
                                candidate.question.id === updated.id
                                  ? {
                                      ...candidate,
                                      question: updated,
                                      issues: [],
                                      inferred: false,
                                    }
                                  : candidate,
                              ),
                            );
                            setEdited(true);
                            setEditId(null);
                          }}
                        />
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            disabled={!item.included}
                            onClick={() => {
                              void changeSelection(question.id).then(
                                (confirmed) => {
                                  if (confirmed) setEditId(question.id);
                                },
                              );
                            }}
                          >
                            Chỉnh sửa
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={Boolean(editId)}
                            onClick={() => {
                              setItems((current) =>
                                current.map((candidate) =>
                                  candidate.question.id === question.id
                                    ? {
                                        ...candidate,
                                        included: !candidate.included,
                                      }
                                    : candidate,
                                ),
                              );
                              setEdited(true);
                            }}
                          >
                            {item.included ? "Bỏ câu này" : "Chọn lại câu"}
                          </Button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </section>
            </div>
            {!empty && (
              <fieldset className="space-y-2 border-t border-mod-border pt-4 text-sm">
                <legend className="font-semibold">Đưa vào trình soạn</legend>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="import-apply"
                    checked={!replace}
                    onChange={() => setReplace(false)}
                  />
                  Thêm vào cuối ({count} câu hiện có)
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="import-apply"
                    checked={replace}
                    onChange={() => setReplace(true)}
                  />
                  Thay thế câu hỏi hiện tại
                </label>
              </fieldset>
            )}
            {total > 100 && (
              <p role="alert" className="text-sm text-mod-danger">
                Tổng số {total} câu vượt giới hạn 100. Hãy bỏ bớt câu hoặc chọn
                thay thế.
              </p>
            )}
          </div>
        )}
        {error && (
          <p role="alert" className="mt-4 text-sm text-mod-danger">
            {error}
          </p>
        )}
      </div>
      <DialogFooter className="shrink-0 border-t border-mod-border px-4 py-4 sm:px-6">
        <p className="mr-auto text-xs text-mod-text-secondary">
          Chưa tự lưu hoặc đăng tải. Hủy nhập sẽ giữ nguyên trình soạn.
        </p>
        <Button variant="outline" onClick={onClose}>
          Hủy nhập
        </Button>
        {step === "source" ? (
          <Button
            disabled={!source.trim() || loading}
            onClick={() => void read()}
          >
            {items.length ? "Đọc lại câu hỏi" : "Đọc câu hỏi"}
          </Button>
        ) : (
          <Button
            disabled={
              !included.length ||
              invalid.length > 0 ||
              sourceIssues.length > 0 ||
              total > 100 ||
              Boolean(editId)
            }
            onClick={() => void apply()}
          >
            Đưa {included.length} câu vào trình soạn
          </Button>
        )}
      </DialogFooter>
      <ConfirmationDialog {...confirmation} />
    </>
  );
}

export function QuizTextImport(props: ImportProps): ReactElement {
  const [open, setOpen] = useState(false),
    [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false);
  const { requestConfirmation, confirmation } = useConfirmationDialog();
  const close = async (): Promise<void> => {
    if (
      (dirty || busy) &&
      !(await requestConfirmation({
        title: "Hủy nhập câu hỏi?",
        description:
          "Nội dung đang nhập và các chỉnh sửa trong bước xem lại sẽ mất. Nội dung trình soạn vẫn được giữ nguyên.",
        confirmLabel: "Hủy nhập",
      }))
    )
      return;
    setOpen(false);
    setDirty(false);
    setBusy(false);
  };
  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)}>
        Nhập câu hỏi
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (value) setOpen(true);
          else void close();
        }}
      >
        <DialogContent className="flex max-h-[94dvh] w-[calc(100%-1rem)] max-w-6xl flex-col gap-0 overflow-hidden border-mod-border bg-mod-surface p-0 font-moderator text-mod-text sm:p-0">
          <DialogHeader className="shrink-0 border-b border-mod-border px-4 py-5 sm:px-6">
            <DialogTitle>Nhập câu hỏi</DialogTitle>
            <DialogDescription>
              Dán văn bản hoặc tải tài liệu, kiểm tra từng câu rồi đưa vào trình
              soạn.
            </DialogDescription>
          </DialogHeader>
          {open && (
            <ImportSession
              {...props}
              onClose={() => void close()}
              onDirtyChange={setDirty}
              onBusyChange={setBusy}
              onApply={(questions, replace) => {
                props.onApply(questions, replace);
                setOpen(false);
                setDirty(false);
                setBusy(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
      <ConfirmationDialog {...confirmation} />
    </>
  );
}
