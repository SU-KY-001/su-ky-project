import { expect, test } from "bun:test";
import { ExhibitionService } from "../src/modules/exhibition/application/exhibition.service";
import type { ExhibitionRepository, ExhibitionRecord } from "../src/modules/exhibition/domain/exhibition.repository";
import { ExhibitionDocumentSchema } from "@repo/shared";
import { validateReferences } from "../src/modules/exhibition/domain/exhibition-references";

const document = ExhibitionDocumentSchema.parse({ schemaVersion: 1, templateId: "gallery-1975-v1", templateVersion: 1, metadata: { title: "Phòng", subtitle: "", description: "", coverAssetId: null }, chapters: [1, 2, 3].map(n => ({ id: `00000000-0000-4000-8000-00000000000${n}`, roomKey: `room-${n}`, title: `Chương ${n}`, period: "", description: "" })), items: [] });

test("draft writes enforce ownership and compare revisions without losing server data", async () => {
  let row: ExhibitionRecord = { id: "00000000-0000-4000-8000-000000000004", ownerId: "owner", slug: "phong", revision: 1, document, publishedDocument: null, publishedRevision: null, updatedAt: new Date() };
  const repository: ExhibitionRepository = {
    async publish() { return null; },
    async findPublished() { return null; },
    async podcastOptions(query) { return { items: [], total: 0, page: query.page, limit: query.limit }; },
    async list(_owner, query) { return { items: [], total: 0, page: query.page, limit: query.limit }; },
    async resolve(value) { return { metadata: value.metadata, chapters: value.chapters, items: [] }; },
    async create() { return row; },
    async find(id, owner) { return id === row.id && owner === row.ownerId ? row : null; },
    async save(id, owner, revision, next) { if (id !== row.id || owner !== row.ownerId || revision !== row.revision) return null; row = { ...row, revision: row.revision + 1, document: next }; return row; },
  };
  const service = new ExhibitionService(repository);
  const changed = { ...document, metadata: { ...document.metadata, title: "Đã sửa" } };
  await expect(service.saveDraft(row.id, "other", 1, changed)).rejects.toMatchObject({ status: 404 });
  expect((await service.saveDraft(row.id, "owner", 1, changed)).revision).toBe(2);
  await expect(service.saveDraft(row.id, "owner", 1, document)).rejects.toMatchObject({ status: 409, code: "EXHIBITION_REVISION_CONFLICT" });
  expect(row.document.metadata.title).toBe("Đã sửa");
});

test("creating a draft validates the document before persistence", async () => {
  let calls = 0;
  const repository: ExhibitionRepository = {
    async publish() { return null; },
    async findPublished() { return null; },
    async podcastOptions(query) { return { items: [], total: 0, page: query.page, limit: query.limit }; },
    async list(_owner, query) { return { items: [], total: 0, page: query.page, limit: query.limit }; },
    async resolve(value) { return { metadata: value.metadata, chapters: value.chapters, items: [] }; },
    async find() { return null; },
    async save() { return null; },
    async create(ownerId, value) { calls++; return { id: crypto.randomUUID(), ownerId, slug: "test", revision: 1, document: value, publishedDocument: null, publishedRevision: null, updatedAt: new Date() }; },
  };
  const service = new ExhibitionService(repository);
  const workspace = await service.create("owner", document);
  expect(workspace.revision).toBe(1);
  expect(workspace.resolved.chapters).toHaveLength(3);
  expect(workspace).not.toHaveProperty("ownerId");
  await expect(service.create("owner", { ...document, chapters: [] })).rejects.toThrow();
  expect(calls).toBe(1);
});

test("draft references require verified owned images and published playable narrations", () => {
  const imageId = "00000000-0000-4000-8000-000000000005";
  const narrationId = "00000000-0000-4000-8000-000000000006";
  const withItem = ExhibitionDocumentSchema.parse({ ...document, items: [{ id: "00000000-0000-4000-8000-000000000007", chapterId: document.chapters[0]!.id, imageAssetId: imageId, title: "Ảnh", description: "", displayDate: "", credit: "", sourceUrl: "", rights: "", narrationId, placement: { wallId: "room-1-west", offset: 5, width: 2 } }] });
  const image = { id: imageId, uploadedById: "owner", kind: "IMAGE", status: "READY", verifiedAt: new Date(), deletedAt: null, widthPx: 800, heightPx: 600 };
  expect(() => validateReferences(withItem, "owner", [image], [narrationId])).not.toThrow();
  expect(() => validateReferences(withItem, "other", [image], [narrationId])).toThrow();
  expect(() => validateReferences(withItem, "owner", [{ ...image, status: "PENDING" }], [narrationId])).toThrow();
  expect(() => validateReferences(withItem, "owner", [image], [])).toThrow();
});

test("shared exhibition audio must be verified and owned by its creator", () => {
  const audio = { id: "00000000-0000-4000-8000-000000000009", uploadedById: "owner", kind: "AUDIO", status: "READY", verifiedAt: new Date(), deletedAt: null, widthPx: null, heightPx: null };
  const withAudio = { ...document, audioAssetId: audio.id };
  expect(() => validateReferences(withAudio, "owner", [], [], audio)).not.toThrow();
  expect(() => validateReferences(withAudio, "other", [], [], audio)).toThrow();
  expect(() => validateReferences(withAudio, "owner", [], [], { ...audio, status: "PENDING" })).toThrow();
  expect(() => validateReferences(withAudio, "owner", [], [], null)).toThrow();
});
