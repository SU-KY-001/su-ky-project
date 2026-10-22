import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { createPostgresSourcePageStore } from "../../src/modules/ai-assist/sources/postgres-source-page-store";
import { assertTestDatabase, createModerator, removeFixtures, RUN_INTEGRATION, uniqueSuffix } from "../support/integration";

const SEARCH_LIMIT = 5;

describe.skipIf(!RUN_INTEGRATION)("postgres source page store (database)", () => {
  const runId = uniqueSuffix();
  const userId = `it-ai-store-${runId}`;
  const store = createPostgresSourcePageStore();
  let a = "";
  let b = "";

  async function makeSource(title: string, pages: Array<{ version: number; page: number; text: string }>) {
    const source = await prisma.source.create({ data: { tier: "TIER_1_CHINH_SU", title, createdById: userId } });
    await prisma.sourcePage.createMany({ data: pages.map((p) => ({ sourceId: source.id, ...p })) });
    return source.id;
  }

  beforeAll(async () => {
    assertTestDatabase();
    await createModerator(userId);
    a = await makeSource(`A ${runId}`, [
      { version: 1, page: 1, text: "Ngô Quyền đại phá quân Nam Hán trên sông Bạch Đằng năm 938." },
      { version: 1, page: 2, text: "Lý Thái Tổ dời đô ra thành Đại La năm 1010, đổi tên Thăng Long." },
      { version: 1, page: 3, text: "Trần Hưng Đạo ba lần đánh thắng quân Nguyên Mông." },
      { version: 2, page: 1, text: "Bản hai: Ngô Quyền xưng vương năm 939." },
    ]);
    b = await makeSource(`B ${runId}`, [{ version: 1, page: 1, text: "Sách khác cũng nhắc Ngô Quyền và sông Bạch Đằng." }]);
  });
  afterAll(async () => {
    await removeFixtures(userId);
  });

  it("matches without diacritics and marks the hit in the excerpt", async () => {
    const hits = await store.search([{ sourceId: a, version: 1 }], "ngo quyen bach dang", SEARCH_LIMIT);
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ sourceId: a, page: 1 });
    expect(hits[0]!.excerpt).toContain("[ngo]");
  });

  it("falls back to any-word matching when no page has every word", async () => {
    const hits = await store.search([{ sourceId: a, version: 1 }], "Đại La Bạch Đằng", SEARCH_LIMIT);
    expect(hits.map((h) => h.page).sort()).toEqual([1, 2]);
  });

  it("returns nothing for punctuation-only or empty queries, and never lets a query inject tsquery syntax", async () => {
    const sources = [{ sourceId: a, version: 1 }];
    for (const query of ["", "   ", "&|!()", "'; DROP TABLE source_pages; --", "ngo & | ! ( ) :* <-> quyen", "\\", "a'b"]) {
      expect(Array.isArray(await store.search(sources, query, SEARCH_LIMIT))).toBe(true);
    }
    expect(await store.search(sources, "&|!()", SEARCH_LIMIT)).toEqual([]);
    expect(await prisma.sourcePage.count({ where: { sourceId: a } })).toBe(4);
  });

  it("returns a short excerpt around the match on a long page", async () => {
    const filler = Array.from({ length: 300 }, (_, i) => `chữ${i}`).join(" ");
    const longId = await makeSource(`L ${runId}`, [{ version: 1, page: 1, text: `${filler} Hồ Quý Ly lên ngôi năm 1400 ${filler}` }]);
    const [hit] = await store.search([{ sourceId: longId, version: 1 }], "Hồ Quý Ly", SEARCH_LIMIT);
    expect(hit!.excerpt).toContain("[ho]");
    expect(hit!.excerpt.split(" ").length).toBeLessThan(60);
  });

  it("searches only the requested (source, version) pairs", async () => {
    expect((await store.search([{ sourceId: a, version: 1 }], "Ngô Quyền", SEARCH_LIMIT)).map((h) => h.sourceId)).toEqual([a]);
    const both = await store.search([{ sourceId: a, version: 1 }, { sourceId: b, version: 1 }], "Ngô Quyền", SEARCH_LIMIT);
    expect(both.map((h) => h.sourceId).sort()).toEqual([a, b].sort());
    const v2 = await store.search([{ sourceId: a, version: 2 }], "Ngô Quyền", SEARCH_LIMIT);
    expect(v2.map((h) => h.page)).toEqual([1]);
    expect(v2[0]!.excerpt).toContain("939");
    expect(await store.search([], "Ngô Quyền", SEARCH_LIMIT)).toEqual([]);
  });

  it("honours the result limit", async () => {
    const hits = await store.search([{ sourceId: a, version: 1 }, { sourceId: b, version: 1 }], "năm sông quân", 1);
    expect(hits).toHaveLength(1);
  });

  it("reads exact pages of one version in order, and hasPages is per version", async () => {
    expect((await store.readPages(a, 1, 2, 3)).map((p) => p.page)).toEqual([2, 3]);
    expect((await store.readPages(a, 1, 1, 1))[0]!.text).toContain("938");
    expect((await store.readPages(a, 2, 1, 3)).map((p) => p.page)).toEqual([1]);
    expect(await store.readPages(a, 1, 10, 12)).toEqual([]);
    expect(await store.hasPages(a, 1)).toBe(true);
    expect(await store.hasPages(a, 3)).toBe(false);
    expect(await store.hasPages(crypto.randomUUID(), 1)).toBe(false);
  });
});
