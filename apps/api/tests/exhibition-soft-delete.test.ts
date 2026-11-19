import { expect, test, spyOn } from "bun:test";
import { prisma } from "@repo/db";
import { PrismaExhibitionRepository } from "../src/modules/exhibition/infrastructure/prisma-exhibition.repository";

test("soft deletion updates the tombstone and preserves the draft data", async () => {
  const records = { ...prisma.exhibition };
  const update = spyOn(records, "updateMany").mockResolvedValue({ count: 1 });
  const remove = spyOn(records, "deleteMany");
  try {
    const repository = new PrismaExhibitionRepository({ deliveryUrl: () => "https://example.com/asset" }, records);
    expect(await repository.deleteDraft("draft", "owner", 3)).toBe(true);
    expect(update).toHaveBeenCalledWith({ where: { id: "draft", ownerId: "owner", deletedAt: null, draftRevision: 3, publishedRevision: null, publishedAt: null }, data: { deletedAt: expect.any(Date), draftRevision: { increment: 1 } } });
    expect(remove).not.toHaveBeenCalled();
  } finally { update.mockRestore(); remove.mockRestore(); }
});

test("deleted exhibitions are excluded from lists and direct workspace access", async () => {
  const records = { ...prisma.exhibition };
  const list = spyOn(records, "findMany").mockResolvedValue([]);
  const count = spyOn(records, "count").mockResolvedValue(0);
  const find = spyOn(records, "findFirst").mockResolvedValue(null);
  try {
    const repository = new PrismaExhibitionRepository({ deliveryUrl: () => "https://example.com/asset" }, records);
    expect(await repository.list("owner", { q: "", status: "all", page: 1, limit: 10 })).toMatchObject({ items: [], total: 0 });
    expect(list).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ deletedAt: null, ownerId: "owner" }) }));
    expect(count).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ deletedAt: null }) }));
    expect(await repository.find("draft", "owner")).toBeNull();
    expect(find).toHaveBeenCalledWith({ where: { id: "draft", ownerId: "owner", deletedAt: null } });
  } finally { list.mockRestore(); count.mockRestore(); find.mockRestore(); }
});
