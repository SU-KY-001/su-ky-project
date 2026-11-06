import { describe, expect, it } from "bun:test";
import { strToU8, zipSync } from "fflate";
import { extractQuizDocument } from "../src/modules/gamification/quiz-document";

function pdfFixture(content: string): Uint8Array {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
  ];
  let source = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, i) => {
    offsets.push(source.length);
    source += `${i + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = source.length;
  source += `xref\n0 6\n0000000000 65535 f \n${offsets
    .slice(1)
    .map((offset) => `${String(offset).padStart(10, "0")} 00000 n \n`)
    .join("")}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return strToU8(source);
}

describe("quiz document text extraction", () => {
  it("reads UTF-8 Markdown and normalizes line endings", async () => {
    const result = await extractQuizDocument(
      new File(["Câu 1: Hỏi?\r\nĐáp án: Trả lời"], "quiz.md"),
    );
    expect(result.text).toBe("Câu 1: Hỏi?\nĐáp án: Trả lời");
  });
  it("reads actual Word paragraphs without retaining formatting markup", async () => {
    const bytes = zipSync({
      "[Content_Types].xml": strToU8(
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>',
      ),
      "_rels/.rels": strToU8(
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>',
      ),
      "word/document.xml": strToU8(
        '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>Câu 1: Hỏi?</w:t></w:r></w:p><w:p><w:r><w:t>A. Một</w:t></w:r></w:p><w:p><w:r><w:t>B. Hai</w:t></w:r></w:p><w:p><w:r><w:t>Đáp án: B</w:t></w:r></w:p></w:body></w:document>',
      ),
    });
    const result = await extractQuizDocument(new File([bytes], "quiz.docx"));
    expect(result.text).toContain("Câu 1: Hỏi?");
    expect(result.text).toContain("Đáp án: B");
    expect(result.text).not.toContain("<w:");
  });
  it("rejects empty, unsupported, corrupted and oversized documents", async () => {
    await expect(extractQuizDocument(new File([], "quiz.txt"))).rejects.toThrow(
      "trống",
    );
    await expect(
      extractQuizDocument(new File(["abc"], "quiz.doc")),
    ).rejects.toThrow(".docx");
    await expect(
      extractQuizDocument(new File(["abc"], "quiz.xlsx")),
    ).rejects.toThrow("Chỉ hỗ trợ");
    await expect(
      extractQuizDocument(new File(["abc"], "quiz.docx")),
    ).rejects.toThrow("Không đọc được");
    await expect(
      extractQuizDocument(
        new File([new Uint8Array(5 * 1024 * 1024 + 1)], "quiz.txt"),
      ),
    ).rejects.toThrow("5 MB");
  });
  it("rejects binary data masquerading as text and excessive expanded Word archives", async () => {
    await expect(
      extractQuizDocument(new File([new Uint8Array([0, 0, 0])], "quiz.txt")),
    ).rejects.toThrow("UTF-8");
    const large = zipSync({
      "word/document.xml": new Uint8Array(21 * 1024 * 1024),
    });
    await expect(
      extractQuizDocument(new File([large], "quiz.docx")),
    ).rejects.toThrow("giải nén");
  });
  it("reads text PDFs and explains that image-only PDFs need OCR", async () => {
    const text = await extractQuizDocument(
      new File(
        [
          pdfFixture(
            "BT /F1 12 Tf 50 700 Td (Cau 1: Hello?) Tj 0 -20 Td (Answer: World) Tj ET",
          ),
        ],
        "quiz.pdf",
      ),
    );
    expect(text.text).toContain("Cau 1: Hello?");
    expect(text.text).toContain("Answer: World");
    await expect(
      extractQuizDocument(new File([pdfFixture("")], "scan.pdf")),
    ).rejects.toThrow("OCR");
  });
});
