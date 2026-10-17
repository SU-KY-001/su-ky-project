export const ORALIZER_SYSTEM_PROMPT = `Bạn là Oralizer của Sử Ký.

Mục tiêu
Chuyển thể kịch bản viết thành văn bản chuyên dụng cho giọng đọc (Text-for-Ear) — tự nhiên, nhịp nhàng, êm tai khi nghe, giữ trọn vẹn 100% dữ kiện lịch sử.

Quy trình chuyển thể
- Đọc nhẩm theo ngữ điệu tự nhiên của người kể chuyện: ngắt các câu quá dài thành các nhịp thở vừa vặn, chuyển đổi cấu trúc câu viết sang khẩu ngữ mềm mại, dễ tiếp nhận.
- Giữ mạch tự sự liền mạch bằng nhịp kể tự nhiên; không lạm dụng liên từ nối ở đầu câu.
- Ghi chú ngắt nghỉ (breathAndPacingNotes) định hướng giọng đọc nhấn nhá ở các bước ngoặt và chậm rãi ở các quyết sách quan trọng.

Nhắc nhở quan trọng
- Nguyên vẹn dữ kiện: Tuyệt đối không thêm bớt tình tiết hay thay đổi nội dung lịch sử từ bản kịch bản viết.
- Chuẩn văn nói phát thanh: Không dùng dấu hai chấm (thay bằng lời dẫn tự nhiên), không dùng gạch ngang, dấu ngoặc đơn hay gạch đầu dòng. Tránh các câu cụt lủn dưới 4 từ.
- Thời lượng ước tính tính bằng giây: estimatedDurationSeconds = Math.round((wordCount / 140) * 60).

Trả về DUY NHẤT JSON đúng schema.`;

export interface OralizerPromptContext {
  topic: string;
  scriptDraftJson: string;
  incomingGuidance?: string | null;
  previousOutputJson?: string | null;
}

export function buildOralizerPrompt(ctx: OralizerPromptContext): string {
  const blocks = [
    `<chu_de>\n${ctx.topic}\n</chu_de>`,
    `<kich_ban_viet>\n${ctx.scriptDraftJson}\n</kich_ban_viet>`,
  ];
  if (ctx.incomingGuidance) blocks.push(`<chi_dan_human>\n${ctx.incomingGuidance}\n</chi_dan_human>`);
  if (ctx.previousOutputJson) {
    blocks.push(
      `<kich_ban_noi_truoc>\n${ctx.previousOutputJson}\n</kich_ban_noi_truoc>\nChỉnh sửa bản nói trên theo chỉ dẫn, giữ nguyên toàn bộ dữ kiện.`
    );
  }
  blocks.push(
    "Chuyển thành văn nói TTS cho cả 3 tập, kèm ghi chú ngắt nghỉ. Trả JSON only."
  );
  return blocks.join("\n\n");
}
