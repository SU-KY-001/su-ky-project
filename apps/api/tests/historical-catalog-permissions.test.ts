import { expect, it } from "bun:test";
import { HistoricalCatalogService } from "../src/modules/catalog/application/historical-catalog.service";
import type { HistoricalCatalogRepository, HistoricalNodeKind, HistoricalNodeRecord } from "../src/modules/catalog/domain/historical-catalog.repository";

function catalog(createdById: string | null): HistoricalCatalogService {
  const node: HistoricalNodeRecord = {
    id: "11111111-1111-4111-8111-111111111111", name: "Nội dung lịch sử", slug: "noi-dung-lich-su", summary: "Dữ liệu ban đầu",
    time: { kind: "UNKNOWN", note: "Chưa xác định" }, startYear: null, endYear: null, version: 1, createdById,
    updatedAt: new Date(), deletedAt: null, isActive: true, sortOrder: 0, periodId: null, historicalPhaseId: null,
    entityType: null, aliases: [], reviewStatus: "DRAFT", reviewedVersion: null, reviewedAt: null, reviewNote: null,
  };
  const repository: HistoricalCatalogRepository = {
    get: async () => node,
    list: async () => ({ items: [node], total: 1 }),
    counts: async () => new Map(),
    create: async () => { throw new Error("Creation is not part of editing"); },
    patch: async (_kind, _id, _actor, _version, input) => {
      Object.assign(node, input, { version: node.version + 1 });
      return node;
    },
    setDeleted: async (_kind, _id, _actor, _version, deleted) => {
      node.deletedAt = deleted ? new Date() : null;
      return node;
    },
  };
  return new HistoricalCatalogService(repository);
}

for (const kind of ["period", "phase"] satisfies HistoricalNodeKind[]) {
  it(`lets moderators edit system-generated ${kind} without assigning an owner`, async () => {
    const service = catalog(null);
    const first = await service.patchNode({ userId: "moderator-a", role: "moderator" }, kind, "record", { summary: "Đã bổ sung mô tả", baseVersion: 1 });
    expect(first.summary).toBe("Đã bổ sung mô tả");
    const next = await service.patchNode({ userId: "moderator-b", role: "moderator" }, kind, "record", { summary: "Biên tập tiếp", baseVersion: 2 });
    expect(next.summary).toBe("Biên tập tiếp");
    expect(next.createdById).toBeNull();
  });
}

it("preserves ownership on authored records and rejects non-moderator access to system content", async () => {
  const authored = catalog("owner");
  await expect(authored.patchNode({ userId: "another", role: "moderator" }, "period", "record", { summary: "Không được sửa", baseVersion: 1 })).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  expect((await authored.patchNode({ userId: "owner", role: "moderator" }, "entity", "record", { summary: "Chủ sở hữu sửa", baseVersion: 1 })).summary).toBe("Chủ sở hữu sửa");
  expect((await authored.patchNode({ userId: "admin", role: "admin" }, "period", "record", { summary: "Admin sửa", baseVersion: 2 })).summary).toBe("Admin sửa");
  await expect(catalog(null).patchNode({ userId: "reader", role: "user" }, "period", "record", { summary: "Không được sửa", baseVersion: 1 })).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  await expect(catalog(null).patchNode({ userId: "moderator", role: "moderator" }, "entity", "record", { summary: "Sự kiện cần tác giả", baseVersion: 1 })).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
});
