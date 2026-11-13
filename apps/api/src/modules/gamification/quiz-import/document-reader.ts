import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync } from "fflate";
import { convertToHtml } from "mammoth";
import { QUIZ_IMPORT_LIMITS, QuizImportFormatSchema, type QuizImportDocument, type QuizImportBlock } from "@repo/shared";
import { DomainError } from "../../../core/errors/domain-error";
import { convertLegacyWord } from "./office-converter";
import { readPdfBlocks } from "./pdf-reader";
import { removeImportDirectory } from "./temp-directory";

const invalid = (message: string): DomainError => new DomainError(422, "VALIDATION_ERROR", message);
function inspectWord(bytes: Uint8Array): void {
  let expanded = 0, entries = 0, document = false;
  if (bytes[0] !== 80 || bytes[1] !== 75) throw invalid("Tệp DOCX không hợp lệ. Hãy mở và lưu lại bằng Word.");
  unzipSync(bytes, { filter: entry => {
    expanded += entry.originalSize; entries++;
    if (expanded > QUIZ_IMPORT_LIMITS.expandedBytes || entries > QUIZ_IMPORT_LIMITS.entries) throw invalid("Tài liệu Word quá lớn sau giải nén. Hãy chia nhỏ file.");
    if (entry.name === "word/document.xml") document = true;
    if (/vbaProject|embeddings\//i.test(entry.name)) throw invalid("Tài liệu chứa macro hoặc đối tượng nhúng chưa được hỗ trợ. Hãy lưu bản chỉ có câu hỏi bằng chữ.");
    return false;
  } });
  if (!document) throw invalid("Không tìm thấy nội dung Word trong DOCX.");
}
async function wordBlocks(bytes: Uint8Array): Promise<QuizImportBlock[]> {
  inspectWord(bytes);
  const numbering = unzipSync(bytes, { filter: entry => entry.name === "word/numbering.xml" })["word/numbering.xml"];
  if (numbering) {
    let unsupported = false;
    await new HTMLRewriter().on("*", { element(element) {
      if (["start", "startoverride"].includes(element.tagName.split(":").at(-1) ?? "")) {
        const value = [...element.attributes].find(([name]) => name === "val" || name.endsWith(":val"))?.[1];
        if (value !== undefined && value !== "1") unsupported = true;
      }
    } }).transform(new Response(new TextDecoder().decode(numbering))).text();
    if (unsupported) throw invalid("Danh sách Word có kiểu đánh số bắt đầu khác 1 chưa được hỗ trợ. Hãy chuyển số tự động thành chữ Câu 7: tương ứng trong file rồi tải lại.");
  }
  const result = await convertToHtml({ buffer: Buffer.from(bytes) });
  const blocks: QuizImportBlock[] = [];
  let text = "", listDepth = 0, inRow = false, cellText = "";
  let cells: string[] = [];
  const counters: number[] = [];
  const flush = (): void => { if (/^(?:\d+|[A-F])\.\s*$/.test(text)) return; if (text.trim()) blocks.push({ text: text.trim(), page: null, line: null }); text = ""; };
  const rewriter = new HTMLRewriter().on("*", {
    element(element) {
      const tag = element.tagName;
      if (tag === "tr") { flush(); inRow = true; cells = []; element.onEndTag(() => { if (cells.some(c => c.trim())) blocks.push({ text: cells.join("    "), page: null, line: null }); inRow = false; }); return; }
      if ((tag === "td" || tag === "th") && inRow) { cellText = ""; element.onEndTag(() => { cells.push(cellText.trim()); cellText = ""; }); return; }
      if (inRow) { if (tag === "br") cellText += "\n"; if (tag === "p") element.onEndTag(() => { cellText += "\n"; }); if (tag === "img") cellText += "[Hình ảnh chưa được hỗ trợ]"; return; }
      if (tag === "ol" || tag === "ul") { flush(); listDepth++; const start = Number(element.getAttribute("start") ?? 1); counters.push(Number.isSafeInteger(start) && start > 0 ? start - 1 : 0); element.onEndTag(() => { flush(); listDepth--; counters.pop(); }); }
      if (/^(p|h[1-6]|li)$/.test(tag)) {
        flush();
        if (tag === "li") { counters[counters.length - 1] = (counters.at(-1) ?? 0) + 1; text = listDepth === 1 ? `${counters.at(-1)}. ` : `${"ABCDEF"[(counters.at(-1) ?? 1) - 1] ?? "?"}. `; }
        element.onEndTag(flush);
      }
      if (tag === "br") text += "\n";
      if (tag === "img") { flush(); blocks.push({ text: "[Hình ảnh chưa được hỗ trợ]", page: null, line: null }); }
    },
    text(chunk) { if (inRow) cellText += chunk.text; else text += chunk.text; },
  });
  await rewriter.transform(new Response(result.value)).text(); flush();
  return blocks;
}

export async function readQuizDocument(file: File, signal: AbortSignal, workDirectory?: string): Promise<QuizImportDocument> {
  signal.throwIfAborted();
  if (!file.size) throw invalid("Tệp đang trống. Hãy chọn tài liệu có câu hỏi.");
  if (file.size > QUIZ_IMPORT_LIMITS.bytes) throw new DomainError(413, "PAYLOAD_TOO_LARGE", "Tài liệu tối đa 5 MB.");
  const parsed = QuizImportFormatSchema.safeParse(file.name.split(".").pop()?.toLowerCase());
  if (!parsed.success) throw invalid("Chỉ hỗ trợ DOC, DOCX, PDF có văn bản, TXT và MD.");
  const format = parsed.data;
  let bytes: Uint8Array = new Uint8Array(await file.arrayBuffer());
  let ownedDirectory: string | undefined;
  try {
    let blocks: QuizImportBlock[];
    if (format === "doc") {
      if (Buffer.from(bytes.subarray(0, 8)).toString("hex") !== "d0cf11e0a1b11ae1") throw invalid("Nội dung file không đúng định dạng DOC. Hãy mở và lưu lại thành DOCX.");
      const directory = workDirectory ?? (ownedDirectory = await mkdtemp(join(tmpdir(), "quiz-import-")));
      bytes = await convertLegacyWord(bytes, directory, signal);
      blocks = await wordBlocks(bytes);
    } else if (format === "docx") blocks = await wordBlocks(bytes);
    else if (format === "pdf") {
      if (!new TextDecoder().decode(bytes.subarray(0, 1024)).includes("%PDF-")) throw invalid("Tệp PDF không hợp lệ. Hãy mở và lưu lại tài liệu.");
      blocks = await readPdfBlocks(bytes, signal);
    } else {
      const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes).normalize("NFC").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
      if (text.includes("\0")) throw invalid("Tệp không phải văn bản UTF-8. Hãy lưu lại dưới dạng UTF-8.");
      blocks = text.split("\n").map((text, i) => ({ text, page: null, line: i + 1 }));
    }
    signal.throwIfAborted();
    const length = blocks.reduce((n, b) => n + b.text.length + 1, 0);
    if (length > QUIZ_IMPORT_LIMITS.text) throw invalid("Tài liệu vượt quá 200.000 ký tự. Hãy chia nhỏ file.");
    if (!blocks.some(b => b.text.trim())) throw invalid("Không tìm thấy văn bản trong tài liệu.");
    return { fileName: file.name.slice(0, 255), format, blocks };
  } catch (error) {
    if (error instanceof DomainError || signal.aborted) throw error;
    throw invalid(format === "pdf" ? "Không đọc được PDF. File có thể bị khóa hoặc hỏng; hãy mở khóa và lưu lại bản có văn bản." : "Không đọc được tài liệu. Hãy kiểm tra file và lưu lại bằng định dạng hợp lệ; TXT/MD cần UTF-8.");
  } finally { if (ownedDirectory) await removeImportDirectory(ownedDirectory); }
}
