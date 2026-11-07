import type { HistoricalPeriod } from "./types";

export const historicalLibraryFixture: HistoricalPeriod[] = [
  {
    id: "period-prehistory",
    name: "Tiền sử và Sơ sử",
    timeLabel: "Trước thế kỷ III TCN – 179 TCN",
    summary:
      "Thời kỳ đặt nền móng cho văn minh sông Hồng, hình thành cộng đồng và những nhà nước sơ khai đầu tiên.",
    status: "complete",
    stages: [
      {
        id: "stage-prehistory",
        name: "Tiền sử",
        timeLabel: "Thời đồ đá – đồng thau",
        summary:
          "Quá trình phát triển lâu dài của các cộng đồng cư dân cổ và kỹ thuật chế tác công cụ.",
        status: "complete",
        events: [
          {
            id: "event-dong-son",
            name: "Hình thành văn hóa Đông Sơn",
            timeLabel: "Khoảng thế kỷ VII TCN – thế kỷ I",
            summary:
              "Văn hóa Đông Sơn phát triển rực rỡ với kỹ thuật luyện kim và nghệ thuật đúc trống đồng đạt trình độ cao.",
            status: "complete",
            sources: [
              {
                id: "source-dong-son-1",
                title: "Cơ sở khảo cổ học",
                meta: "Viện Khảo cổ học · Nguồn khảo cứu",
              },
              {
                id: "source-dong-son-2",
                title: "Văn hóa Đông Sơn ở Việt Nam",
                meta: "NXB Khoa học Xã hội · 1994",
              },
            ],
            podcastCount: 2,
            updatedAt: "08/10/2026",
          },
          {
            id: "event-van-lang",
            name: "Sự hình thành nhà nước Văn Lang",
            timeLabel: "Khoảng thế kỷ VII TCN",
            summary:
              "Nhà nước sơ khai Văn Lang đánh dấu một bước chuyển quan trọng trong tổ chức xã hội của cư dân Việt cổ.",
            status: "needs_review",
            sources: [
              {
                id: "source-van-lang-1",
                title: "Lịch sử Việt Nam, tập I",
                meta: "NXB Khoa học Xã hội · Nguồn tổng hợp",
              },
            ],
            podcastCount: 0,
            updatedAt: "06/10/2026",
          },
        ],
      },
      {
        id: "stage-au-lac",
        name: "Văn Lang – Âu Lạc",
        timeLabel: "Thế kỷ VII TCN – 179 TCN",
        summary:
          "Giai đoạn hình thành, kế tục và bảo vệ các nhà nước đầu tiên trong lịch sử Việt Nam.",
        status: "missing_source",
        events: [
          {
            id: "event-co-loa",
            name: "An Dương Vương xây thành Cổ Loa",
            timeLabel: "Khoảng thế kỷ III TCN",
            summary:
              "Cổ Loa trở thành trung tâm chính trị và quân sự của nhà nước Âu Lạc, nổi bật với cấu trúc thành lũy nhiều vòng.",
            status: "missing_source",
            sources: [],
            podcastCount: 0,
            updatedAt: "02/10/2026",
          },
        ],
      },
    ],
  },
  {
    id: "period-independent",
    name: "Quân chủ độc lập",
    timeLabel: "938 – 1858",
    summary:
      "Giai đoạn xây dựng quốc gia độc lập, bảo vệ chủ quyền và phát triển nền văn hóa Đại Việt.",
    status: "complete",
    stages: [
      {
        id: "stage-early-independent",
        name: "Buổi đầu độc lập",
        timeLabel: "938 – 1009",
        summary:
          "Từ chiến thắng Bạch Đằng đến quá trình củng cố nhà nước độc lập tự chủ.",
        status: "complete",
        events: [
          {
            id: "event-bach-dang-938",
            name: "Chiến thắng Bạch Đằng",
            timeLabel: "Năm 938",
            summary:
              "Ngô Quyền đánh bại quân Nam Hán trên sông Bạch Đằng, mở ra thời kỳ độc lập lâu dài của dân tộc.",
            status: "complete",
            sources: [
              {
                id: "source-bach-dang-1",
                title: "Đại Việt sử ký toàn thư",
                meta: "Chính sử · Bản dịch Viện Sử học",
              },
              {
                id: "source-bach-dang-2",
                title: "Lịch sử Việt Nam từ nguồn gốc đến thế kỷ XIX",
                meta: "Đào Duy Anh · Khảo cứu",
              },
            ],
            podcastCount: 1,
            updatedAt: "09/10/2026",
          },
        ],
      },
      {
        id: "stage-tran-dynasty",
        name: "Nhà Trần",
        timeLabel: "1225 – 1400",
        summary:
          "Giai đoạn Đại Việt phát triển mạnh và ba lần kháng chiến chống quân Nguyên – Mông.",
        status: "draft",
        events: [
          {
            id: "event-bach-dang-1288",
            name: "Chiến thắng Bạch Đằng năm 1288",
            timeLabel: "09/04/1288",
            summary:
              "Trần Hưng Đạo chỉ huy quân dân Đại Việt đánh bại đạo thủy quân Nguyên trên sông Bạch Đằng.",
            status: "draft",
            sources: [
              {
                id: "source-bach-dang-1288-1",
                title: "Khâm định Việt sử Thông giám cương mục",
                meta: "Chính sử · Quốc sử quán triều Nguyễn",
              },
            ],
            podcastCount: 0,
            updatedAt: "01/10/2026",
          },
        ],
      },
    ],
  },
  {
    id: "period-modern",
    name: "Cận đại và Hiện đại",
    timeLabel: "1858 – nay",
    summary:
      "Những chuyển biến lớn trong hành trình đấu tranh giành độc lập, thống nhất và xây dựng đất nước.",
    status: "needs_review",
    stages: [
      {
        id: "stage-1930-1945",
        name: "Vận động giải phóng dân tộc",
        timeLabel: "1930 – 1945",
        summary:
          "Quá trình chuẩn bị lực lượng và tổng khởi nghĩa giành chính quyền trong cả nước.",
        status: "complete",
        events: [
          {
            id: "event-august-revolution",
            name: "Cách mạng tháng Tám",
            timeLabel: "14/08/1945 – 28/08/1945",
            summary:
              "Cuộc tổng khởi nghĩa giành chính quyền trên phạm vi cả nước, dẫn tới sự ra đời của nước Việt Nam Dân chủ Cộng hòa.",
            status: "complete",
            sources: [
              {
                id: "source-august-1",
                title: "Cách mạng tháng Tám 1945 – Toàn cảnh",
                meta: "NXB Từ điển Bách khoa · 2015",
              },
              {
                id: "source-august-2",
                title: "Hồ Chí Minh Toàn tập, tập 3",
                meta: "NXB Chính trị Quốc gia · Nguồn chính luận",
              },
              {
                id: "source-august-3",
                title: "Việt Nam 1945",
                meta: "David G. Marr · Khảo cứu",
              },
            ],
            podcastCount: 3,
            updatedAt: "10/10/2026",
          },
          {
            id: "event-independence-declaration",
            name: "Tuyên ngôn Độc lập",
            timeLabel: "02/09/1945",
            summary:
              "Chủ tịch Hồ Chí Minh đọc Tuyên ngôn Độc lập tại Quảng trường Ba Đình, khai sinh nước Việt Nam Dân chủ Cộng hòa.",
            status: "complete",
            sources: [
              {
                id: "source-declaration-1",
                title: "Tuyên ngôn Độc lập",
                meta: "Văn kiện gốc · 1945",
              },
            ],
            podcastCount: 1,
            updatedAt: "07/10/2026",
          },
        ],
      },
      {
        id: "stage-1945-1954",
        name: "Kháng chiến chống thực dân Pháp",
        timeLabel: "1945 – 1954",
        summary:
          "Chín năm kháng chiến bảo vệ nền độc lập và kết thúc bằng chiến thắng Điện Biên Phủ.",
        status: "missing_source",
        events: [
          {
            id: "event-dien-bien-phu",
            name: "Chiến thắng Điện Biên Phủ",
            timeLabel: "13/03/1954 – 07/05/1954",
            summary:
              "Chiến dịch quyết chiến chiến lược kết thúc thắng lợi, tạo cơ sở cho việc ký kết Hiệp định Genève về Đông Dương.",
            status: "missing_source",
            sources: [],
            podcastCount: 0,
            updatedAt: "05/10/2026",
          },
        ],
      },
    ],
  },
];
