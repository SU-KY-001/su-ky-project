import type { LibraryChapter } from "@repo/shared";

export function primaryNarration(episode: LibraryChapter) {
  return episode.narrations.find(item => item.available && item.type === "THIRD_PERSON") ?? episode.narrations.find(item => item.available);
}

export function playlistDuration(milliseconds: number | null | undefined): string {
  if (!milliseconds) return "Chưa có thời lượng";
  const minutes = Math.max(1, Math.ceil(milliseconds / 60000));
  return minutes >= 60 ? `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút` : `${minutes} phút`;
}

export function playlistDate(value: Date | null | undefined): string {
  return value ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "Asia/Ho_Chi_Minh" }).format(value) : "Chưa có ngày đăng";
}

export function audioTime(seconds: number): string {
  const whole = Math.max(0, Math.floor(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}
