export type PublishedEpisodeRow = {
  id: string;
  series: string;
  episode: string;
  episodeNumber: number;
  publishedAt: string;
  duration: string;
};

export const publishedEpisodeRows: PublishedEpisodeRow[] = [
  { id: "bd-01", series: "Bạch Đằng 938", episode: "Trận thủy chiến mở đầu độc lập", episodeNumber: 1, publishedAt: "2026-09-18", duration: "24:18" },
  { id: "bd-02", series: "Bạch Đằng 938", episode: "Dòng sông và thế trận cọc", episodeNumber: 2, publishedAt: "2026-09-25", duration: "27:42" },
  { id: "bd-03", series: "Bạch Đằng 938", episode: "Ngô Quyền và lựa chọn quyết định", episodeNumber: 3, publishedAt: "2026-10-02", duration: "22:56" },
  { id: "ml-01", series: "Lời thề Mê Linh", episode: "Hai chị em đất Mê Linh", episodeNumber: 1, publishedAt: "2026-09-12", duration: "21:05" },
  { id: "ml-02", series: "Lời thề Mê Linh", episode: "Cuộc khởi nghĩa mùa xuân năm 40", episodeNumber: 2, publishedAt: "2026-09-19", duration: "25:31" },
  { id: "ml-03", series: "Lời thề Mê Linh", episode: "Một triều đại trong ba năm", episodeNumber: 3, publishedAt: "2026-09-26", duration: "23:47" },
  { id: "db-01", series: "Điện Biên Phủ 1954", episode: "Điểm hẹn giữa núi rừng Tây Bắc", episodeNumber: 1, publishedAt: "2026-08-29", duration: "28:10" },
  { id: "db-02", series: "Điện Biên Phủ 1954", episode: "Từ đánh nhanh đến đánh chắc", episodeNumber: 2, publishedAt: "2026-09-05", duration: "30:02" },
  { id: "db-03", series: "Điện Biên Phủ 1954", episode: "56 ngày đêm và thời khắc chiến thắng", episodeNumber: 3, publishedAt: "2026-09-12", duration: "26:34" },
];
