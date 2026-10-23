export type QuizTopic = "Tất cả" | "Lịch sử" | "Nhân vật" | "Văn hóa";

export interface MockQuizOption {
  id: string;
  text: string;
}

export interface MockQuizQuestion {
  id: string;
  text: string;
  options: MockQuizOption[];
  correctOptionId: string;
  explanation: string;
  timeLimit: number;
}

export interface MockQuizSet {
  id: string;
  title: string;
  description: string;
  topic: Exclude<QuizTopic, "Tất cả">;
  seriesTitle: string;
  episodeTitle: string;
  author: string;
  plays: number;
  accent: string;
  questions: MockQuizQuestion[];
}

const question = (
  id: string,
  text: string,
  answers: [string, string, string, string],
  correct: number,
  explanation: string,
  timeLimit = 20,
): MockQuizQuestion => ({
  id,
  text,
  options: answers.map((answer, index) => ({ id: `${id}-${index + 1}`, text: answer })),
  correctOptionId: `${id}-${correct + 1}`,
  explanation,
  timeLimit,
});

export const quizTopics: QuizTopic[] = ["Tất cả", "Lịch sử", "Nhân vật", "Văn hóa"];

export const mockQuizSets: MockQuizSet[] = [
  {
    id: "dien-bien-phu",
    title: "Điện Biên Phủ — 56 ngày đêm",
    description: "Ôn lại những mốc quan trọng, nhân vật và quyết định làm nên chiến thắng Điện Biên Phủ.",
    topic: "Lịch sử",
    seriesTitle: "Điện Biên Phủ 1954",
    episodeTitle: "Tập 4 · Khoảnh khắc quyết định",
    author: "Sử Ký Việt Nam",
    plays: 284,
    accent: "#9f3027",
    questions: [
      question("dbp-1", "Chiến dịch Điện Biên Phủ diễn ra trong bao nhiêu ngày đêm?", ["36 ngày đêm", "46 ngày đêm", "56 ngày đêm", "66 ngày đêm"], 2, "Chiến dịch kéo dài 56 ngày đêm, từ 13/3 đến 7/5/1954."),
      question("dbp-2", "Ai là Tổng Tư lệnh trực tiếp chỉ huy chiến dịch Điện Biên Phủ?", ["Võ Nguyên Giáp", "Nguyễn Chí Thanh", "Văn Tiến Dũng", "Hoàng Văn Thái"], 0, "Đại tướng Võ Nguyên Giáp là Chỉ huy trưởng kiêm Bí thư Đảng ủy chiến dịch."),
      question("dbp-3", "Cứ điểm nào được quân ta tiến công mở màn chiến dịch?", ["A1", "Him Lam", "Độc Lập", "Hồng Cúm"], 1, "Trận Him Lam mở màn lúc 17 giờ 05 phút ngày 13/3/1954."),
      question("dbp-4", "Chiến thắng Điện Biên Phủ tạo điều kiện trực tiếp cho việc ký kết hiệp định nào?", ["Hiệp định Paris", "Hiệp định Sơ bộ", "Hiệp định Genève", "Hiệp định Élysée"], 2, "Chiến thắng tạo ưu thế quyết định cho Việt Nam tại Hội nghị Genève năm 1954."),
    ],
  },
  {
    id: "hai-ba-trung",
    title: "Hai Bà Trưng và lời thề Mê Linh",
    description: "Khám phá cuộc khởi nghĩa đầu tiên do hai nữ anh hùng lãnh đạo trong lịch sử Việt Nam.",
    topic: "Nhân vật",
    seriesTitle: "Nữ tướng Việt Nam",
    episodeTitle: "Tập 1 · Cờ nghĩa Mê Linh",
    author: "Sử Ký Việt Nam",
    plays: 196,
    accent: "#7c3f68",
    questions: [
      question("hbt-1", "Khởi nghĩa Hai Bà Trưng bùng nổ vào năm nào?", ["Năm 40", "Năm 43", "Năm 248", "Năm 542"], 0, "Khởi nghĩa bùng nổ vào mùa xuân năm 40 tại Hát Môn."),
      question("hbt-2", "Trưng Trắc và Trưng Nhị quê ở đâu?", ["Cổ Loa", "Mê Linh", "Luy Lâu", "Hoa Lư"], 1, "Hai Bà là con gái Lạc tướng huyện Mê Linh."),
      question("hbt-3", "Tướng nhà Hán nào cai trị Giao Chỉ khi khởi nghĩa bùng nổ?", ["Mã Viện", "Tô Định", "Sầm Nghi Đống", "Liễu Thăng"], 1, "Thái thú Tô Định cai trị hà khắc và phải bỏ chạy khi nghĩa quân thắng thế."),
    ],
  },
  {
    id: "doi-moi",
    title: "Việt Nam thời kỳ Đổi Mới",
    description: "Kiểm tra kiến thức về những chuyển biến kinh tế — xã hội từ Đại hội VI đến hôm nay.",
    topic: "Lịch sử",
    seriesTitle: "Việt Nam hiện đại",
    episodeTitle: "Tập 3 · Cánh cửa Đổi Mới",
    author: "Sử Ký Việt Nam",
    plays: 341,
    accent: "#296a78",
    questions: [
      question("dm-1", "Đường lối Đổi Mới được chính thức đề ra tại Đại hội Đảng lần thứ mấy?", ["Đại hội IV", "Đại hội V", "Đại hội VI", "Đại hội VII"], 2, "Đại hội VI của Đảng diễn ra tháng 12/1986, mở đầu công cuộc Đổi Mới."),
      question("dm-2", "Trọng tâm ban đầu của công cuộc Đổi Mới là lĩnh vực nào?", ["Kinh tế", "Văn hóa", "Giáo dục", "Đối ngoại"], 0, "Đổi mới kinh tế được xác định là trọng tâm, đồng thời từng bước đổi mới các lĩnh vực khác."),
      question("dm-3", "Việt Nam gia nhập ASEAN vào năm nào?", ["1986", "1991", "1995", "2000"], 2, "Việt Nam chính thức trở thành thành viên thứ bảy của ASEAN ngày 28/7/1995."),
      question("dm-4", "Mô hình kinh tế được xác định trong thời kỳ Đổi Mới là gì?", ["Kinh tế tự cung tự cấp", "Kinh tế thị trường định hướng XHCN", "Kinh tế kế hoạch hóa tuyệt đối", "Kinh tế đóng cửa"], 1, "Việt Nam phát triển nền kinh tế thị trường định hướng xã hội chủ nghĩa."),
      question("dm-5", "Việt Nam trở thành thành viên WTO vào năm nào?", ["1995", "2000", "2007", "2010"], 2, "Việt Nam chính thức gia nhập WTO ngày 11/1/2007."),
    ],
  },
  {
    id: "van-hoa-dong-son",
    title: "Dấu ấn văn hóa Đông Sơn",
    description: "Nhận diện biểu tượng, đời sống và kỹ thuật của cư dân Việt cổ qua những hiện vật tiêu biểu.",
    topic: "Văn hóa",
    seriesTitle: "Văn minh sông Hồng",
    episodeTitle: "Tập 2 · Tiếng vọng trống đồng",
    author: "Sử Ký Việt Nam",
    plays: 128,
    accent: "#8a6427",
    questions: [
      question("ds-1", "Hiện vật tiêu biểu nhất của văn hóa Đông Sơn là gì?", ["Thạp gốm", "Trống đồng", "Tượng đá", "Bia ký"], 1, "Trống đồng là hiện vật tiêu biểu, phản ánh kỹ thuật luyện kim và đời sống tinh thần phát triển."),
      question("ds-2", "Văn hóa Đông Sơn phát triển chủ yếu ở lưu vực con sông nào?", ["Sông Hồng", "Sông Thu Bồn", "Sông Đồng Nai", "Sông Tiền"], 0, "Các di tích Đông Sơn tập trung dày đặc tại lưu vực sông Hồng và sông Mã."),
      question("ds-3", "Họa tiết thường xuất hiện ở trung tâm mặt trống đồng là gì?", ["Hoa sen", "Mặt trời nhiều tia", "Chim phượng", "Rồng"], 1, "Hình ngôi sao hoặc mặt trời nhiều tia thường nằm ở vị trí trung tâm mặt trống."),
    ],
  },
];

