import type { ModeratorOverviewData } from "./types";

const months = ["Tháng 5", "Tháng 6", "Tháng 7", "Tháng 8", "Tháng 9", "Tháng 10"];

export const moderatorOverviewMock: ModeratorOverviewData = {
  greeting: "Chào mừng trở lại",
  metrics: [
    { id: "series", label: "Tổng series", value: 18, detail: "Trong thư viện", icon: "series" },
    { id: "episodes", label: "Tập podcast", value: 72, detail: "Trong thư viện", icon: "episode" },
    { id: "milestones", label: "Mốc lịch sử", value: 36, detail: "Trên dòng thời gian", icon: "milestone" },
    { id: "references", label: "Nguồn tham khảo", value: 128, detail: "Đã biên mục", icon: "reference" },
  ],
  charts: [
    {
      id: "new-content",
      title: "Nội dung mới",
      summary: "Số series, tập podcast và nguồn tham khảo được thêm theo tháng.",
      unit: "mục",
      months,
      series: [
        { id: "series", label: "Series", tone: "sky", values: [1, 1, 2, 1, 2, 1] },
        { id: "episodes", label: "Tập podcast", tone: "violet", values: [4, 7, 6, 5, 8, 9] },
        { id: "references", label: "Nguồn tham khảo", tone: "emerald", values: [7, 10, 12, 9, 13, 15] },
      ],
    },
    {
      id: "podcast-plays",
      title: "Lượt nghe podcast",
      summary: "Lượt nghe minh họa trong sáu tháng gần nhất.",
      unit: "lượt nghe",
      months,
      series: [{ id: "plays", label: "Lượt nghe", tone: "sky", values: [3240, 3880, 4250, 5060, 5680, 6420] }],
    },
    {
      id: "website-visits",
      title: "Lượt truy cập website",
      summary: "Lượt truy cập minh họa trong sáu tháng gần nhất.",
      unit: "lượt truy cập",
      months,
      series: [{ id: "visits", label: "Lượt truy cập", tone: "emerald", values: [4920, 5680, 6010, 6870, 7540, 8290] }],
    },
  ],
  integrations: [
    { id: "google-analytics", name: "Google Analytics", status: "unconfigured", detail: "Chưa thiết lập kết nối" },
    { id: "search-console", name: "Google Search Console", status: "unconfigured", detail: "Chưa thiết lập kết nối" },
  ],
  quickActions: [
    { id: "create-series", title: "Tạo series", description: "Mở đầu một chương sử mới", icon: "series" },
    { id: "create-episode", title: "Thêm tập podcast", description: "Bổ sung một câu chuyện âm thanh", icon: "episode" },
    { id: "add-milestone", title: "Thêm mốc lịch sử", description: "Cập nhật dòng thời gian", icon: "milestone" },
    { id: "add-reference", title: "Thêm nguồn tư liệu", description: "Ghi lại tài liệu tham khảo", icon: "reference" },
  ],
};

export const moderatorMockDataLabel = "Dữ liệu minh họa";
