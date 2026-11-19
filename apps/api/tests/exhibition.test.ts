import { expect, test } from "bun:test";
import { ExhibitionService } from "../src/modules/exhibition/application/exhibition.service";
import type { ExhibitionRepository, ExhibitionRecord } from "../src/modules/exhibition/domain/exhibition.repository";
import { ExhibitionDocumentSchema } from "@repo/shared";
import { validateReferences } from "../src/modules/exhibition/domain/exhibition-references";
import { createPublicExhibitionRoute } from "../src/modules/exhibition/presentation/exhibition.routes";

const document = ExhibitionDocumentSchema.parse({ schemaVersion: 1, templateId: "gallery-1975-v1", templateVersion: 1, metadata: { title: "Phòng", subtitle: "", description: "", coverAssetId: null }, chapters: [1, 2, 3].map(n => ({ id: `00000000-0000-4000-8000-00000000000${n}`, roomKey: `room-${n}`, title: `Chương ${n}`, period: "", description: "" })), items: [] });

test("draft deletion enforces ownership, publication state and revision races", async () => {
  let row: ExhibitionRecord | null = { id: crypto.randomUUID(), ownerId: "owner", slug: "draft", revision: 3, document, publishedDocument: null, publishedRevision: null, updatedAt: new Date() };
  let deleted = 0;
  let raced = false;
  const unexpected = async (): Promise<never> => { throw new Error("Unexpected repository operation"); };
  const repository: ExhibitionRepository = {
    listPublished: unexpected, list: unexpected, resolve: unexpected, podcastOptions: unexpected, create: unexpected, publish: unexpected, findPublished: unexpected, save: unexpected,
    find: async (id, owner) => row?.id === id && row.ownerId === owner ? row : null,
    deleteDraft: async (id, owner, revision) => {
      if (raced || !row || row.id !== id || row.ownerId !== owner || row.revision !== revision || row.publishedRevision !== null) return false;
      deleted++; row = null; return true;
    },
  };
  const service = new ExhibitionService(repository);
  const id = row.id;
  await expect(service.deleteDraft(id, "other-owner", 3)).rejects.toMatchObject({ status: 404 });
  await expect(service.deleteDraft(id, "owner", 2)).rejects.toMatchObject({ status: 409 });
  row.publishedRevision = 3; row.publishedDocument = document;
  await expect(service.deleteDraft(id, "owner", 3)).rejects.toMatchObject({ status: 409 });
  row.publishedRevision = null; row.publishedDocument = null;
  raced = true;
  await expect(service.deleteDraft(id, "owner", 3)).rejects.toMatchObject({ status: 409 });
  expect(deleted).toBe(0);
  raced = false;
  expect(await service.deleteDraft(id, "owner", 3)).toEqual({ deleted: true });
  expect(deleted).toBe(1);
  await expect(service.deleteDraft(id, "owner", 3)).rejects.toMatchObject({ status: 404 });
});

test("public exhibition list is anonymous and returns only public summaries without resolving scenes", async () => {
  const items = [{ slug: "first", title: "Triển lãm một", description: "Câu chuyện một" }, { slug: "second", title: "Triển lãm hai", description: "" }];
  const unexpected = async (): Promise<never> => { throw new Error("Public list must not read draft workspaces or resolve scene assets"); };
  const repository: ExhibitionRepository = { deleteDraft: async () => false, listPublished: async () => ({ items }), list: unexpected, resolve: unexpected, podcastOptions: unexpected, create: unexpected, publish: unexpected, findPublished: unexpected, find: unexpected, save: unexpected };
  const route = createPublicExhibitionRoute(new ExhibitionService(repository));
  const response = await route.request("/exhibitions");
  expect(response.status).toBe(200);
  expect(await response.json()).toEqual({ items });
  items.length = 0;
  expect(await (await route.request("/exhibitions")).json()).toEqual({ items: [] });
});

test("draft writes enforce ownership and compare revisions without losing server data", async () => {
  let row: ExhibitionRecord = { id: "00000000-0000-4000-8000-000000000004", ownerId: "owner", slug: "phong", revision: 1, document, publishedDocument: null, publishedRevision: null, updatedAt: new Date() };
  const repository: ExhibitionRepository = {
    async deleteDraft() { return false; },
    async listPublished() { return { items: [] }; },
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
    async deleteDraft() { return false; },
    async listPublished() { return { items: [] }; },
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

test("individual artwork audio must be verified, ready, and owned by the moderator", () => {
  const image = { id: "00000000-0000-4000-8000-000000000020", uploadedById: "owner", kind: "IMAGE", status: "READY", verifiedAt: new Date(), deletedAt: null, widthPx: 800, heightPx: 600 };
  const audio = { ...image, id: "00000000-0000-4000-8000-000000000021", kind: "AUDIO", widthPx: null, heightPx: null };
  const doc = ExhibitionDocumentSchema.parse({ ...document, audioMode: "artwork", items: [{ id: image.id, chapterId: document.chapters[0]!.id, imageAssetId: image.id, audioAssetId: audio.id, title: "Tranh", description: "", displayDate: "", credit: "", sourceUrl: "", rights: "", narrationId: null, placement: { wallId: "room-1-west", offset: 10, width: 1.5 } }] });
  expect(() => validateReferences(doc, "owner", [image], [], null, [audio])).not.toThrow();
  for (const invalid of [{ ...audio, uploadedById: "other" }, { ...audio, status: "PENDING" }, { ...audio, deletedAt: new Date() }, { ...audio, verifiedAt: null }]) {
    expect(() => validateReferences(doc, "owner", [image], [], null, [invalid])).toThrow();
  }
  expect(() => validateReferences(doc, "owner", [image], [], null, [])).toThrow();
});
