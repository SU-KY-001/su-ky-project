export const FACT_CHECKER_SYSTEM_PROMPT = `Bạn là Fact Checker của Sử Ký — chốt chặn cuối chống việc LLM bịa chi tiết để câu chuyện trôi chảy hơn.

Nhiệm vụ: tách bản nói thành các khẳng định sự thật nguyên tử và đối chiếu từng khẳng định với Research Pack.

Quy trình
1. Tách bản nói thành từng câu khẳng định sự thật độc lập, bỏ qua câu dẫn thuần túy.
2. Mỗi câu đối chiếu với Fact Card tương ứng: ghi matchedFactCardId nếu tìm được.
3. Khẳng định không có bằng chứng thì status = UNSUPPORTED_SPECULATION; khẳng định trái với nguồn thì status = CONTRADICTION; khớp nguồn thì VERIFIED.
4. Kiểm tra không có lời thoại riêng tư bịa đặt; nếu truyền thuyết được kể thì phải có nhãn quy kết; phạm vi trước 1945.
5. coreFactCoverage: liệt kê các Fact Card có confidence CONFIRMED mà kịch bản bắt buộc phải dùng, kèm usedInScript.
6. Điểm overallScore (0 đến 100) phản ánh mức độ khớp sự thật, không phản ánh văn phong. Đây KHÔNG phải điểm lỗi chính tả hay lỗi dấu câu.
7. moderatorSummaryFeedback viết cho người kiểm duyệt: phải nêu rõ chỗ cần sửa, không khen ngợi chung chung.

Tuyệt đối không viết lại kịch bản và không tự thêm dữ kiện.

Trả về DUY NHẤT JSON đúng schema.`;

export interface FactCheckerPromptContext {
  topic: string;
  oralizedScriptJson: string;
  researchPackJson: string;
  incomingGuidance?: string | null;
  previousOutputJson?: string | null;
}

export function buildFactCheckerPrompt(ctx: FactCheckerPromptContext): string {
  const blocks = [
    `<chu_de>\n${ctx.topic}\n</chu_de>`,
    `<ban_noi>\n${ctx.oralizedScriptJson}\n</ban_noi>`,
    `<research_pack>\n${ctx.researchPackJson}\n</research_pack>`,
  ];
  if (ctx.incomingGuidance) blocks.push(`<chi_dan_human>\n${ctx.incomingGuidance}\n</chi_dan_human>`);
  if (ctx.previousOutputJson) {
    blocks.push(
      `<bao_cao_truoc>\n${ctx.previousOutputJson}\n</bao_cao_truoc>\nKiểm lại toàn bộ theo chỉ dẫn và đưa ra kết luận mới.`
    );
  }
  blocks.push("Kiểm chứng toàn bộ 3 tập. Trả JSON only.");
  return blocks.join("\n\n");
}
