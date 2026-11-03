import { expect, test } from "bun:test";
import { prisma } from "@repo/db";
import { ExhibitionDocumentSchema } from "@repo/shared";
import { PrismaExhibitionRepository } from "../src/modules/exhibition/infrastructure/prisma-exhibition.repository";
import { ExhibitionService } from "../src/modules/exhibition/application/exhibition.service";
import { assertTestDatabase, RUN_INTEGRATION } from "./support/integration";

test.skipIf(!RUN_INTEGRATION)("Prisma draft save rejects invalid media and stale revisions without changing stored data", async () => {
  assertTestDatabase();
  const userId = crypto.randomUUID();
  let exhibitionId = "";
  const document = ExhibitionDocumentSchema.parse({ schemaVersion: 1, templateId: "gallery-1975-v1", templateVersion: 1, metadata: { title: "Kiểm thử", subtitle: "", description: "", coverAssetId: null }, chapters: [1, 2, 3].map(n => ({ id: crypto.randomUUID(), roomKey: `room-${n}`, title: `Chương ${n}`, period: "", description: "" })), items: [] });
  try {
    await prisma.user.create({ data: { id: userId, name: "Test", email: `${userId}@example.com` } });
    const repository = new PrismaExhibitionRepository({ deliveryUrl: () => "https://example.com/image.jpg" });
    const created = await repository.create(userId, document);
    exhibitionId = created.id;
    expect(created.revision).toBe(1);
    expect((await repository.list(userId, { q: "Kiểm", status: "all", page: 1, limit: 10 })).total).toBe(1);
    expect((await repository.list(crypto.randomUUID(), { q: "", status: "all", page: 1, limit: 10 })).total).toBe(0);
    expect((await repository.list(userId, { q: "", status: "published", page: 1, limit: 10 })).total).toBe(0);
    expect((await repository.listPublished()).items.some(item => item.slug === created.slug)).toBe(false);
    expect((await repository.podcastOptions({ q: "không có tập này", page: 1, limit: 10 })).items).toEqual([]);
    expect(await repository.find(exhibitionId, crypto.randomUUID())).toBeNull();
    const invalid = ExhibitionDocumentSchema.parse({ ...document, metadata: { ...document.metadata, coverAssetId: crypto.randomUUID() } });
    await expect(repository.save(exhibitionId, userId, 1, invalid)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    expect((await repository.find(exhibitionId, userId))?.revision).toBe(1);
    const saved = await repository.save(exhibitionId, userId, 1, { ...document, metadata: { ...document.metadata, title: "Đã lưu" } });
    expect(saved?.revision).toBe(2);
    expect(await repository.save(exhibitionId, userId, 1, document)).toBeNull();
    expect((await repository.find(exhibitionId, userId))?.document.metadata.title).toBe("Đã lưu");
    const concurrent = await Promise.allSettled([
      repository.save(exhibitionId, userId, 2, document),
      repository.save(exhibitionId, userId, 2, document),
    ]);
    expect(concurrent.filter(result => result.status === "fulfilled" && result.value !== null)).toHaveLength(1);
    expect((await repository.find(exhibitionId, userId))?.revision).toBe(3);
    await expect(repository.publish(exhibitionId, userId, 3)).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    const imageId = crypto.randomUUID();
    await prisma.mediaAsset.create({ data: { id: imageId, uploadedById: userId, publicId: `test/${imageId}`, kind: "IMAGE", status: "READY", verifiedAt: new Date(), widthPx: 800, heightPx: 600 } });
    const complete = ExhibitionDocumentSchema.parse({ ...document, items: [{ id: crypto.randomUUID(), chapterId: document.chapters[0]!.id, imageAssetId: imageId, title: "Ảnh", description: "", displayDate: "", credit: "Tác giả", sourceUrl: "https://example.com/source", rights: "Được sử dụng", narrationId: null, placement: { wallId: "room-1-west", offset: 5, width: 2 } }] });
    const revision4 = await repository.save(exhibitionId, userId, 3, complete);
    expect(revision4?.revision).toBe(4);
    expect((await repository.publish(exhibitionId, userId, 4))?.publishedRevision).toBe(4);
    await repository.save(exhibitionId, userId, 4, { ...complete, metadata: { ...complete.metadata, title: "Bản sửa" } });
    expect((await repository.find(exhibitionId, userId))?.publishedDocument?.metadata.title).toBe(document.metadata.title);
    const publicData = await new ExhibitionService(repository).publicExhibition(created.slug);
    expect(publicData.metadata.title).toBe(document.metadata.title);
    expect(publicData).not.toHaveProperty("ownerId");
    expect(publicData).not.toHaveProperty("document");
    const summary = (await repository.listPublished()).items.find(item => item.slug === created.slug);
    expect(summary).toEqual({ slug: created.slug, title: document.metadata.title, description: document.metadata.description });
  } finally {
    await prisma.exhibition.deleteMany({ where: { id: exhibitionId, ownerId: userId } });
    await prisma.mediaAsset.deleteMany({ where: { uploadedById: userId } });
    await prisma.user.deleteMany({ where: { id: userId } });
  }
});
