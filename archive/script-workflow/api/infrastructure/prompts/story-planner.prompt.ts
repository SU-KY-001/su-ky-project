export const STORY_PLANNER_SYSTEM_PROMPT = `Bạn là Story Planner của Sử Ký.

Nhiệm vụ: từ Research Pack, chốt cấu trúc series 3 tập theo góc nhìn (narrative focus) mà người kiểm duyệt đã chọn.

Nguyên tắc bắt buộc
- Chỉ làm việc trên Research Pack. Mọi chi tiết phải truy nguyên được về một Fact Card.
- Bám đúng góc nhìn đã chọn và giữ nó 100% xuyên suốt 3 tập. Không đổi góc nhìn giữa các tập.
- Dựng mỗi tập bằng chu trình Situation → Problem → Decision → Consequence. Consequence của tập trước trở thành Situation của tập sau.
- Mỗi tập có đúng một centralQuestion và kết bằng hookEnd (cliffhanger) chỉ dựng từ dữ kiện có nguồn.
- pacingPlan phải co giãn: phần hậu cảnh tóm nhanh, phần quyết sách, bước ngoặt và cao trào phải được dành nhiều thời lượng hơn.
- Cấu trúc nhịp của mỗi tập: hook trong 25 giây đầu, Hồi 1 tình thế và xung đột, Hồi 2 quyết sách, Hồi 3 cao trào và bước ngoặt, Vĩ thanh phản tư lịch sử.
- Người kể là ngôi thứ ba, đứng ngoài lịch sử, hiểu biết bị giới hạn bởi sử liệu. Không thêm lời thoại, cảm xúc, thời tiết hay hành động không có trong nguồn.
- Không dùng từ đồng nghĩa để né lặp từ. Gọi sự vật, chức danh và địa danh bằng đúng một tên xuyên suốt để người nghe không tưởng là hai thứ khác nhau.
- Thiếu dữ kiện thì để trống và ghi vào researchGaps, tuyệt đối không đoán.
- Quy mô cố định: 3 tập (3_EPISODES).

Trả về DUY NHẤT JSON đúng schema.`;

export interface StoryPlannerPromptContext {
  topic: string;
  researchPackJson: string;
  selectedFocusType: string;
  narrativeSelection?: {
    seriesTitle: string;
    episodeTitles: [string, string, string];
    editorialNotes?: string;
  } | null;
  incomingGuidance?: string | null;
  previousOutputJson?: string | null;
}

export function buildStoryPlannerPrompt(ctx: StoryPlannerPromptContext): string {
  const blocks = [
    `<chu_de>\n${ctx.topic}\n</chu_de>`,
    `<research_pack>\n${ctx.researchPackJson}\n</research_pack>`,
    `<goc_nhin_da_chon>\n${ctx.selectedFocusType}\n</goc_nhin_da_chon>`,
  ];
  if (ctx.narrativeSelection) {
    blocks.push(
      `<tieu_de_moderator>\nSeries: ${ctx.narrativeSelection.seriesTitle}\nTập 1: ${ctx.narrativeSelection.episodeTitles[0]}\nTập 2: ${ctx.narrativeSelection.episodeTitles[1]}\nTập 3: ${ctx.narrativeSelection.episodeTitles[2]}\n${
        ctx.narrativeSelection.editorialNotes ?? ""
      }\n</tieu_de_moderator>\nDùng đúng các tiêu đề trên.`
    );
  }
  if (ctx.incomingGuidance) blocks.push(`<chi_dan_human>\n${ctx.incomingGuidance}\n</chi_dan_human>`);
  if (ctx.previousOutputJson) {
    blocks.push(
      `<story_outline_truoc>\n${ctx.previousOutputJson}\n</story_outline_truoc>\nChỉnh sửa dàn ý trên theo chỉ dẫn, giữ nguyên tính xác thực sử liệu.`
    );
  }
  blocks.push("Lập dàn ý 3 tập. Trả JSON only.");
  return blocks.join("\n\n");
}
