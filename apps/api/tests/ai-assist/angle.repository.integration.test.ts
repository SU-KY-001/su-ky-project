import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { PrismaAngleRepository } from "../../src/modules/ai-assist/angles/angle.repository";
import { AngleService } from "../../src/modules/ai-assist/angles/angle.service";
import { assertTestDatabase, RUN_INTEGRATION, uniqueSuffix } from "../support/integration";

const MAX = 3;

describe.skipIf(!RUN_INTEGRATION)("angle repository (database)", () => {
  const runId = uniqueSuffix();
  const me = `it-angle-${runId}`;
  const other = `it-angle-other-${runId}`;
  const service = new AngleService({ repo: new PrismaAngleRepository(), maxPerUser: MAX });
  const body = (name: string) => ({ name, description: "", guide: "" });

  beforeAll(() => assertTestDatabase());
  afterAll(async () => {
    await prisma.aiNarrativeAngle.deleteMany({ where: { userId: { in: [me, other] } } });
  });

  it("the expression unique index makes names case-insensitive per user, and enforces the limit", async () => {
    await service.create(me, body("Kể ngược"));
    await expect(service.create(me, body("KỂ NGƯỢC"))).rejects.toMatchObject({ status: 409, code: "ANGLE_NAME_TAKEN" });
    await service.create(other, body("Kể ngược"));
    await service.create(me, body("B"));
    await service.create(me, body("C"));
    await expect(service.create(me, body("D"))).rejects.toMatchObject({ status: 422, code: "ANGLE_LIMIT" });
  });

  it("concurrent creates cannot pass the limit", async () => {
    const results = await Promise.allSettled([1, 2, 3, 4, 5].map((i) => service.create(other, body(`race ${i}`))));
    expect(await prisma.aiNarrativeAngle.count({ where: { userId: other } })).toBeLessThanOrEqual(MAX);
    expect(results.some((r) => r.status === "rejected")).toBe(true);
  });

  it("update and delete are scoped to the owner", async () => {
    const [mine] = (await service.list(me)).filter((a) => !a.builtin);
    await expect(service.update(other, mine!.id, { guide: "x" })).rejects.toMatchObject({ status: 404 });
    await expect(service.remove(other, mine!.id)).rejects.toMatchObject({ status: 404 });
    expect((await service.update(me, mine!.id, { guide: "ok" })).guide).toBe("ok");
    await service.remove(me, mine!.id);
  });
});
