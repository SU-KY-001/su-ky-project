import type { DbClient } from "./index";

export const NATIONAL_HISTORY_TOPIC = {
  slug: "lich-su-dan-toc",
  name: "Lịch sử dân tộc",
  sortOrder: 1,
} as const;

export async function seedTopics(db: DbClient): Promise<void> {
  const topic = await db.topic.upsert({
    where: { slug: NATIONAL_HISTORY_TOPIC.slug },
    create: NATIONAL_HISTORY_TOPIC,
    // Admins can rename topics; a re-seed only guarantees the topic is active, never reverts their edits.
    update: { isActive: true },
  });
  await db.topic.updateMany({
    where: { slug: { not: NATIONAL_HISTORY_TOPIC.slug } },
    data: { isActive: false },
  });
  await db.series.updateMany({ data: { topicId: topic.id } });
}
