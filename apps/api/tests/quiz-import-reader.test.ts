import { describe, expect, it } from "bun:test";
import { parseQuizDocument } from "@repo/shared";
import { readQuizDocument } from "../src/modules/gamification/quiz-import/document-reader";
import { MIXED_QUIZ, docxFixture, pdfTextFixture } from "./support/quiz-import-fixtures";
import { strToU8, unzipSync, zipSync } from "fflate";
const signal = (): AbortSignal => new AbortController().signal;
describe("quiz import document adapters", () => {
  it.each(["txt", "md"])("reads actual %s mixed questions with BOM and line provenance", async ext => {
    const d = await readQuizDocument(new File([`\uFEFF${MIXED_QUIZ.replace(/\n/g, "\r\n")}`], `quiz.${ext}`), signal());
    const r = parseQuizDocument(d, 20);
    expect(r.status).toBe("ready"); expect(r.summary.total).toBe(3); expect(r.questions[0].source.lineStart).toBe(1);
  });
  it("reads actual Word paragraphs and all three question types", async () => {
    const d = await readQuizDocument(new File([docxFixture()], "quiz.docx"), signal());
    const r = parseQuizDocument(d, 30);
    expect(r.status).toBe("ready"); expect(r.questions.map(q => q.kind)).toEqual(["SINGLE", "MULTIPLE", "TEXT"]);
    expect(r.questions[0].source.pageStart).toBeNull();
  });
  it("rejects corrupt, disguised, empty and oversized sources", async () => {
    for (const f of [new File([], "q.txt"), new File(["not pdf"], "q.pdf"), new File(["bad"], "q.docx"), new File(["bad"], "q.doc"), new File(["x"], "q.exe"), new File([new Uint8Array([255, 0])], "q.txt"), new File(["x".repeat(200_001)], "q.md"), new File([new Uint8Array(5 * 1024 * 1024 + 1)], "q.txt")]) await expect(readQuizDocument(f, signal())).rejects.toThrow();
  });
  it("honors an already aborted request before opening the file", async () => {
    await expect(readQuizDocument(new File([MIXED_QUIZ], "q.txt"), AbortSignal.abort())).rejects.toThrow();
  });
  it("keeps table rows together including answer metadata in a second cell", async () => {
    const parts = unzipSync(docxFixture());
    parts["word/document.xml"] = strToU8('<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:tbl><w:tr><w:tc><w:p><w:r><w:t>Câu 1:</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Hỏi?</w:t></w:r></w:p></w:tc></w:tr><w:tr><w:tc><w:p><w:r><w:t>Đáp án:</w:t></w:r></w:p></w:tc><w:tc><w:p><w:r><w:t>Có</w:t></w:r></w:p></w:tc></w:tr></w:tbl></w:body></w:document>');
    const result = parseQuizDocument(await readQuizDocument(new File([zipSync(parts)], "table.docx"), signal()), 20);
    expect(result.status).toBe("ready"); expect(result.questions[0].options).toEqual(["Có"]);
  });
  it.each([1, 7])("preserves automatic Word numbering or rejects unsupported start %s clearly", async start => {
    const parts = unzipSync(docxFixture());
    const paragraph = (text: string, level?: number): string => `<w:p>${level === undefined ? "" : `<w:pPr><w:numPr><w:ilvl w:val="${level}"/><w:numId w:val="1"/></w:numPr></w:pPr>`}<w:r><w:t>${text}</w:t></w:r></w:p>`;
    parts["word/document.xml"] = strToU8(`<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraph("Hỏi?", 0)}${paragraph("Một", 1)}${paragraph("Hai", 1)}${paragraph("Đáp án: B")}</w:body></w:document>`);
    parts["word/numbering.xml"] = strToU8('<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:abstractNum w:abstractNumId="0"><w:lvl w:ilvl="0"><w:start w:val="1"/><w:numFmt w:val="decimal"/><w:lvlText w:val="%1."/></w:lvl><w:lvl w:ilvl="1"><w:start w:val="1"/><w:numFmt w:val="upperLetter"/><w:lvlText w:val="%2."/></w:lvl></w:abstractNum><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>');
    parts["word/_rels/document.xml.rels"] = strToU8('<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rIdNumbering" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/></Relationships>');
    if (start !== 1) {
      parts["word/numbering.xml"] = strToU8(new TextDecoder().decode(parts["word/numbering.xml"]).replace('<w:start w:val="1"/>', `<w:start w:val="${start}"/>`));
      await expect(readQuizDocument(new File([zipSync(parts)], "numbered.docx"), signal())).rejects.toThrow("đánh số"); return;
    }
    const result = parseQuizDocument(await readQuizDocument(new File([zipSync(parts)], "numbered.docx"), signal()), 20);
    expect(result.diagnostics.filter(d => d.severity === "error").map(d => d.message)).toEqual([]);
    expect(result.questions[0]).toMatchObject({ sourceNumber: 1, text: "Hỏi?", options: ["Một", "Hai"], correctIndex: 1 });
  });
  it("preserves adjacent PDF glyph runs across font changes without inserting a space", async () => {
    const bytes = pdfTextFixture("BT /F1 12 Tf 50 700 Td (1. foo) Tj /F2 12 Tf (bar?) Tj ET");
    const result = await readQuizDocument(new File([bytes], "font.pdf"), signal());
    expect(result.blocks.map(b => b.text)).toEqual(["1. foobar?"]);
  });
  it("rejects empty-text and over-page-limit PDFs", async () => {
    await expect(readQuizDocument(new File([pdfTextFixture("")], "scan.pdf"), signal())).rejects.toThrow("OCR");
    await expect(readQuizDocument(new File([pdfTextFixture("", 101)], "long.pdf"), signal())).rejects.toThrow("100 trang");
  });
});
