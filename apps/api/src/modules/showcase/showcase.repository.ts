import { prisma } from "@repo/db";

export const showcaseRepository = {
  releases: (from: Date, to: Date, seriesId?: string) => prisma.releaseSchedule.findMany({
    where: {
      scheduledAt: { gte: from, lt: to },
      OR: [{ status: "READY_TO_PUBLISH" }, { status: "RELEASED", episode: { status: "PUBLISHED" } }],
      episode: { deletedAt: null, series: { status: "PUBLISHED", deletedAt: null }, ...(seriesId ? { seriesId } : {}) },
    },
    select: { id: true, scheduledAt: true, status: true, episode: { select: { title: true, slug: true, series: { select: { id: true, title: true, slug: true } } } } },
    orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
  }),
  honors: (from: Date, to: Date) => prisma.xpAward.groupBy({
    by: ["userId"], where: { createdAt: { gte: from, lt: to }, user: { role: "user", banned: false } },
    _sum: { xpAmount: true }, orderBy: [{ _sum: { xpAmount: "desc" } }, { userId: "asc" }], take: 10,
  }),
  users: (ids: string[]) => prisma.user.findMany({ where: { id: { in: ids }, banned: false, role: "user" }, select: { id: true, name: true, image: true } }),
};
