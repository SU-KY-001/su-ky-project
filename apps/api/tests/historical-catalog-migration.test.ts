import { describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import {
  assertTestDatabase,
  RUN_INTEGRATION,
  createModerator,
} from "./support/integration";
import { seedHistoricalPeriods } from "@repo/db/historical-seed";
import { NATIONAL_HISTORY_TOPIC, seedTopics } from "@repo/db/topic-seed";

describe.skipIf(!RUN_INTEGRATION)("historical catalog migration", () => {
  it("stores prehistory and rejects ambiguous citation owners", async () => {
    assertTestDatabase();
    const columns = await prisma.$queryRaw<
      Array<{ data_type: string }>
    >`SELECT data_type FROM information_schema.columns WHERE table_name='historical_periods' AND column_name='start_year'`;
    expect(columns[0]?.data_type).toBe("integer");
    const tables = await prisma.$queryRaw<
      Array<{ name: string | null }>
    >`SELECT to_regclass('historical_citations')::text AS name`;
    expect(tables[0]?.name).toBe("historical_citations");
    const token = crypto.randomUUID();
    await createModerator(token);
    const p = await prisma.historicalPeriod.create({
      data: {
        name: token,
        slug: token,
        startYear: -40000,
        endYear: 1,
        updatedAt: new Date(),
      },
    });
    const phase = await prisma.historicalPhase.create({
      data: { name: token, slug: token, periodId: p.id },
    });
    const source = await prisma.source.create({
      data: {
        title: token,
        tier: "TIER_3_KHOA_HOC",
        url: "https://example.org/source",
      },
    });
    const revision = await prisma.sourceRevision.create({
      data: { sourceId: source.id, version: 1, snapshot: { title: token } },
    });
    try {
      await expect(
        Promise.resolve(
          prisma.historicalCitation.create({
            data: {
              sourceId: source.id,
              sourceRevisionId: revision.id,
              locator: "tr. 1",
              createdById: token,
            },
          }),
        ),
      ).rejects.toThrow("historical_citation_one_owner");
      await expect(
        Promise.resolve(
          prisma.historicalCitation.create({
            data: {
              periodId: p.id,
              phaseId: phase.id,
              sourceId: source.id,
              sourceRevisionId: revision.id,
              locator: "tr. 1",
              createdById: token,
            },
          }),
        ),
      ).rejects.toThrow("historical_citation_one_owner");
      expect(
        (
          await prisma.historicalPeriod.findUniqueOrThrow({
            where: { id: p.id },
          })
        ).startYear,
      ).toBe(-40000);
    } finally {
      await prisma.sourceRevision.delete({ where: { id: revision.id } });
      await prisma.source.delete({ where: { id: source.id } });
      await prisma.historicalPhase.delete({ where: { id: phase.id } });
      await prisma.historicalPeriod.delete({ where: { id: p.id } });
      await prisma.user.delete({ where: { id: token } });
    }
  });
  it("does not overwrite edited seed names, time or summary", async () => {
    assertTestDatabase();
    const rollback = new Error("rollback seed edit fixture");
    try {
      await prisma.$transaction(async (tx) => {
        await seedTopics(tx);
        const topic = await tx.topic.findUniqueOrThrow({
          where: { slug: NATIONAL_HISTORY_TOPIC.slug },
        });
        await tx.topic.update({
          where: { id: topic.id },
          data: { name: "Chủ đề đã biên tập" },
        });
        await seedTopics(tx);
        expect(
          (await tx.topic.findUniqueOrThrow({ where: { id: topic.id } })).name,
        ).toBe("Chủ đề đã biên tập");
        await seedHistoricalPeriods(tx);
        const original = await tx.historicalPeriod.findFirstOrThrow({
          where: { slug: "tien-su-so-su" },
        });
        await tx.historicalPeriod.update({
          where: { id: original.id },
          data: {
            name: "Tên đã biên tập",
            summary: "Mô tả riêng",
            time: { kind: "UNKNOWN", note: "Đang đối chiếu tư liệu" },
          },
        });
        await seedHistoricalPeriods(tx);
        const current = await tx.historicalPeriod.findUniqueOrThrow({
          where: { id: original.id },
        });
        expect(current.name).toBe("Tên đã biên tập");
        expect(current.summary).toBe("Mô tả riêng");
        expect(current.time).toEqual({
          kind: "UNKNOWN",
          note: "Đang đối chiếu tư liệu",
        });
        throw rollback;
      });
    } catch (e) {
      if (e !== rollback) throw e;
    }
  });
});
