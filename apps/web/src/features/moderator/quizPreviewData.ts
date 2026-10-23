export interface QuizPreview {
  id: string;
  title: string;
  episode: string;
  questions: number;
  status: "draft" | "ready";
  method: "Thủ công" | "AI hỗ trợ" | "Từ PDF";
  updatedAt: string;
}

// Sample records for the quiz dashboard preview; no server data is read or written.
export const quizPreviewData: QuizPreview[] = [
  { id: "quiz-01", title: "Dấu mốc chiến dịch Hồ Chí Minh", episode: "Ngày toàn thắng 30/4/1975", questions: 10, status: "ready", method: "Thủ công", updatedAt: "2026-10-23" },
  { id: "quiz-02", title: "Theo dòng lịch sử Đại Việt", episode: "Hào khí Đông A", questions: 8, status: "draft", method: "AI hỗ trợ", updatedAt: "2026-10-22" },
  { id: "quiz-03", title: "Điện Biên Phủ — Những điều cần nhớ", episode: "56 ngày đêm lịch sử", questions: 12, status: "ready", method: "Từ PDF", updatedAt: "2026-10-21" },
  { id: "quiz-04", title: "Khám phá văn hóa Đông Sơn", episode: "Tiếng vọng trống đồng", questions: 6, status: "draft", method: "Thủ công", updatedAt: "2026-10-20" },
  { id: "quiz-05", title: "Hành trình tìm đường cứu nước", episode: "Từ bến Nhà Rồng", questions: 10, status: "ready", method: "AI hỗ trợ", updatedAt: "2026-10-19" },
  { id: "quiz-06", title: "Cách mạng tháng Tám năm 1945", episode: "Mùa thu độc lập", questions: 8, status: "draft", method: "Từ PDF", updatedAt: "2026-10-18" },
];
