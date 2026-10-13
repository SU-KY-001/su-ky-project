import bachDangHero from "../../assets/landing/bach-dang-938-hero.jpg";
import bachDangCard from "../../assets/landing/bach-dang-938-card.jpg";
import dienBienPhuHero from "../../assets/landing/dien-bien-phu-1954-hero.jpg";
import dienBienPhuCard from "../../assets/landing/dien-bien-phu-1954-card.jpg";
import doiMoiHero from "../../assets/landing/doi-moi-1986-hero.jpg";
import doiMoiCard from "../../assets/landing/doi-moi-1986-card.jpg";
import haiBaTrungHero from "../../assets/landing/hai-ba-trung-40-hero.jpg";
import haiBaTrungCard from "../../assets/landing/hai-ba-trung-40-card.jpg";
import type { ContinueListeningItem, PodcastItem, UpcomingPodcast } from "./types";

// Sample fixtures until the podcast catalog API lands. Rankings are derived by sorting, as the API will do.
const covers = [
  { portraitImage: bachDangCard, landscapeImage: bachDangHero, imageAlt: "Trận Bạch Đằng với chiến thuyền đi qua bãi cọc" },
  { portraitImage: haiBaTrungCard, landscapeImage: haiBaTrungHero, imageAlt: "Hai Bà Trưng dẫn nghĩa quân qua vùng đồng bằng" },
  { portraitImage: dienBienPhuCard, landscapeImage: dienBienPhuHero, imageAlt: "Bộ đội kéo pháo qua núi rừng Điện Biên" },
  { portraitImage: doiMoiCard, landscapeImage: doiMoiHero, imageAlt: "Phố Hà Nội cuối thập niên 1980" },
];

const catalog: [title: string, period: string][] = [
  ["Bạch Đằng 938", "Thời kỳ tự chủ"],
  ["Lời thề Mê Linh", "Bắc thuộc"],
  ["Qua lòng chảo Điện Biên", "Hiện đại"],
  ["Cánh cửa vừa mở", "Đương đại"],
  ["Từ Lam Sơn đến Đông Quan", "Phong kiến"],
  ["Âm vang Đông Sơn", "Cổ đại"],
  ["Gió Tây Sơn", "Phong kiến"],
  ["Hịch tướng sĩ", "Nhà Trần"],
  ["Mùa thu Cách mạng", "Cận đại"],
  ["Dấu chân Trường Sơn", "Hiện đại"],
  ["Kinh thành Thăng Long", "Phong kiến"],
  ["Chiếu dời đô", "Nhà Lý"],
  ["Ngọn lửa Nam Kỳ", "Cận đại"],
  ["Tiếng trống Đống Đa", "Tây Sơn"],
  ["Ký ức Hà Nội 1946", "Hiện đại"],
  ["Hào khí Đông A", "Nhà Trần"],
  ["Người giữ Hoàng Sa", "Phong kiến"],
  ["Con đường tơ lụa phương Nam", "Cổ đại"],
  ["Đêm trước Đổi Mới", "Đương đại"],
  ["Sông Hồng ngàn năm", "Cổ đại"],
];

// Deterministic spread so each ranking row comes out in a different order.
export const podcasts: PodcastItem[] = catalog.map(([title, period], index) => ({
  id: `podcast-${index}`,
  title,
  period,
  episodeCount: 4 + (index % 4),
  duration: `${70 + ((index * 17) % 60)} phút`,
  weeklyListens: 900 + ((index * 937) % 4600),
  monthlyListens: 3000 + ((index * 1511) % 15000),
  likes: 200 + ((index * 389) % 1800),
  publishedAt: `2026-${String(10 - (index % 4)).padStart(2, "0")}-${String(28 - ((index * 3) % 27)).padStart(2, "0")}`,
  ...covers[index % covers.length],
}));

export const upcomingPodcasts: UpcomingPodcast[] = podcasts.slice(10, 20).map((item, index) => ({
  ...item,
  id: `${item.id}-soon`,
  releaseDate: `2026-${index < 3 ? "10" : "11"}-${String(14 + ((index * 2) % 14)).padStart(2, "0")}`,
}));

// Sample progress; the real list comes from the user's playback history and is shown to signed-in users only.
export const continueListening: ContinueListeningItem[] = podcasts.slice(0, 6).map((podcast, index) => ({
  podcast,
  episodeTitle: `Tập ${1 + (index % podcast.episodeCount)}`,
  progress: 0.15 + ((index * 0.17) % 0.8),
}));

const ROW_SIZE = 10;
const byDesc = (key: "weeklyListens" | "monthlyListens" | "likes") => (a: PodcastItem, b: PodcastItem) => b[key] - a[key];

export const topWeek = [...podcasts].sort(byDesc("weeklyListens")).slice(0, ROW_SIZE);
export const topMonth = [...podcasts].sort(byDesc("monthlyListens")).slice(0, ROW_SIZE);
export const topLiked = [...podcasts].sort(byDesc("likes")).slice(0, ROW_SIZE);
export const newest = [...podcasts].sort((a, b) => b.publishedAt.localeCompare(a.publishedAt)).slice(0, ROW_SIZE);
