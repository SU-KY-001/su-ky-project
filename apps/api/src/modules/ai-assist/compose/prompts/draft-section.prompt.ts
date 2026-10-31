import { DRAFT_LENGTH_TOLERANCE_PCT, LONG_SENTENCE_SYLLABLES } from "../constants";
import { COMMON_PREAMBLE } from "./common";

/** spec-prompts-compose.md 4.3. */
export const DRAFT_SECTION_PROMPT = `${COMMON_PREAMBLE}

NHIỆM VỤ
Viết lời kể cho DUY NHẤT phần đánh dấu current="true" trong <outline>, theo <tone> và <angle>. Văn bản sẽ được ĐỌC THÀNH TIẾNG.

QUY TẮC VIẾT
- Chỉ viết phần current. Không viết sang phần khác, không nhắc "ở phần sau", không chào hỏi lại nếu có <before>. Nối mạch tự nhiên với <before> (nếu có).
- Độ dài mục tiêu: targetWords từ (±${DRAFT_LENGTH_TOLERANCE_PCT}%). Đếm theo từ cách nhau bởi khoảng trắng.
- Mọi ý chính (<point>) phải được kể ra, theo thứ tự hợp lý. Không thêm sự kiện lớn ngoài các ý chính, trừ chi tiết nối mạch không mang tính dữ kiện.
- Viết để nghe: câu ngắn đến vừa (thường dưới ${LONG_SENTENCE_SYLLABLES} tiếng), không ngoặc đơn, không chú thích, không chữ viết tắt (viết "thế kỷ mười một" hoặc "thế kỷ XI" theo cách người kể đọc được; tránh "TK", "vv."), không dấu gạch ngang nối khoảng năm ("từ năm 1010 đến năm 1225"), không ký hiệu %, &, /.
- Định dạng: chỉ văn xuôi. Chia đoạn bằng MỘT dòng trống. Không tiêu đề, không gạch đầu dòng, không đánh số, không in đậm, không chỉ dẫn sân khấu như [nhạc nền] (trừ khi chính <point> yêu cầu).
- position=FIRST: mở bằng cách vào chuyện cuốn người nghe, không mở bằng định nghĩa khô hoặc "Hôm nay chúng ta sẽ nói về...". position=LAST: kết lại ý hoặc để lại một câu hỏi; không tóm tắt máy móc, không kêu gọi đăng ký/theo dõi.
- <tone> là giọng cần theo. Ví dụ trong <tone> (nếu có) chỉ minh họa nhịp, tuyệt đối không chép lại.
- Ngôi kể: nếu có <narrator> thì viết ngôi thứ nhất theo nhân vật đó và KHÔNG đặt vào miệng nhân vật câu trích dẫn nguyên văn như thể có thật; đây là diễn giải dựng lại. Không có <narrator> thì ngôi thứ ba.

KHÔNG BỊA
- Số, năm, tên, chức danh, địa danh, con số quân số, trích dẫn nguyên văn: chỉ dùng khi có trong <sources>, <topic>, <episode>, <outline> hoặc bạn biết khá chắc. Không chắc: viết khái quát ("vào đầu thế kỷ XI", "một đoàn thuyền", "hàng nghìn người"), đừng nêu số.
- Không thêm chi tiết dữ kiện rất cụ thể (tên, số, ngày giờ, lời nói) chỉ để cho câu chuyện sống động. Muốn sống động thì dùng hình ảnh, âm thanh, cảm giác không đóng vai dữ kiện (màu trời, tiếng gió, nhịp bước).
- Động cơ, suy nghĩ của nhân vật là DIỄN GIẢI: viết bằng giọng diễn giải ("có lẽ", "dường như", "nhiều người cho rằng"), không kể như sự thật chắc chắn trừ khi <sources> hoặc <point> nói vậy.
- Không đặt dấu nháy kép quanh câu nói mà <sources> không có. Không đổi nó thành lời gián tiếp đứng như sự thật ("ông nói rằng ..."): lời gián tiếp chỉ dùng khi <sources>, <point> hoặc <outline> nói người đó đã nói điều ấy. Muốn có lời nói mà không có nguồn thì bỏ lời nói, hoặc đánh dấu rõ là dựng lại ("có thể hình dung ông nói rằng ...").
- Không ghi nguồn, không [CẦN NGUỒN], không kết luận nào kiểu "theo sử sách ghi lại" nếu <sources> không nói vậy.`;
