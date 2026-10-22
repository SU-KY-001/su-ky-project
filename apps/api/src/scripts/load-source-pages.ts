/**
 * Loads the per-page text of a PDF into the SQLite page store read by the AI source-check tools.
 * Temporary loader (spec-source-agent.md section 2); replaced by an upload-time job later.
 *
 *   bun src/scripts/load-source-pages.ts --pdf <file.pdf> --source-id <Source.id> [--db <file.db>] [--drop-line <exact line>]...
 */
import { Database } from "bun:sqlite";
import { readFileSync } from "node:fs";
import { parseArgs } from "node:util";
import { extractText, getDocumentProxy } from "unpdf";

const DEFAULT_DB_PATH = process.env.AI_ASSIST_SOURCE_DB_PATH ?? "source-pages.db";
/** A page with fewer non-space characters than this is treated as having no text layer (scan or blank). */
const MIN_TEXT_CHARS_PER_PAGE = 20;
const WARN_EMPTY_PAGE_RATIO = 0.2;

const SCHEMA = `
create table if not exists source_pages(
  id integer primary key,
  source_id text not null,
  page integer not null,
  text text not null,
  unique(source_id, page)
);
create virtual table if not exists source_pages_fts using fts5(
  text, content='source_pages', content_rowid='id', tokenize='unicode61 remove_diacritics 2'
);`;

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
      db: { type: "string", default: DEFAULT_DB_PATH },
      "drop-line": { type: "string", multiple: true, default: [] },
    },
  });
  if (!values.pdf || !values["source-id"]) throw new Error("--pdf and --source-id are required");

  const started = Date.now();
  const pdf = await getDocumentProxy(new Uint8Array(readFileSync(values.pdf)));
  const { text: pages } = await extractText(pdf, { mergePages: false });
  const dropLines = new Set(values["drop-line"].map((l) => l.trim()));

  const db = new Database(values.db);
  db.exec(SCHEMA);
  const sourceId = values["source-id"];
  const insert = db.prepare("insert into source_pages(source_id, page, text) values (?, ?, ?)");
  let emptyPages = 0;
  let totalChars = 0;
  db.transaction(() => {
    // Reloading a source replaces it; the FTS index is rebuilt below from the content table.
    db.prepare("delete from source_pages where source_id = ?").run(sourceId);
    pages.forEach((raw, i) => {
      const text = cleanPage(raw, dropLines);
      if (text.replace(/\s/g, "").length < MIN_TEXT_CHARS_PER_PAGE) emptyPages++;
      totalChars += text.length;
      insert.run(sourceId, i + 1, text);
    });
    db.exec("insert into source_pages_fts(source_pages_fts) values('rebuild')");
  })();
  db.close();

  const emptyRatio = emptyPages / pages.length;
  console.log(JSON.stringify({ sourceId, pages: pages.length, emptyPages, totalChars, seconds: +((Date.now() - started) / 1000).toFixed(1), db: values.db }));
  if (emptyRatio > WARN_EMPTY_PAGE_RATIO) {
    console.error(`WARNING: ${(emptyRatio * 100).toFixed(0)}% of pages have no text layer; this source is probably a scan and cannot be searched.`);
  }
}

main().catch((err) => {
  console.error("load-source-pages failed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
