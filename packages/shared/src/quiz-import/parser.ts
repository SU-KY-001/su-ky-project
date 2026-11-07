import { QuizDraftQuestionSchema, validateReadyQuiz } from "../schemas/quiz-authoring";
import { QUIZ_IMPORT_LIMITS, QUIZ_IMPORT_PARSER_VERSION, type QuizImportPreview, type QuizImportQuestion, type QuizImportDiagnostic, type QuizImportSource } from "../schemas/quiz-import";
import type { QuizImportDocument, QuizImportBlock } from "./types";
import { cleanLine, expandBlocks, normalized, unaccent } from "./normalize";
import { diagnostic, sourceRange } from "./diagnostics";

interface RawQuestion { number: number; section: string; start: number; end: number; lines: { text: string; index: number }[]; keyAnswer?: string; }
const heading = (s: string): RegExpMatchArray | null => s.match(/^(?:Câu\s*(\d+)\s*[:.)-]|(\d+)[.)])\s*(.*)$/iu);
const isSection = (s: string): boolean => /^(phần|phan|section)\s+[\divxlc]+(?:\s*[:.\-].*)?$/iu.test(s);
const isKey = (s: string): boolean => /^(?:bảng\s+)?đáp\s+án(?:\s+đúng)?\s*:?$/iu.test(s);

export function parseQuizDocument(document: QuizImportDocument, defaultTime: number): QuizImportPreview {
  const blocks = expandBlocks(document.blocks), raw: RawQuestion[] = [], diagnostics: QuizImportDiagnostic[] = [...(document.diagnostics ?? [])], unparsedRegions: QuizImportSource[] = [];
  let section = "", keyMode = false, current: RawQuestion | undefined;
  const keys: { number: number; answer: string; section: string; index: number }[] = [];
  const unknown = (index: number, message: string): void => {
    const source = sourceRange(blocks, index); unparsedRegions.push(source);
    diagnostics.push(diagnostic("UNPARSED_CONTENT", source, message, "Đặt nội dung vào đúng câu/đáp án hoặc bỏ phần không thuộc bộ câu hỏi rồi tải lại."));
  };
  for (let i = 0; i < blocks.length; i++) {
    const text = blocks[i].text;
    if (!text || /^[-_*]{3,}$/.test(text)) continue;
    if (isKey(text)) { keyMode = true; section = ""; current = undefined; continue; }
    if (isSection(text)) { section = text; current = undefined; continue; }
    if (keyMode) {
      const entries = [...text.matchAll(/(?:^|[;\t]|\s{2,})(?:Câu\s*)?(\d+)\s*[.):\-]\s*(.*?)(?=(?:[;\t]|\s{2,})(?:Câu\s*)?\d+\s*[.):\-]|$)/giu)];
      if (!entries.length) unknown(i, "Không nhận diện được dòng trong bảng đáp án.");
      else {
        if (text.slice(0, entries[0].index ?? 0).trim()) unknown(i, "Có nội dung chưa nhận diện trước đáp án.");
        for (const e of entries) keys.push({ number: Number(e[1]), answer: e[2].trim(), section, index: i });
      }
      continue;
    }
    const h = heading(text);
    if (h) {
      const number = Number(h[1] ?? h[2]);
      current = { number: Number.isSafeInteger(number) ? number : 0, section, start: i, end: i, lines: [{ text: h[3], index: i }] };
      raw.push(current); continue;
    }
    if (current) { current.end = i; current.lines.push({ text, index: i }); }
    else if (!raw.length && /^(bộ câu hỏi|bài tập|ôn tập|đề |hướng dẫn|môn |thời gian làm bài)/iu.test(text)) diagnostics.push(diagnostic("DOCUMENT_TITLE", sourceRange(blocks, i), "Đã nhận diện tiêu đề/hướng dẫn trước câu hỏi.", "Không cần sửa nếu đây là tiêu đề tài liệu.", null, "warning"));
    else unknown(i, "Có nội dung chưa xác định thuộc câu hỏi nào.");
  }
  for (const key of keys) {
    const candidates = raw.filter(q => q.number === key.number && (!key.section || normalized(q.section) === normalized(key.section)));
    if (candidates.length !== 1 || candidates[0].keyAnswer !== undefined) { unknown(key.index, `Không ghép được duy nhất đáp án của câu ${key.number}.`); continue; }
    candidates[0].keyAnswer = key.answer;
  }
  const questions = raw.map(q => parseQuestion(q, blocks, defaultTime));
  const seenNumbers = new Set<string>(), seenText = new Set<string>(), previous = new Map<string, number>();
  for (const q of questions) {
    const add = (code: string, message: string, suggestion: string): void => { q.diagnostics.push(diagnostic(code, q.source, message, suggestion, q.id)); };
    const key = `${normalized(q.section)}:${q.sourceNumber}`;
    if (seenNumbers.has(key)) add("DUPLICATE_NUMBER", "Số câu bị trùng trong cùng phần.", "Đánh số câu duy nhất trong mỗi phần.");
    seenNumbers.add(key);
    const last = previous.get(q.section);
    if (last !== undefined && q.sourceNumber !== last + 1) add("NUMBER_GAP", "Thứ tự số câu bị thiếu hoặc thay đổi bất thường.", "Kiểm tra câu bị thiếu và đánh số liên tiếp trong từng phần.");
    previous.set(q.section, q.sourceNumber);
    if (seenText.has(normalized(q.text))) add("DUPLICATE_QUESTION", "Câu hỏi trùng nội dung.", "Bỏ câu bị lặp hoặc sửa nội dung để phân biệt.");
    seenText.add(normalized(q.text));
    diagnostics.push(...q.diagnostics);
  }
  if (!questions.length) diagnostics.push(diagnostic("NO_QUESTIONS", sourceRange(blocks, 0, Math.max(0, blocks.length - 1)), "Chưa tìm thấy câu hỏi.", "Bắt đầu mỗi câu bằng Câu 1: hoặc 1. và ghi đáp án rõ ràng."));
  if (questions.length > QUIZ_IMPORT_LIMITS.questions) diagnostics.push(diagnostic("QUESTION_LIMIT", sourceRange(blocks, 0), "Bộ câu hỏi vượt quá 100 câu.", "Chia thành nhiều tài liệu, mỗi bộ quiz tối đa 100 câu."));
  if (blocks.reduce((n, b) => n + b.text.length + 1, 0) > QUIZ_IMPORT_LIMITS.text) diagnostics.push(diagnostic("TEXT_LIMIT", sourceRange(blocks, 0), "Văn bản vượt 200.000 ký tự.", "Chia nhỏ tài liệu."));
  const invalid = questions.filter(q => q.diagnostics.some(d => d.severity === "error")).length;
  return { parserVersion: QUIZ_IMPORT_PARSER_VERSION, fileName: document.fileName, format: document.format,
    status: diagnostics.some(d => d.severity === "error") ? "needs_correction" : "ready", questions, diagnostics, unparsedRegions,
    summary: { total: questions.length, valid: questions.length - invalid, invalid, single: questions.filter(q => q.kind === "SINGLE").length, multiple: questions.filter(q => q.kind === "MULTIPLE").length, text: questions.filter(q => q.kind === "TEXT").length } };
}

function parseQuestion(raw: RawQuestion, blocks: QuizImportBlock[], defaultTime: number): QuizImportQuestion {
  const q: QuizImportQuestion = { id: crypto.randomUUID(), sourceNumber: raw.number, section: raw.section, kind: null, text: raw.lines[0].text, options: [], correctIndex: null, correctIndexes: [], explanation: "", timeLimit: defaultTime, source: sourceRange(blocks, raw.start, raw.end), diagnostics: [] };
  const add = (code: string, message: string, suggestion: string, index?: number): void => { q.diagnostics.push(diagnostic(code, index === undefined ? q.source : sourceRange(blocks, index), message, suggestion, q.id)); };
  if (raw.number < 1) add("INVALID_NUMBER", "Số thứ tự câu hỏi không hợp lệ.", "Dùng số nguyên dương, bắt đầu từ Câu 1.");
  if (raw.lines.some(line => line.text.includes("[Hình ảnh chưa được hỗ trợ]"))) add("IMAGE_REFERENCE", "Tài liệu có hình ảnh chưa đọc được.", "Chuyển nội dung ảnh thành văn bản hoặc bỏ câu phụ thuộc ảnh.");
  let type = "", answer: string | undefined, field = "text";
  const accepted: string[] = [], labels: string[] = [], seen = new Set<string>();
  for (const line of raw.lines.slice(1)) {
    const meta = line.text.match(/^(Loại(?:\s+câu\s+hỏi)?|Đáp án(?:\s+đúng)?|Chấp nhận thêm|Giải thích|Thời gian)\s*:\s*(.*)$/iu);
    if (meta) {
      const key = unaccent(meta[1]); const canonical = key.startsWith("dap an") ? "answer" : key.startsWith("loai") ? "type" : key === "giai thich" ? "explanation" : key === "thoi gian" ? "time" : "accepted";
      if (canonical !== "accepted" && seen.has(canonical)) add("DUPLICATE_FIELD", `Trường ${meta[1]} bị lặp.`, "Giữ một giá trị duy nhất cho mỗi trường.", line.index);
      seen.add(canonical); field = canonical;
      if (field === "type") type = meta[2];
      if (field === "answer") answer = meta[2];
      if (field === "accepted") accepted.push(meta[2]);
      if (field === "explanation") q.explanation = meta[2];
      if (field === "time") { const value = /^\d+\s*(?:giây|giay|s)?$/iu.test(meta[2]) ? parseInt(meta[2], 10) : 0; q.timeLimit = Number.isFinite(value) ? value : 0; }
      continue;
    }
    const choices = [...line.text.matchAll(/(?:^|\s{2,}|\t)([A-F])[.)]\s*(.*?)(?=(?:\s{2,}|\t)[A-F][.)]\s|$)/giu)];
    if (choices.length && (field === "text" || field === "option" || field === "type")) {
      const prefix = line.text.slice(0, choices[0].index ?? 0).trim();
      if (prefix) {
        if (field === "text") q.text += `\n${prefix}`;
        else if (field === "option" && q.options.length) q.options[q.options.length - 1] += `\n${prefix}`;
        else add("UNPARSED_CONTENT", "Có nội dung chưa xác định trước lựa chọn.", "Đặt dữ kiện vào dòng câu hỏi trước các lựa chọn rồi tải lại.", line.index);
      }
      for (const choice of choices) { labels.push(choice[1].toUpperCase()); q.options.push(choice[2]); }
      field = "option"; continue;
    }
    if (field === "option" && q.options.length) q.options[q.options.length - 1] += `\n${line.text}`;
    else if (field === "text") q.text += `\n${line.text}`;
    else if (field === "explanation") q.explanation += `\n${line.text}`;
    else add("UNPARSED_CONTENT", "Có dòng chưa rõ ý nghĩa sau trường dữ liệu.", "Đưa nội dung cùng dòng với đáp án, hoặc đặt đúng nhãn Giải thích/Chấp nhận thêm.", line.index);
  }
  if (raw.keyAnswer !== undefined) {
    if (answer !== undefined && normalized(answer) !== normalized(raw.keyAnswer)) add("ANSWER_CONFLICT", "Đáp án trong câu và bảng đáp án không khớp.", "Đồng bộ hai đáp án trong file gốc.");
    else answer = raw.keyAnswer;
  }
  const aliases: Record<string, "SINGLE" | "MULTIPLE" | "TEXT"> = { single: "SINGLE", "chon mot": "SINGLE", "chon mot dap an": "SINGLE", multiple: "MULTIPLE", "chon nhieu": "MULTIPLE", "chon nhieu dap an": "MULTIPLE", text: "TEXT", "dien dap an": "TEXT", "dien dap an ngan": "TEXT" };
  const declared = type ? aliases[unaccent(type)] : undefined;
  if (type && !declared) add("UNKNOWN_KIND", `Chưa nhận diện được loại ${type}.`, "Dùng Loại: Chọn một, Chọn nhiều hoặc Điền đáp án.");
  const textKind = declared === "TEXT" || (!type && !labels.length && Boolean(answer?.trim()));
  if (textKind) {
    q.kind = "TEXT";
    if (labels.length) add("TYPE_CONFLICT", "Câu điền đang chứa lựa chọn A–F.", "Bỏ lựa chọn hoặc sửa loại câu cho đúng.");
    q.options = [answer ?? "", ...accepted];
  } else {
    const a = answer?.trim().replace(/[.。]$/, "") ?? "";
    let indices: number[] = [];
    if (/^[A-F](?:\s*(?:[,;]|và)\s*[A-F])*$/iu.test(a)) indices = a.split(/\s*(?:[,;]|và)\s*/iu).map(label => labels.indexOf(label.toUpperCase()));
    else if (a) {
      const labeled = a.match(/^([A-F])[.)]\s*([\s\S]+)$/iu);
      if (labeled) {
        const i = labels.indexOf(labeled[1].toUpperCase()); indices = [i];
        if (i >= 0 && normalized(q.options[i]) !== normalized(labeled[2])) add("ANSWER_CONFLICT", "Ký hiệu và nội dung đáp án đúng không khớp.", "Sửa nhãn đáp án hoặc nội dung đáp án cho thống nhất.");
      } else indices = q.options.flatMap((option, i) => normalized(option) === normalized(a) ? [i] : []);
    }
    q.kind = type && !declared ? null : declared ?? (indices.length > 1 ? "MULTIPLE" : labels.length ? "SINGLE" : null);
    if (indices.some(i => i < 0)) add("UNKNOWN_ANSWER", `Đáp án ${a} không có trong lựa chọn.`, "Dùng nhãn có trong câu hoặc bổ sung lựa chọn còn thiếu.");
    if (new Set(indices).size !== indices.length) add("DUPLICATE_ANSWER", "Đáp án đúng bị lặp.", "Mỗi nhãn đáp án đúng chỉ ghi một lần.");
    if (q.kind === "SINGLE" && indices.length === 1 && indices[0] >= 0) q.correctIndex = indices[0];
    if (q.kind === "SINGLE" && indices.length > 1) add("TYPE_CONFLICT", "Câu chọn một có nhiều đáp án đúng.", "Sửa thành Chọn nhiều hoặc chỉ giữ một đáp án đúng.");
    if (q.kind === "MULTIPLE") q.correctIndexes = indices.filter(i => i >= 0);
    if (accepted.length) add("TYPE_CONFLICT", "Chấp nhận thêm chỉ dùng cho câu điền.", "Sửa loại câu hoặc bỏ trường Chấp nhận thêm.");
    if (labels.some((label, i) => label !== "ABCDEF"[i])) add("OPTION_LABELS", "Nhãn lựa chọn thiếu hoặc trùng.", "Đánh nhãn liên tiếp từ A đến F.");
  }
  if (/(?:hình|ảnh|sơ đồ|biểu đồ)\s+(?:dưới|sau|bên)|!\[.*\]\(/iu.test(q.text)) add("IMAGE_REFERENCE", "Câu có tham chiếu hình ảnh chưa được hỗ trợ.", "Viết đủ dữ kiện bằng chữ hoặc bỏ câu phụ thuộc hình khỏi tài liệu nhập.");
  const candidate = { ...q, evidence: null };
  const parsed = QuizDraftQuestionSchema.safeParse(candidate);
  if (!parsed.success) add("INVALID_FIELDS", "Có trường dữ liệu vượt giới hạn hoặc loại câu chưa xác định.", "Giới hạn câu hỏi 2.000 ký tự, 1–6 đáp án mỗi đáp án 1.000 ký tự, giải thích 4.000 ký tự, thời gian 10–120 giây.");
  else {
    try { validateReadyQuiz({ title: "Import", description: "", passScorePercent: 80, questions: [parsed.data] }); }
    catch {
      if (!q.diagnostics.some(d => d.severity === "error")) {
        const problems: string[] = [];
        if (!q.text.trim()) problems.push("Chưa có nội dung câu hỏi.");
        if (q.options.some(option => !option.trim())) problems.push(q.kind === "TEXT" ? "Có đáp án được chấp nhận đang để trống." : "Có lựa chọn đang để trống.");
        const nonempty = q.options.filter(option => option.trim()).map(normalized);
        if (new Set(nonempty).size !== nonempty.length) problems.push("Có đáp án trùng nội dung.");
        if (q.kind === "SINGLE" && q.correctIndex === null) problems.push("Chưa có đáp án đúng.");
        if (q.kind === "MULTIPLE" && !q.correctIndexes.length) problems.push("Chưa xác định được các đáp án đúng.");
        add("INCOMPLETE_QUESTION", problems.join(" ") || "Nội dung hoặc đáp án chưa hợp lệ.", q.kind === "TEXT" ? "Điền câu trả lời vào Đáp án: và bỏ các dòng Chấp nhận thêm đang trống hoặc trùng." : "Điền đủ nội dung lựa chọn, bỏ đáp án trùng và ghi Đáp án: B (chọn một) hoặc Đáp án: A, C (chọn nhiều).");
      }
    }
  }
  return q;
}
