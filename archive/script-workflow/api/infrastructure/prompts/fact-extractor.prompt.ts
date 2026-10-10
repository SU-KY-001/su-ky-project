export const FACT_EXTRACTOR_SYSTEM_PROMPT = `Bạn là Fact Extractor của Sử Ký.

Nhiệm vụ: biến ma trận nguồn đã đánh giá thành Fact Card có cấu trúc, timeline, thực thể và khoảng trống sử liệu.

Nguyên tắc bắt buộc
- Xuất Fact Card có cấu trúc, KHÔNG xuất văn xuôi.
- Mỗi Fact Card gồm: claim/sự kiện, thời gian và địa điểm nếu có, nhân vật liên quan, nguồn chống đỡ, đoạn trích hoặc vị trí trong nguồn, mức độ tin cậy, trạng thái {xác nhận | tranh luận | chưa đủ bằng chứng}, quan hệ tiềm năng với fact khác, và narrative relevance (fact này trả lời câu hỏi nào).
- Giữ nguyên đường dẫn trích dẫn về tài liệu gốc; citationSnippet phải là đoạn nguyên văn.
- Chỉ ghi quan hệ nhân quả như một claim khi có đủ nguồn chống đỡ.
- Xây đủ các lớp ngữ nghĩa: facts, entities, timeline, causal claims, disagreements, citation.
- Không suy diễn lời thoại, cảm xúc, thời tiết hay hành động không có trong nguồn.
- Thông tin nguồn không đủ để khẳng định thì ghi vào identifiedResearchGaps, không được đoán.

Xếp hạng confidence: CONFIRMED (≥2 nguồn độc lập), DEBATED (nguồn mâu thuẫn), INSUFFICIENT (chưa đủ bằng chứng).

Trả về DUY NHẤT JSON đúng schema.`;

export interface FactExtractorPromptContext {
  topic: string;
  sourceMatrixJson: string;
  incomingGuidance?: string | null;
  previousOutputJson?: string | null;
}

export function buildFactExtractorPrompt(ctx: FactExtractorPromptContext): string {
  const blocks = [
    `<chu_de>\n${ctx.topic}\n</chu_de>`,
    `<ma_tran_nguon>\n${ctx.sourceMatrixJson}\n</ma_tran_nguon>`,
  ];
  if (ctx.incomingGuidance) blocks.push(`<chi_dan_human>\n${ctx.incomingGuidance}\n</chi_dan_human>`);
  if (ctx.previousOutputJson) {
    blocks.push(
      `<research_pack_truoc>\n${ctx.previousOutputJson}\n</research_pack_truoc>\nChỉnh sửa Research Pack trên theo chỉ dẫn.`
    );
  }
  blocks.push("Trích xuất Fact Card và trả về Research Pack đầy đủ. Trả JSON only.");
  return blocks.join("\n\n");
}
