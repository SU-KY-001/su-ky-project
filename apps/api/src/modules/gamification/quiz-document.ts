import { DomainError } from "../../core/errors/domain-error";

export const QUIZ_DOCUMENT_BYTES = 5 * 1024 * 1024;
const MAX_TEXT = 200_000;
const invalid = (message: string): DomainError =>
  new DomainError(422, "VALIDATION_ERROR", message);

export async function extractQuizDocument(
  file: File,
): Promise<{ fileName: string; text: string }> {
  if (!file.size) throw invalid("Tệp đang trống.");
  if (file.size > QUIZ_DOCUMENT_BYTES)
    throw new DomainError(413, "PAYLOAD_TOO_LARGE", "Tài liệu tối đa 5 MB.");
  const extension = file.name.split(".").pop()?.toLowerCase();
  if (extension === "doc")
    throw invalid(
      "Hãy lưu tệp .doc thành .docx hoặc sao chép nội dung vào ô dán văn bản.",
    );
  if (!["docx", "pdf", "txt", "md"].includes(extension ?? ""))
    throw invalid("Chỉ hỗ trợ .docx, .pdf có văn bản, .txt và .md.");
  const bytes = new Uint8Array(await file.arrayBuffer());
  let text = "";
  try {
    if (extension === "txt" || extension === "md") {
      const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
      if (decoded.includes("\0"))
        throw invalid(
          "Tệp không phải văn bản UTF-8. Hãy sao chép nội dung vào ô dán văn bản.",
        );
      text = decoded;
    } else if (extension === "docx") {
      const { unzipSync } = await import("fflate");
      let expanded = 0,
        entries = 0,
        document = false;
      // Inspect sizes before the Word reader expands the archive.
      unzipSync(bytes, {
        filter: (entry) => {
          expanded += entry.originalSize;
          entries++;
          if (expanded > 20 * 1024 * 1024 || entries > 1000)
            throw invalid(
              "Tài liệu Word quá lớn sau giải nén. Hãy chia nhỏ hoặc dán phần câu hỏi.",
            );
          if (entry.name === "word/document.xml") document = true;
          return false;
        },
      });
      if (!document) throw invalid("Tệp không chứa tài liệu Word hợp lệ.");
      const mammoth = await import("mammoth");
      text = (await mammoth.extractRawText({ buffer: Buffer.from(bytes) }))
        .value;
    } else {
      if (!new TextDecoder().decode(bytes.subarray(0, 1024)).includes("%PDF-"))
        throw invalid("Tệp PDF không hợp lệ.");
      const { getDocumentProxy, extractText } = await import("unpdf");
      const document = await getDocumentProxy(bytes);
      let timer: ReturnType<typeof setTimeout> | undefined;
      try {
        if (document.numPages > 100)
          throw invalid("PDF tối đa 100 trang. Hãy chia nhỏ tài liệu.");
        const result = await Promise.race([
          extractText(document, { mergePages: false }),
          new Promise<never>((_, reject) => {
            timer = setTimeout(
              () =>
                reject(
                  invalid(
                    "Đọc PDF quá thời gian. Hãy dán phần câu hỏi hoặc chia nhỏ tài liệu.",
                  ),
                ),
              15_000,
            );
          }),
        ]);
        text = result.text.join("\n\n");
      } finally {
        clearTimeout(timer);
        await document.loadingTask.destroy();
      }
      if (!text.trim())
        throw invalid(
          "PDF chưa có văn bản đọc được. Nếu đây là bản scan, hãy OCR hoặc dán văn bản đã nhận dạng.",
        );
    }
  } catch (error) {
    if (error instanceof DomainError) throw error;
    throw invalid(
      extension === "pdf"
        ? "Không đọc được PDF. Tệp có thể bị khóa hoặc hỏng; hãy dùng bản có văn bản hoặc dán nội dung."
        : "Không đọc được tài liệu. Hãy kiểm tra định dạng hoặc dán nội dung trực tiếp.",
    );
  }
  text = text
    .normalize("NFC")
    .replace(/\r\n?/g, "\n")
    .replace(/^\uFEFF/, "")
    .trim();
  if (!text) throw invalid("Không tìm thấy văn bản trong tài liệu.");
  if (text.length > MAX_TEXT)
    throw invalid(
      "Tài liệu vượt quá 200.000 ký tự. Hãy chia nhỏ hoặc chỉ dán phần câu hỏi.",
    );
  return { fileName: file.name.slice(0, 255), text };
}
