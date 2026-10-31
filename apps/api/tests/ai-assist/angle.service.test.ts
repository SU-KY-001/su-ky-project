import { describe, expect, it } from "bun:test";
import type { Angle, CreateAngleInput, UpdateAngleInput } from "@repo/shared";
import { DomainError } from "../../src/core/errors/domain-error";
import { cleanName, cleanText, nameKey } from "../../src/modules/ai-assist/angles/angle-text";
import type { AngleRepository, CreateAngleResult, UpdateAngleResult } from "../../src/modules/ai-assist/angles/angle.repository";
import { AngleService } from "../../src/modules/ai-assist/angles/angle.service";
import { BUILTIN_ANGLES } from "../../src/modules/ai-assist/angles/builtin-angles";

const MAX = 3;
const ME = "user-a";
const OTHER = "user-b";

/** In-memory stand-in with the same observable rules as the Prisma repo (case-insensitive unique name per user, limit). */
class FakeRepo implements AngleRepository {
  readonly rows: Array<Angle & { userId: string }> = [];
  private seq = 0;

  async listByUser(userId: string) {
    return this.rows.filter((r) => r.userId === userId);
  }
  async findOwned(userId: string, id: string) {
    return this.rows.find((r) => r.userId === userId && r.id === id) ?? null;
  }
  async create(userId: string, input: CreateAngleInput, max: number): Promise<CreateAngleResult> {
    const mine = this.rows.filter((r) => r.userId === userId);
    if (mine.length >= max) return { ok: false, reason: "LIMIT" };
    if (mine.some((r) => r.name.toLowerCase() === input.name.toLowerCase())) return { ok: false, reason: "NAME_TAKEN" };
    const row = { id: `00000000-0000-4000-8000-${String(++this.seq).padStart(12, "0")}`, userId, builtin: false, ...input };
    this.rows.push(row);
    return { ok: true, angle: row };
  }
  async update(userId: string, id: string, input: UpdateAngleInput): Promise<UpdateAngleResult> {
    const row = this.rows.find((r) => r.userId === userId && r.id === id);
    if (!row) return { ok: false, reason: "NOT_FOUND" };
    if (input.name && this.rows.some((r) => r !== row && r.userId === userId && r.name.toLowerCase() === input.name!.toLowerCase())) {
      return { ok: false, reason: "NAME_TAKEN" };
    }
    Object.assign(row, input);
    return { ok: true, angle: row };
  }
  async remove(userId: string, id: string) {
    const index = this.rows.findIndex((r) => r.userId === userId && r.id === id);
    if (index < 0) return false;
    this.rows.splice(index, 1);
    return true;
  }
}

const input = (name: string, overrides: Partial<CreateAngleInput> = {}): CreateAngleInput => ({ name, description: "", guide: "", ...overrides });

async function code(promise: Promise<unknown>): Promise<[number, string]> {
  const error = await promise.then(() => null, (e: unknown) => e);
  expect(error).toBeInstanceOf(DomainError);
  return [(error as DomainError).status, (error as DomainError).code];
}

describe("angle text cleaning", () => {
  it("normalizes to NFC, strips control characters, trims", () => {
    expect(cleanText("  e\u0301\u0000\u200B x \u0007 ")).toBe("\u00e9 x");
    expect(cleanText("dòng 1\ndòng 2\t")).toBe("dòng 1\ndòng 2");
  });
  it("collapses whitespace inside a name and compares case-insensitively", () => {
    expect(cleanName("Hai \n  phía")).toBe("Hai phía");
    expect(nameKey("  CHUỖI sự kiện ")).toBe(nameKey("chuỗi  sự kiện"));
  });
});

describe("AngleService", () => {
  const make = () => {
    const repo = new FakeRepo();
    return { repo, service: new AngleService({ repo, maxPerUser: MAX }) };
  };

  it("lists built-ins first, then only the caller's angles", async () => {
    const { service } = make();
    await service.create(ME, input("Của tôi"));
    await service.create(OTHER, input("Của người khác"));
    const list = await service.list(ME);
    expect(list.slice(0, BUILTIN_ANGLES.length).every((a) => a.builtin)).toBe(true);
    expect(list.slice(BUILTIN_ANGLES.length).map((a) => a.name)).toEqual(["Của tôi"]);
  });

  it("cleans fields before saving", async () => {
    const { service } = make();
    const angle = await service.create(ME, input("  Kể\u0000  ngược \n", { guide: "  hướng dẫn\u0007 " }));
    expect(angle.name).toBe("Kể ngược");
    expect(angle.guide).toBe("hướng dẫn");
  });

  it("rejects a name that is empty after cleaning, or a field over its limit after cleaning (422)", async () => {
    const { service } = make();
    expect(await code(service.create(ME, input("\u0000\u200B")))).toEqual([422, "VALIDATION_ERROR"]);
    expect(await code(service.create(ME, input("ok", { guide: "x".repeat(501) })))).toEqual([422, "VALIDATION_ERROR"]);
    await service.create(ME, input("n".repeat(60)));
  });

  it("409 on a duplicate name regardless of case, against the user's own angles and the built-ins", async () => {
    const { service } = make();
    await service.create(ME, input("Kể ngược"));
    expect(await code(service.create(ME, input("KỂ NGƯỢC")))).toEqual([409, "ANGLE_NAME_TAKEN"]);
    expect(await code(service.create(ME, input("nhân vật")))).toEqual([409, "ANGLE_NAME_TAKEN"]);
    expect(await code(service.create(ME, input("NGUYÊN NHÂN – HỆ QUẢ")))).toEqual([409, "ANGLE_NAME_TAKEN"]);
    await service.create(OTHER, input("Kể ngược"));
  });

  it("422 ANGLE_LIMIT at the per-user maximum, counted per user", async () => {
    const { service } = make();
    for (let i = 0; i < MAX; i++) await service.create(ME, input(`góc ${i}`));
    expect(await code(service.create(ME, input("thêm một")))).toEqual([422, "ANGLE_LIMIT"]);
    await service.create(OTHER, input("góc 0"));
  });

  it("update: 409 on rename clash (own or built-in), keeps own name unchanged, 404 for built-in/other user/garbage ids", async () => {
    const { service } = make();
    const a = await service.create(ME, input("A"));
    const b = await service.create(ME, input("B"));
    expect(await code(service.update(ME, b.id, { name: "a" }))).toEqual([409, "ANGLE_NAME_TAKEN"]);
    expect(await code(service.update(ME, b.id, { name: "Đối lập" }))).toEqual([409, "ANGLE_NAME_TAKEN"]);
    expect((await service.update(ME, a.id, { name: "A", guide: "mới" })).guide).toBe("mới");
    expect(await code(service.update(OTHER, a.id, { guide: "x" }))).toEqual([404, "NOT_FOUND"]);
    expect(await code(service.update(ME, BUILTIN_ANGLES[0]!.id, { guide: "x" }))).toEqual([404, "NOT_FOUND"]);
    expect(await code(service.update(ME, "not-a-uuid", { guide: "x" }))).toEqual([404, "NOT_FOUND"]);
  });

  it("remove: owner only, hard delete; frees the name", async () => {
    const { service, repo } = make();
    const a = await service.create(ME, input("A"));
    expect(await code(service.remove(OTHER, a.id))).toEqual([404, "NOT_FOUND"]);
    expect(await code(service.remove(ME, BUILTIN_ANGLES[0]!.id))).toEqual([404, "NOT_FOUND"]);
    await service.remove(ME, a.id);
    expect(repo.rows).toHaveLength(0);
    await service.create(ME, input("A"));
  });

  it("resolveAngle loads built-ins and own angles only", async () => {
    const { service } = make();
    const mine = await service.create(ME, input("Mine", { guide: "g" }));
    expect(await service.resolveAngle(OTHER, BUILTIN_ANGLES[1]!.id)).toMatchObject({ name: "Nhân vật" });
    expect(await service.resolveAngle(ME, mine.id)).toMatchObject({ name: "Mine", guide: "g" });
    expect(await service.resolveAngle(OTHER, mine.id)).toBeNull();
    expect(await service.resolveAngle(ME, "builtin:missing")).toBeNull();
    expect(await service.resolveAngle(ME, "junk")).toBeNull();
  });
});
