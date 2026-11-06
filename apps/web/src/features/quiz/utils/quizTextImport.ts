import { validateReadyQuiz, type QuizDraftQuestion } from "@repo/shared";

export const MAX_IMPORT_TEXT = 200_000;
export type QuizImportNotes = Record<string, { source: string; issues: string[] }>;
export interface ImportedQuizQuestion {
  question: QuizDraftQuestion;
  source: string;
  startLine: number;
  endLine: number;
  inferred: boolean;
  issues: string[];
  included: boolean;
}
export interface QuizTextImportResult {
  items: ImportedQuizQuestion[];
  issues: string[];
}
const letters = "ABCDEF";
const normalized = (value: string): string =>
  value.normalize("NFC").trim().replace(/\s+/g, " ").toLocaleLowerCase("vi");
const unaccent = (value: string): string =>
  normalized(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d");
const clean = (line: string): string =>
  line
    .trim()
    .replace(/^#{1,6}\s+/, "")
    .replace(/^(?:[•●▪◦]|[-*]\s)\s*/, "")
    .replace(/\*\*/g, "");
const heading = (line: string): RegExpMatchArray | null =>
  clean(line).match(/^(?:Câu\s*\d+\s*[:.)-]|\d+[.)])\s*(.*)$/iu);

export function importQuestionIssues(question: QuizDraftQuestion): string[] {
  question = { ...question, kind: question.kind ?? "SINGLE" };
  const issues: string[] = [];
  if (!question.text.trim()) issues.push("Chưa có nội dung câu hỏi.");
  if (question.kind !== "TEXT" && question.options.length < 2)
    issues.push("Câu chọn đáp án cần ít nhất 2 lựa chọn.");
  if (question.options.some((option) => !option.trim()))
    issues.push("Có đáp án chưa nhập nội dung.");
  if (
    new Set(question.options.map(normalized)).size !== question.options.length
  )
    issues.push("Có đáp án trùng nội dung.");
  if (question.kind === "SINGLE" && question.correctIndex === null)
    issues.push("Chưa có đáp án đúng.");
  if (question.kind === "MULTIPLE" && !question.correctIndexes?.length)
    issues.push("Chưa có đáp án đúng.");
  if (
    question.kind === "TEXT" &&
    (!question.options.length ||
      !question.options.some((option) => option.trim()))
  )
    issues.push("Chưa có đáp án được chấp nhận.");
  if (
    !Number.isInteger(question.timeLimit) ||
    question.timeLimit < 10 ||
    question.timeLimit > 120
  )
    issues.push("Thời gian phải từ 10 đến 120 giây.");
  try {
    validateReadyQuiz({
      title: "Kiểm tra nhập liệu",
      description: "",
      passScorePercent: 80,
      questions: [question],
    });
  } catch {
    if (!issues.length)
      issues.push("Nội dung hoặc đáp án vượt giới hạn; kiểm tra lại câu hỏi.");
  }
  return [...new Set(issues)];
}

function parseBlock(
  lines: string[],
  startLine: number,
  endLine: number,
  defaultTime: number,
): ImportedQuizQuestion {
  const question: QuizDraftQuestion = {
    id: crypto.randomUUID(),
    kind: "SINGLE",
    text: heading(lines[startLine])?.[1] ?? "",
    options: [],
    correctIndex: null,
    correctIndexes: [],
    explanation: "",
    timeLimit: defaultTime,
    evidence: null,
  };
  const issues: string[] = [],
    options: { label: string; text: string }[] = [],
    accepted: string[] = [];
  let answer = "",
    type = "",
    field:
      | "text"
      | "option"
      | "answer"
      | "accepted"
      | "explanation"
      | "type"
      | "time" = "text";
  const seen = new Set<string>();
  for (let index = startLine + 1; index <= endLine; index++) {
    const line = clean(lines[index]);
    if (!line || /^[-_*]{3,}$/.test(line)) continue;
    const meta = line.match(
      /^(Loại(?:\s+câu\s+hỏi)?|Đáp án(?:\s+đúng)?|Chấp nhận thêm|Giải thích|Thời gian)\s*:\s*(.*)$/iu,
    );
    if (meta) {
      const key = unaccent(meta[1]),
        value = meta[2].trim();
      if (
        key !== "chap nhan them" &&
        seen.has(key.startsWith("dap an") ? "answer" : key)
      )
        issues.push(`Dòng ${index + 1}: trường ${meta[1]} bị lặp.`);
      seen.add(key.startsWith("dap an") ? "answer" : key);
      if (key.startsWith("loai")) {
        type = value;
        field = "type";
      } else if (key.startsWith("dap an")) {
        answer = value;
        field = "answer";
      } else if (key === "chap nhan them") {
        accepted.push(value);
        field = "accepted";
      } else if (key === "giai thich") {
        question.explanation = value;
        field = "explanation";
      } else {
        const raw = value.replace(/\s*(giây|giay|s)\s*$/iu, "");
        question.timeLimit = /^\d+$/.test(raw) ? Number(raw) : 0;
        field = "time";
      }
      continue;
    }
    const option = line.match(/^([A-F])[.)]\s*(.*)$/iu);
    if (
      option &&
      field !== "explanation" &&
      field !== "answer" &&
      field !== "accepted"
    ) {
      options.push({ label: option[1].toUpperCase(), text: option[2] });
      field = "option";
      continue;
    }
    if (field === "option" && options.length)
      options[options.length - 1].text += `\n${line}`;
    else if (field === "answer") answer += `\n${line}`;
    else if (field === "accepted" && accepted.length)
      accepted[accepted.length - 1] += `\n${line}`;
    else if (field === "explanation") question.explanation += `\n${line}`;
    else if (field === "text") question.text += `\n${line}`;
    else
      issues.push(
        `Dòng ${index + 1}: không nhận diện được nội dung “${line.slice(0, 80)}”.`,
      );
  }
  const typeName = unaccent(type);
  const kinds: Record<string, "SINGLE" | "MULTIPLE" | "TEXT"> = {
    "chon mot": "SINGLE",
    "chon mot dap an": "SINGLE",
    single: "SINGLE",
    "chon nhieu": "MULTIPLE",
    "chon nhieu dap an": "MULTIPLE",
    multiple: "MULTIPLE",
    "dien dap an": "TEXT",
    "dien dap an ngan": "TEXT",
    text: "TEXT",
  };
  const explicitKind = kinds[typeName];
  const isText =
    explicitKind === "TEXT" ||
    (!type && !options.length && Boolean(answer.trim()));
  if (type && !explicitKind)
    issues.push(`Chưa xác định được loại câu hỏi “${type}”.`);
  if (isText) {
    question.kind = "TEXT";
    question.options = [answer, ...accepted].filter((value) => value.trim());
    if (!question.options.length) question.options = [""];
    if (options.length)
      issues.push(
        "Câu điền đáp án không dùng lựa chọn A–F; kiểm tra lại loại câu.",
      );
  } else {
    question.options = options.map((option) => option.text);
    if (!question.options.length) question.options = ["", ""];
    if (options.some((option, i) => option.label !== letters[i]))
      issues.push(
        "Nhãn lựa chọn phải liên tiếp từ A đến F, không trùng hoặc thiếu nhãn.",
      );
    let indices: number[] = [];
    const answerOnly = answer.trim().replace(/[.。]$/, "");
    if (/^[A-F](?:\s*(?:[,;]|và)\s*[A-F])*$/iu.test(answerOnly))
      indices = answerOnly
        .split(/\s*(?:[,;]|và)\s*/iu)
        .map((label) =>
          options.findIndex((option) => option.label === label.toUpperCase()),
        );
    else {
      const labeled = answer.match(/^([A-F])[.)]\s*([\s\S]+)$/iu);
      if (labeled) {
        const position = options.findIndex(
          (option) => option.label === labeled[1].toUpperCase(),
        );
        indices = [position];
        if (
          position >= 0 &&
          normalized(options[position].text) !== normalized(labeled[2])
        )
          issues.push("Ký hiệu và nội dung đáp án đúng không khớp nhau.");
      } else if (answer.trim()) {
        const matches = options.flatMap((option, i) =>
          normalized(option.text) === normalized(answer) ? [i] : [],
        );
        if (matches.length === 1) indices = matches;
        else
          issues.push(
            "Không nhận diện được đáp án đúng; dùng ký hiệu như B hoặc A, C.",
          );
      }
    }
    if (indices.some((index) => index < 0))
      issues.push(
        `Đáp án “${answer.trim().slice(0, 80)}” không có trong các lựa chọn ${options.map((option) => option.label).join(", ") || "đã nhập"}.`,
      );
    if (new Set(indices).size !== indices.length)
      issues.push("Đáp án đúng bị lặp.");
    question.kind =
      explicitKind ?? (indices.length > 1 ? "MULTIPLE" : "SINGLE");
    if (question.kind === "SINGLE") {
      question.correctIndex =
        indices.length === 1 && indices[0] >= 0 ? indices[0] : null;
      if (indices.length > 1)
        issues.push(
          "Câu chọn một đang có nhiều đáp án đúng; kiểm tra lại loại câu.",
        );
    } else question.correctIndexes = indices.filter((index) => index >= 0);
    if (accepted.length)
      issues.push("“Chấp nhận thêm” chỉ dùng cho câu điền đáp án.");
  }
  return {
    question,
    source: lines.slice(startLine, endLine + 1).join("\n"),
    startLine: startLine + 1,
    endLine: endLine + 1,
    inferred: !type,
    issues,
    included: true,
  };
}

export function parseQuizText(
  text: string,
  defaultTime = 20,
): QuizTextImportResult {
  if (text.length > MAX_IMPORT_TEXT)
    return {
      items: [],
      issues: [
        "Nội dung vượt quá 200.000 ký tự. Hãy chia thành tài liệu nhỏ hơn.",
      ],
    };
  const lines = text
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/^\uFEFF/, "")
    .split("\n");
  const starts = lines.flatMap((line, i) => (heading(line) ? [i] : []));
  if (!starts.length)
    return {
      items: [],
      issues: [
        "Chưa tìm thấy câu hỏi. Bắt đầu mỗi câu bằng “Câu 1:” hoặc “1.”.",
      ],
    };
  if (starts.length > 200)
    return {
      items: [],
      issues: [
        "Tài liệu có quá nhiều câu hỏi. Mỗi lần nhập tối đa 100 câu; hãy chia nhỏ tài liệu.",
      ],
    };
  const prefix = lines.slice(0, starts[0]).filter((line) => clean(line));
  return {
    issues: prefix.length
      ? [
          "Có nội dung trước câu hỏi đầu tiên. Hãy bỏ tiêu đề hoặc ghi chú thừa rồi đọc lại.",
        ]
      : [],
    items: starts.map((start, i) =>
      parseBlock(
        lines,
        start,
        (starts[i + 1] ?? lines.length) - 1,
        defaultTime,
      ),
    ),
  };
}
