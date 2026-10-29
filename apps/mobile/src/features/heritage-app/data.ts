import bachDangCard from "../../assets/history/bach-dang-card.jpg";
import bachDangHero from "../../assets/history/bach-dang-hero.jpg";
import dienBienPhuCard from "../../assets/history/dien-bien-phu-card.jpg";
import dienBienPhuHero from "../../assets/history/dien-bien-phu-hero.jpg";
import doiMoiCard from "../../assets/history/doi-moi-card.jpg";
import doiMoiHero from "../../assets/history/doi-moi-hero.jpg";
import haiBaTrungCard from "../../assets/history/hai-ba-trung-card.jpg";
import haiBaTrungHero from "../../assets/history/hai-ba-trung-hero.jpg";
import type { HistoricalItem, PodcastItem, QuizQuestion } from "./types";

export const art = { bachDangCard, bachDangHero, dienBienPhuCard, dienBienPhuHero, doiMoiCard, doiMoiHero, haiBaTrungCard, haiBaTrungHero };

export const historicalItems: HistoricalItem[] = [
  { id: "hai-ba-trung", year: "40", title: "Khởi nghĩa Hai Bà Trưng", description: "Hai Bà Trưng dựng cờ khởi nghĩa, giành lại độc lập và đặt dấu ấn rực rỡ.", era: "Cổ đại", image: haiBaTrungCard },
  { id: "bach-dang", year: "938", title: "Chiến thắng Bạch Đằng", description: "Ngô Quyền đánh tan quân Nam Hán, chấm dứt hơn một nghìn năm Bắc thuộc.", era: "Trung đại", image: bachDangHero },
  { id: "nha-ly", year: "1075", title: "Nhà Lý và Nam quốc sơn hà", description: "Một thời kỳ xây dựng quốc gia hùng cường, mở rộng văn hóa Đại Việt.", era: "Trung đại", image: doiMoiCard },
  { id: "dien-bien-phu", year: "1954", title: "Chiến thắng Điện Biên Phủ", description: "Năm mươi sáu ngày đêm làm nên chiến thắng lừng lẫy năm châu.", era: "Hiện đại", image: dienBienPhuCard },
];

export const podcasts: PodcastItem[] = [
  { id: "bach-dang-1", title: "Dòng sông thức giấc", subtitle: "Hào khí Bạch Đằng · Tập 1", duration: "28:16", image: bachDangCard },
  { id: "bach-dang-2", title: "Thế trận trên sông", subtitle: "Hào khí Bạch Đằng · Tập 2", duration: "32:05", image: bachDangHero },
  { id: "dien-bien", title: "56 ngày đêm lịch sử", subtitle: "Điện Biên Phủ 1954", duration: "25:44", image: dienBienPhuCard },
  { id: "doi-moi", title: "Cánh cửa Đổi Mới", subtitle: "Việt Nam hiện đại", duration: "21:18", image: doiMoiCard },
];

export const quizQuestions: QuizQuestion[] = [
  { id: "q1", prompt: "Chiến thắng Bạch Đằng năm 938 gắn với vị tướng nào?", options: [{ id: "a", label: "Ngô Quyền" }, { id: "b", label: "Đinh Bộ Lĩnh" }, { id: "c", label: "Lê Hoàn" }, { id: "d", label: "Lý Thường Kiệt" }], correctId: "a" },
  { id: "q2", prompt: "Quân ta đã tận dụng hiện tượng tự nhiên nào trên sông Bạch Đằng?", options: [{ id: "a", label: "Gió mùa" }, { id: "b", label: "Thủy triều" }, { id: "c", label: "Lũ quét" }, { id: "d", label: "Sương mù" }], correctId: "b" },
  { id: "q3", prompt: "Chiến thắng năm 938 đã mở ra thời kỳ nào?", options: [{ id: "a", label: "Thời kỳ tự chủ lâu dài" }, { id: "b", label: "Thời kỳ thuộc Minh" }, { id: "c", label: "Thời kỳ Pháp thuộc" }, { id: "d", label: "Thời kỳ chia cắt" }], correctId: "a" },
  { id: "q4", prompt: "Tướng chỉ huy quân Nam Hán trong trận Bạch Đằng năm 938 là ai?", options: [{ id: "a", label: "Hoằng Tháo" }, { id: "b", label: "Lưu Cung" }, { id: "c", label: "Tô Định" }, { id: "d", label: "Mã Viện" }], correctId: "a" },
  { id: "q5", prompt: "Ngô Quyền cho bố trí vật gì dưới lòng sông Bạch Đằng?", options: [{ id: "a", label: "Xích sắt" }, { id: "b", label: "Cọc gỗ đầu bịt sắt" }, { id: "c", label: "Thuyền lửa" }, { id: "d", label: "Đá tảng" }], correctId: "b" },
  { id: "q6", prompt: "Đạo quân xâm lược bị đánh bại trên sông Bạch Đằng năm 938 thuộc nước nào?", options: [{ id: "a", label: "Nhà Tống" }, { id: "b", label: "Nam Hán" }, { id: "c", label: "Nhà Minh" }, { id: "d", label: "Nguyên – Mông" }], correctId: "b" },
  { id: "q7", prompt: "Quân ta nhử đoàn thuyền địch vào bãi cọc khi nào?", options: [{ id: "a", label: "Khi nước triều đang dâng" }, { id: "b", label: "Khi nước đã rút cạn" }, { id: "c", label: "Giữa đêm tối" }, { id: "d", label: "Trong mùa lũ" }], correctId: "a" },
  { id: "q8", prompt: "Khi thủy triều rút, đoàn thuyền Nam Hán gặp tình thế nào?", options: [{ id: "a", label: "Thoát ra biển an toàn" }, { id: "b", label: "Mắc cạn và va vào bãi cọc" }, { id: "c", label: "Được viện binh cứu" }, { id: "d", label: "Rút về theo đường bộ" }], correctId: "b" },
  { id: "q9", prompt: "Sau chiến thắng Bạch Đằng, Ngô Quyền làm gì?", options: [{ id: "a", label: "Xưng vương" }, { id: "b", label: "Dời đô vào Huế" }, { id: "c", label: "Nhường ngôi" }, { id: "d", label: "Sang Nam Hán cầu hòa" }], correctId: "a" },
  { id: "q10", prompt: "Ngô Quyền chọn nơi nào làm kinh đô sau khi xưng vương?", options: [{ id: "a", label: "Hoa Lư" }, { id: "b", label: "Thăng Long" }, { id: "c", label: "Cổ Loa" }, { id: "d", label: "Phú Xuân" }], correctId: "c" },
];

export const quizExplanations: Record<string, string> = {
  q1: "Ngô Quyền là người chỉ huy trận Bạch Đằng năm 938, đánh tan quân Nam Hán.",
  q2: "Ngô Quyền tính toán quy luật lên xuống của thủy triều để nhử địch vào trận địa cọc.",
  q3: "Chiến thắng 938 chấm dứt hơn một nghìn năm Bắc thuộc, mở ra thời kỳ tự chủ lâu dài.",
  q4: "Hoằng Tháo là tướng chỉ huy thủy quân Nam Hán bị đánh bại trên sông Bạch Đằng.",
  q5: "Quân ta cắm cọc gỗ đầu bịt sắt nhọn dưới lòng sông, ẩn khi triều lên.",
  q6: "Đạo quân bị đánh bại năm 938 là quân Nam Hán.",
  q7: "Quân ta nhử thuyền địch vào bãi cọc lúc nước triều đang dâng cao.",
  q8: "Khi triều rút, thuyền địch mắc cạn và va vào bãi cọc, bị tiêu diệt.",
  q9: "Sau chiến thắng, Ngô Quyền xưng vương, đặt nền móng cho quốc gia độc lập.",
  q10: "Ngô Quyền đóng đô ở Cổ Loa, kinh đô cũ của An Dương Vương.",
};
