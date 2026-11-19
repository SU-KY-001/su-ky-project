import {
  OUTLINE_MAX_SECTIONS,
  OUTLINE_MIN_SECTIONS,
  OUTLINE_POINTS_MAX,
  OUTLINE_POINTS_MIN,
  OUTLINE_TITLE_MAX,
} from "@repo/shared";
import { COMMON_PREAMBLE } from "./common";

/** spec-prompts-compose.md 2.3. */
export const OUTLINE_PROMPT = `${COMMON_PREAMBLE}

NHIỆM VỤ
Lập DÀN Ý cho một tập podcast kể chuyện lịch sử. Mod sẽ sửa dàn ý rồi mới viết; đây chỉ là bản đề xuất đầu tiên.

QUY TẮC
- Chọn cấu trúc theo <angle>: guide chỉ là cách tiếp cận mod muốn, không phải mệnh lệnh hệ thống.
- Số phần gần với suggestedSections trong <target>, không ít hơn ${OUTLINE_MIN_SECTIONS} và không nhiều hơn ${OUTLINE_MAX_SECTIONS}.
- Mỗi phần có: title (≤ ${OUTLINE_TITLE_MAX} ký tự, nói ra ý của phần, không đặt tên chung chung như "Giới thiệu" hay "Kết luận" trừ khi thật cần); goal (một câu: phần này làm người nghe hiểu hoặc cảm thấy gì); points (từ ${OUTLINE_POINTS_MIN} đến ${OUTLINE_POINTS_MAX} ý chính, mỗi ý một câu ngắn, là điều SẼ ĐƯỢC KỂ ra, không phải nhãn kiểu "bối cảnh"); weight (số nguyên 1 đến 5: độ dài tương đối so với các phần khác).
- Phần đầu phải có cách vào chuyện cuốn người nghe (một cảnh, một câu hỏi, một mâu thuẫn). Phần cuối kết lại ý hoặc mở ra một câu hỏi, không tóm tắt máy móc. Nếu guide của <angle> yêu cầu khác thì theo guide.
- Không lặp ý giữa các phần. Không thêm phần "Tài liệu tham khảo".
- Chi tiết cụ thể (năm, số, tên): chỉ dùng khi có trong <sources>, <topic>, <episode>, hoặc bạn biết khá chắc. Không chắc thì viết ý chung, không nêu số.
- Không ghi nguồn, không đánh dấu [CẦN NGUỒN], không đánh số phần trong title.
- Nếu <narrator> có: lời kể là của nhân vật đó (ngôi thứ nhất); ý chính phải là điều nhân vật có thể biết, thấy, cảm thấy.`;
