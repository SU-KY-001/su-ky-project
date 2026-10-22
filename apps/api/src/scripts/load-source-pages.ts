/**
 * Loads the per-page text of a PDF into `source_pages` (Postgres), read by the AI source-check tools.
 * Temporary loader (spec-source-agent.md section 2); replaced by an upload-time job later.
 *
 *   bun --env-file=../../.env src/scripts/load-source-pages.ts --pdf <file.pdf> --source-id <Source.id> [--drop-line <exact line>]...
 *
 * Pages are stored under the source's current `version`; reloading replaces that version's pages.
 */
import { prisma } from "@repo/db";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { extractText, getDocumentProxy } from "unpdf";

/** A page with fewer non-space characters than this is treated as having no text layer (scan or blank). */
const MIN_TEXT_CHARS_PER_PAGE = 20;
const WARN_EMPTY_PAGE_RATIO = 0.2;
const INSERT_BATCH_SIZE = 200;

function cleanPage(raw: string, dropLines: Set<string>): string {
  return raw
    .normalize("NFC")
    .split("\n")
    .filter((line) => !dropLines.has(line.trim()))
    .join("\n")
    .trim();
}

async function main(): Promise<void> {
  const { values } = parseArgs({
    options: {
      pdf: { type: "string" },
      "source-id": { type: "string" },
      "drop-line": { type: "string", multiple: true, default: [] },
    },
  });
  if (!values.pdf || !values["source-id"]) throw new Error("--pdf and --source-id are required");
  const sourceId = values["source-id"];

  const source = await prisma.source.findUnique({ where: { id: sourceId }, select: { version: true } });
  if (!source) throw new Error(`Source ${sourceId} not found`);

  const started = Date.now();
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(values.pdf)));
  const { text: pages } = await extractText(pdf, { mergePages: false });
  const dropLines = new Set(values["drop-line"].map((l) => l.trim()));

  let emptyPages = 0;
  let totalChars = 0;
  const rows = pages.map((raw, i) => {
    const text = cleanPage(raw, dropLines);
    if (text.replace(/\s/g, "").length < MIN_TEXT_CHARS_PER_PAGE) emptyPages++;
    totalChars += text.length;
    return { sourceId, version: source.version, page: i + 1, text };
  });

  await prisma.$transaction(
    async (tx) => {
      await tx.sourcePage.deleteMany({ where: { sourceId, version: source.version } });
      for (let i = 0; i < rows.length; i += INSERT_BATCH_SIZE) {
        await tx.sourcePage.createMany({ data: rows.slice(i, i + INSERT_BATCH_SIZE) });
      }
    },
    { timeout: 120_000 }
  );

  const emptyRatio = emptyPages / pages.length;
  console.log(
    JSON.stringify({ sourceId, version: source.version, pages: pages.length, emptyPages, totalChars, seconds: +((Date.now() - started) / 1000).toFixed(1) })
  );
  if (emptyRatio > WARN_EMPTY_PAGE_RATIO) {
    console.error(`WARNING: ${(emptyRatio * 100).toFixed(0)}% of pages have no text layer; this source is probably a scan and cannot be searched.`);
  }
}

main()
  .catch((err) => {
    console.error("load-source-pages failed:", err instanceof Error ? err.message : err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
