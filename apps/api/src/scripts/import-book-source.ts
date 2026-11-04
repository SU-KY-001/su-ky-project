/**
 * Imports a book already chunked into SQLite (table `source_pages(source_id, page, text)`) as a VERIFIED source
 * and attaches it to a series, so the AI script review can search and read it like an uploaded PDF.
 * Idempotent: the source is found by title, its pages are replaced, the series link is created once.
 *
 *   bun --env-file=../../.env src/scripts/import-book-source.ts --sqlite <book.db> --book-id <source_id in sqlite> \
 *     --title <title> --series-id <Series.id> [--author <name>] [--year <n>]
 */
import { prisma } from "@repo/db";
import { Database } from "bun:sqlite";
import { parseArgs } from "node:util";

const INSERT_BATCH_SIZE = 200;
const TX_TIMEOUT_MS = 120_000;

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      sqlite: { type: "string" },
      "book-id": { type: "string" },
      title: { type: "string" },
      "series-id": { type: "string" },
      author: { type: "string" },
      year: { type: "string" },
    },
  });
  const { sqlite, title } = values;
  const bookId = values["book-id"];
  const seriesId = values["series-id"];
  if (!sqlite || !bookId || !title || !seriesId) throw new Error("--sqlite, --book-id, --title and --series-id are required");

  const db = new Database(sqlite, { readonly: true });
  const pages = db.query<{ page: number; text: string }, [string]>("select page, text from source_pages where source_id = ? order by page").all(bookId);
  db.close();
  if (!pages.length) throw new Error(`No pages for book ${bookId} in ${sqlite}`);

  if (!(await prisma.series.findUnique({ where: { id: seriesId }, select: { id: true } }))) throw new Error(`Series ${seriesId} not found`);
  const publicationYear = values.year ? Number.parseInt(values.year, 10) : null;
  if (publicationYear !== null && !Number.isInteger(publicationYear)) throw new Error("--year must be an integer");

  await prisma.$transaction(
    async (tx) => {
      const existing = await tx.source.findFirst({ where: { title }, select: { id: true, version: true } });
      const source =
        existing ??
        (await tx.source.create({
          data: { title, tier: "TIER_1_CHINH_SU", author: values.author ?? null, publicationYear, verificationStatus: "VERIFIED", verifiedVersion: 1, verifiedAt: new Date() },
          select: { id: true, version: true },
        }));

      await tx.sourcePage.deleteMany({ where: { sourceId: source.id, version: source.version } });
      for (let i = 0; i < pages.length; i += INSERT_BATCH_SIZE) {
        await tx.sourcePage.createMany({ data: pages.slice(i, i + INSERT_BATCH_SIZE).map((p) => ({ sourceId: source.id, version: source.version, page: p.page, text: p.text })) });
      }

      const linked = await tx.seriesSource.findFirst({ where: { seriesId, sourceId: source.id }, select: { id: true } });
      if (!linked) {
        const last = await tx.seriesSource.aggregate({ where: { seriesId }, _max: { sortOrder: true } });
        await tx.seriesSource.create({ data: { seriesId, sourceId: source.id, sortOrder: (last._max.sortOrder ?? 0) + 1 } });
      }
      console.log(JSON.stringify({ sourceId: source.id, version: source.version, pages: pages.length, seriesId, created: !existing, linked: !linked }));
    },
    { timeout: TX_TIMEOUT_MS },
  );
}

main()
  .catch((err) => {
    console.error("import-book-source failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
