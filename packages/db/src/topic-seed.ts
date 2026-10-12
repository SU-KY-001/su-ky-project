import type { DbClient } from "./index";
export const DEFAULT_TOPICS = [
  { slug: "quan-su", name: "Quân sự & Chiến trận", sortOrder: 1 },
  { slug: "van-hoa", name: "Văn hóa & Tư tưởng", sortOrder: 2 },
  { slug: "nhan-vat", name: "Nhân vật & Giai thoại", sortOrder: 3 },
  { slug: "dung-nuoc", name: "Dựng nước & Nhà nước", sortOrder: 4 },
] as const;
export async function seedTopics(db: DbClient): Promise<void> {
  for (const topic of DEFAULT_TOPICS) {
    if (await db.topic.findUnique({ where: { name: topic.name } })) continue;
    await db.topic.upsert({
      where: { slug: topic.slug },
      create: topic,
      update: {},
    });
  }
}
