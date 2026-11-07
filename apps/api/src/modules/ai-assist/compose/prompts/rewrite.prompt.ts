import { LONG_SENTENCE_SYLLABLES } from "../constants";
import { COMMON_PREAMBLE } from "./common";

/**
 * spec-prompts-compose.md 5.3. `{count}` in the task line is filled per call by the input builder (<count>), so the
 * system prompt stays constant for provider-side caching.
 */
export const REWRITE_PROMPT = `${COMMON_PREAMBLE}

NHIỆM VỤ
Viết lại phần chữ trong <target_text> thành đúng số bản KHÁC NHAU ghi trong <count>. Mỗi bản sẽ thay thế toàn bộ <target_text> trong kịch bản; <before> và <after> chỉ để giữ mạch, đừng chép lại.

QUY TẮC
- Giữ NGUYÊN mọi dữ kiện đã có: năm, số, tên, quan hệ, thứ tự sự kiện. Không thêm sự kiện, số, tên, trích dẫn mới. Không biến diễn giải ("có lẽ", "dường như", "có thể hình dung") thành khẳng định, không biến lời gián tiếp thành câu trích nguyên văn, không biến lời dựng lại thành lời đã nói thật. Không bỏ dữ kiện trừ khi <instruction> yêu cầu rút gọn.
- Theo <instruction> nếu có (ví dụ "ngắn hơn", "dễ nghe hơn"). Không có thì làm cho dễ đọc thành tiếng và tự nhiên hơn, giữ độ dài gần bản gốc.
- Các bản phải khác nhau thật sự về cách diễn đạt/cấu trúc câu, không chỉ đổi vài từ.
- Giọng theo <tone> nếu có, không thì giữ giọng của bản gốc.
- Viết để nghe: câu ngắn đến vừa (thường dưới ${LONG_SENTENCE_SYLLABLES} tiếng), không ngoặc đơn, không viết tắt, không ký hiệu khó đọc.
- Mỗi bản là văn xuôi, chia đoạn bằng một dòng trống; không tiêu đề, không gạch đầu dòng, không giải thích, không đánh dấu.
- Không chép nguyên văn bản gốc, không lặp nguyên văn bản khác.`;
