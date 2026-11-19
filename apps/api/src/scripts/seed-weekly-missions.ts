import { MissionTemplateInputSchema } from "@repo/shared";
import { prisma } from "@repo/db";
import type { z } from "zod";

type MissionTemplateInput = z.input<typeof MissionTemplateInputSchema>;

const DEFAULT_ADMIN_EMAIL = "admin@suky.vn";

// Episode XP does not renew: the API counts an episode only on a user's first completion,
// so COMPLETE_EPISODE templates are bounded by the catalogue. Quiz templates renew weekly.
const MISSION_TEMPLATES: readonly MissionTemplateInput[] = [
  {
    title: "Khởi động tuần mới",
    description: "Nghe trọn vẹn 1 tập bất kỳ để bắt đầu tuần.",
    activityType: "COMPLETE_EPISODE",
    targetCount: 1,
    xpReward: 20,
  },
  {
    title: "Người nghe chăm chỉ",
    description: "Nghe xong 3 tập khác nhau trong tuần.",
    activityType: "COMPLETE_EPISODE",
    targetCount: 3,
    xpReward: 60,
  },
  {
    title: "Thử sức kiến thức",
    description: "Vượt qua 1 bài quiz sau khi nghe.",
    activityType: "PASS_QUIZ",
    targetCount: 1,
    xpReward: 40,
  },
  {
    title: "Học giả của tuần",
    description: "Vượt qua 3 bài quiz khác nhau trong tuần.",
    activityType: "PASS_QUIZ",
    targetCount: 3,
    xpReward: 120,
  },
];

async function main(): Promise<void> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim() || DEFAULT_ADMIN_EMAIL;
  const admin = await prisma.user.findUnique({
    where: { email: adminEmail },
    select: { id: true },
  });
  if (!admin) console.warn(`Không thấy admin ${adminEmail}; createdById sẽ để trống.`);

  let created = 0;
  for (const raw of MISSION_TEMPLATES) {
    const template = MissionTemplateInputSchema.parse(raw);
    // No unique key on templates: match by title so a re-run never duplicates, and never
    // overwrites edits an admin made in the web panel.
    const existing = await prisma.missionTemplate.findFirst({
      where: { title: template.title },
      select: { id: true },
    });
    if (existing) {
      console.log(`Bỏ qua (đã có): ${template.title}`);
      continue;
    }
    await prisma.missionTemplate.create({
      data: { ...template, createdById: admin?.id ?? null },
    });
    created += 1;
    console.log(`Đã tạo: ${template.title}`);
  }
  console.log(`Xong: ${created}/${MISSION_TEMPLATES.length} mẫu mới. Kích hoạt từng tuần ở web admin.`);
}

main()
  .catch((error: unknown) => {
    console.error("Seed mẫu nhiệm vụ thất bại", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
