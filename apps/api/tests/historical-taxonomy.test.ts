import { beforeAll, afterAll, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { HistoricalCatalogService } from "../src/modules/catalog/application/historical-catalog.service";
import { PrismaHistoricalCatalogRepository } from "../src/modules/catalog/infrastructure/prisma-historical-catalog.repository";
import {
  assertTestDatabase,
  createModerator,
  RUN_INTEGRATION,
} from "./support/integration";
const owner = { userId: crypto.randomUUID(), role: "moderator" };
const other = { userId: crypto.randomUUID(), role: "moderator" };
const service = new HistoricalCatalogService(
  new PrismaHistoricalCatalogRepository(),
);
const time = {
  kind: "RANGE" as const,
  start: { year: -40000, precision: "YEAR" as const, approximate: true },
  end: { year: -179, precision: "YEAR" as const, approximate: false },
  endState: "KNOWN" as const,
};
describe.skipIf(!RUN_INTEGRATION)("historical taxonomy CRUD", () => {
  beforeAll(async () => {
    assertTestDatabase();
    await createModerator(owner.userId);
    await createModerator(other.userId);
  });
  afterAll(async () => {
    await prisma.historicalPhase.deleteMany({
      where: { createdById: owner.userId },
    });
    await prisma.historicalPeriod.deleteMany({
      where: { createdById: owner.userId },
    });
    await prisma.auditLog.deleteMany({
      where: { actorId: { in: [owner.userId, other.userId] } },
    });
    await prisma.user.deleteMany({
      where: { id: { in: [owner.userId, other.userId] } },
    });
  });
  it("allows custom periods, ownership, dependency guards and CAS", async () => {
    const p = await service.createNode(owner, "period", {
      name: "Phân kỳ riêng " + owner.userId,
      summary: "Phạm vi riêng",
      time,
      isActive: true,
      sortOrder: 0,
    });
    expect(p.startYear).toBe(-40000);
    await expect(
      service.createNode(owner, "period", { name: p.name, time }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    const distinct = await service.createNode(owner, "period", {
      name: "Tên đã có " + owner.userId,
      time,
    });
    await expect(
      service.patchNode(owner, "period", p.id, {
        name: distinct.name,
        baseVersion: 1,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(
      service.patchNode(other, "period", p.id, {
        name: "Không được sửa",
        baseVersion: 1,
      }),
    ).rejects.toMatchObject({ status: 404 });
    const ph = await service.createNode(owner, "phase", {
      name: "Giai đoạn riêng",
      periodId: p.id,
      summary: "",
      time,
      isActive: true,
      sortOrder: 0,
    });
    await expect(
      service.deleteNode(owner, "period", p.id, 1),
    ).rejects.toMatchObject({ code: "HAS_DEPENDENCIES" });
    const writes = await Promise.allSettled([
      service.patchNode(owner, "phase", ph.id, {
        summary: "A",
        baseVersion: 1,
      }),
      service.patchNode(owner, "phase", ph.id, {
        summary: "B",
        baseVersion: 1,
      }),
    ]);
    expect(writes.filter((x) => x.status === "fulfilled")).toHaveLength(1);
    expect((await service.getNode("phase", ph.id)).version).toBe(2);
    await service.deleteNode(owner, "phase", ph.id, 2);
    await service.deleteNode(owner, "period", p.id, 1);
    await expect(
      service.restoreNode(owner, "phase", ph.id, 3),
    ).rejects.toMatchObject({ code: "PARENT_IN_TRASH" });
    await service.restoreNode(owner, "period", p.id, 2);
    await service.restoreNode(owner, "phase", ph.id, 3);
    await expect(
      service.createNode(owner, "phase", {
        name: "Không có cha",
        periodId: crypto.randomUUID(),
        time,
      }),
    ).rejects.toMatchObject({ status: 422 });
  });
});
