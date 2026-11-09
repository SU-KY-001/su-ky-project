import { describe, expect, test } from "bun:test";
import { Prisma } from "@repo/db";
import { ProfileService } from "../src/modules/auth/profile.service";
import { auth } from "../src/modules/auth/auth";

type Database = NonNullable<ConstructorParameters<typeof ProfileService>[0]>;
async function setup(options: { role?: string; admins?: number; restrict?: boolean; media?: number } = {}) {
  const context = await auth.$context;
  const password = await context.password.hash("correct-password");
  const calls: string[] = [];
  const cleanedImages: Array<string | null | undefined> = [];
  let transactionTail = Promise.resolve();
  let uploadSequence = 0;
  const user = { id: "self", role: options.role ?? "user", name: "Name", email: "a@example.com", image: "https://res.cloudinary.com/test/old.png", emailVerified: true };
  const tx = {
    user: {
      findUniqueOrThrow: async () => ({ ...user }),
      update: async ({ data }: { data: object }) => { calls.push("update:self"); Object.assign(user, data); return { ...user }; },
      count: async () => options.admins ?? 2,
      delete: async ({ where }: { where: { id: string } }) => {
        calls.push(`delete:${where.id}`);
        if (options.restrict) throw new Prisma.PrismaClientKnownRequestError("restricted", { code: "P2003", clientVersion: "test" });
        return user;
      },
    },
    mediaAsset: { count: async () => options.media ?? 0 },
    $queryRaw: async () => [],
  };
  const db = {
    account: { findFirst: async () => ({ password }) },
    user: { findUnique: async () => user, update: async ({ where, data }: { where: { id: string }; data: object }) => { calls.push(`update:${where.id}`); return { ...user, ...data }; } },
    $transaction: async <T>(fn: (transaction: typeof tx) => Promise<T>, config: { isolationLevel: string }) => {
      expect(["Serializable", "ReadCommitted"]).toContain(config.isolationLevel);
      const previous = transactionTail;
      let unlock = (): void => {};
      transactionTail = new Promise<void>((resolve) => { unlock = resolve; });
      await previous;
      calls.push("transaction");
      try { return await fn(tx); } finally { unlock(); }
    },
  } as unknown as Database;
  const storage = {
    uploadAvatar: async () => { calls.push("upload"); return `https://res.cloudinary.com/test/avatar-${++uploadSequence}.png`; },
    deleteAvatar: async (id: string, image?: string | null) => { calls.push(`cleanup:${id}`); cleanedImages.push(image); },
  };
  return { service: new ProfileService(db, storage), calls, cleanedImages };
}
describe("profile service safety", () => {
  test("wrong password never starts deletion or provider cleanup", async () => {
    const { service, calls } = await setup();
    await expect(service.delete("self", { password: "wrong", confirm: true })).rejects.toMatchObject({ status: 400 });
    expect(calls).toEqual([]);
  });
  test("last admin cannot delete self", async () => {
    const { service, calls } = await setup({ role: "admin", admins: 1 });
    await expect(service.delete("self", { password: "correct-password", confirm: true })).rejects.toMatchObject({ status: 409 });
    expect(calls).toEqual(["transaction"]);
  });
  test("FK restriction returns conflict and skips provider cleanup", async () => {
    const { service, calls } = await setup({ restrict: true });
    await expect(service.delete("self", { password: "correct-password", confirm: true })).rejects.toMatchObject({ status: 409 });
    expect(calls).not.toContain("cleanup:self");
  });
  test("verified deletion is owner scoped and cleans avatar after transaction", async () => {
    const { service, calls } = await setup();
    expect(await service.delete("self", { password: "correct-password", confirm: true })).toEqual({ success: true });
    expect(calls).toEqual(["transaction", "delete:self", "cleanup:self"]);
  });
  test("uploaded library media blocks deletion even when unreferenced", async () => {
    const { service, calls } = await setup({ media: 1 });
    await expect(service.delete("self", { password: "correct-password", confirm: true })).rejects.toMatchObject({ status: 409 });
    expect(calls).toEqual(["transaction"]);
  });
  test("invalid avatar never reaches provider or database", async () => {
    const { service, calls } = await setup();
    await expect(service.uploadAvatar("self", new File(["<svg/>"], "avatar.png", { type: "image/png" }))).rejects.toMatchObject({ status: 422 });
    expect(calls).toEqual([]);
  });
  test("valid avatar updates only authenticated profile", async () => {
    const { service, calls } = await setup();
    const result = await service.uploadAvatar("self", new File([new Uint8Array([255, 216, 255])], "a.jpg", { type: "image/jpeg" }));
    expect(result.image).toBe("https://res.cloudinary.com/test/avatar-1.png");
    expect(calls).toEqual(["upload", "transaction", "update:self", "cleanup:self"]);
  });
  test("removing avatar clears profile then cleans previous image", async () => {
    const { service, calls } = await setup();
    expect((await service.update("self", { image: null })).image).toBeNull();
    expect(calls).toEqual(["transaction", "update:self", "cleanup:self"]);
  });
  test("interleaved uploads and removal clean every displaced image", async () => {
    const { service, cleanedImages } = await setup();
    const file = new File([new Uint8Array([255,216,255])], "a.jpg", { type: "image/jpeg" });
    await Promise.all([service.uploadAvatar("self", file), service.uploadAvatar("self", file)]);
    await service.update("self", { image: null });
    expect(cleanedImages.sort()).toEqual([
      "https://res.cloudinary.com/test/old.png",
      "https://res.cloudinary.com/test/avatar-1.png",
      "https://res.cloudinary.com/test/avatar-2.png",
    ].sort());
  });
});
