import { getDocumentProxy } from "unpdf";
import { QUIZ_IMPORT_LIMITS, type QuizImportBlock } from "@repo/shared";
import { DomainError } from "../../../core/errors/domain-error";

export async function readPdfBlocks(bytes: Uint8Array, signal: AbortSignal): Promise<QuizImportBlock[]> {
  const document = await getDocumentProxy(bytes);
  const blocks: QuizImportBlock[] = [];
  try {
    if (document.numPages > QUIZ_IMPORT_LIMITS.pages) throw new DomainError(422, "VALIDATION_ERROR", "PDF tối đa 100 trang. Hãy chia nhỏ tài liệu.");
    let length = 0;
    for (let number = 1; number <= document.numPages; number++) {
      signal.throwIfAborted();
      const page = await document.getPage(number), content = await page.getTextContent();
      const items = content.items.filter(item => "str" in item && item.str.trim());
      const rows = new Map<number, { x: number; width: number; height: number; text: string }[]>();
      for (const item of items) {
        if (!("str" in item)) continue;
        if (Math.abs(item.transform[1]) > 0.1 || Math.abs(item.transform[2]) > 0.1) throw new DomainError(422, "VALIDATION_ERROR", "PDF có chữ xoay/bố cục chưa hỗ trợ. Hãy lưu thành DOCX hoặc TXT rồi tải lại.");
        const y = Math.round(item.transform[5] / 3) * 3;
        const row = rows.get(y) ?? []; row.push({ x: item.transform[4], width: item.width, height: item.height || Math.abs(item.transform[3]), text: item.str }); rows.set(y, row);
      }
      for (const [, row] of [...rows.entries()].sort(([a], [b]) => b - a)) {
        row.sort((a, b) => a.x - b.x);
        let text = "";
        for (let i = 0; i < row.length; i++) {
          const item = row[i], previous = row[i - 1], gap = previous ? item.x - previous.x - previous.width : 0;
          if (previous && gap > 80 && !/^[A-F][.)]/.test(item.text.trim())) throw new DomainError(422, "VALIDATION_ERROR", "PDF có nhiều cột/bảng chưa xác định được thứ tự. Hãy chuyển sang tài liệu một cột hoặc DOCX.");
          const wordGap = previous ? Math.max(1, Math.min(previous.height, item.height) * 0.2) : 0;
          const separator = previous && !/\s$/.test(previous.text) && !/^\s/.test(item.text) && gap > wordGap ? gap > 10 ? "    " : " " : "";
          text += `${separator}${item.text}`;
        }
        length += text.length + 1;
        if (length > QUIZ_IMPORT_LIMITS.text) throw new DomainError(422, "VALIDATION_ERROR", "Tài liệu vượt 200.000 ký tự. Hãy chia nhỏ file.");
        blocks.push({ text, page: number, line: null });
      }
    }
    if (!blocks.length) throw new DomainError(422, "VALIDATION_ERROR", "PDF chưa có văn bản đọc được. Bản scan cần OCR trước hoặc chuyển sang DOCX/TXT có chữ.");
    return blocks;
  } finally { await document.loadingTask.destroy(); }
}
