import { PublicHonorsSchema, PublicReleasesSchema } from "@repo/shared";
import { showcaseRepository } from "./showcase.repository";

export async function publicHonors(period: "week" | "month") {
  // Calendar boundaries follow the application's Vietnam timezone, independently of server TZ.
  const offset = 7 * 60 * 60 * 1000;
  const local = new Date(Date.now() + offset);
  local.setUTCHours(0, 0, 0, 0);
  if (period === "month") local.setUTCDate(1);
  else local.setUTCDate(local.getUTCDate() - (local.getUTCDay() + 6) % 7);
  const from = new Date(local.getTime() - offset);
  if (period === "month") local.setUTCMonth(local.getUTCMonth() + 1);
  else local.setUTCDate(local.getUTCDate() + 7);
  const to = new Date(local.getTime() - offset);
  const awards = await showcaseRepository.honors(from, to);
  const users = await showcaseRepository.users(awards.map((row) => row.userId));
  const items = awards.flatMap((row) => {
    const user = users.find((value) => value.id === row.userId);
    const xp = row._sum.xpAmount ?? 0;
    return user && xp > 0 ? [{ name: user.name, image: user.image, xp }] : [];
  }).map((row, index) => ({ ...row, rank: index + 1 }));
  return PublicHonorsSchema.parse({ period, from, to, items });
}

export async function publicReleases(from: Date, to: Date, seriesId?: string) {
  const rows = await showcaseRepository.releases(from, to, seriesId);
  return PublicReleasesSchema.parse({ items: rows.flatMap((row) => row.episode ? [{ id: row.id, title: row.episode.title, scheduledAt: row.scheduledAt, released: row.status === "RELEASED", episodeSlug: row.episode.slug, series: row.episode.series }] : []) });
}
