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
  // Only adopt series that have no topic yet; never move series an admin already assigned.
  await db.series.updateMany({
    where: { topicId: null },
    data: { topicId: topic.id },
  });
}
