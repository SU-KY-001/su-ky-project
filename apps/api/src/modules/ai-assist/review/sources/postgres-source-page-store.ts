import { Prisma, prisma } from "@repo/db";
import type { PageHit, SourcePageStore } from "../domain/review.types";

const MAX_QUERY_WORDS = 12;
const EXCERPT_MAX_WORDS = 28;
const EXCERPT_MIN_WORDS = 14;
// MaxFragments=0 (single-cover mode): the fragment mode trims the last token of a short page, which cuts off years such as "939".
const HEADLINE_OPTIONS = `MaxFragments=0, MaxWords=${EXCERPT_MAX_WORDS}, MinWords=${EXCERPT_MIN_WORDS}, ShortWord=0, StartSel=[, StopSel=]`;
const WHITESPACE = /\s+/g;

/** Free text -> tsquery text. Words are letters/digits only and each is quoted, so a model can never inject tsquery syntax. */
function toTsQuery(raw: string, joiner: "&" | "|"): string {
  const words = raw.normalize("NFC").split(/[^\p{L}\p{N}]+/u).filter(Boolean).slice(0, MAX_QUERY_WORDS);
  return words.map((word) => `'${word}'`).join(` ${joiner} `);
}

/** Must stay identical to the expression of GIN index `source_pages_tsv_idx`, or the index is not used. */
const TSV = Prisma.sql`to_tsvector('simple', immutable_unaccent(lower(sp."text")))`;

interface HitRow {
  source_id: string;
  page: number;
  excerpt: string;
}

async function searchWith(sources: { sourceId: string; version: number }[], tsQuery: string, limit: number): Promise<PageHit[]> {
  const rows = await prisma.$queryRaw<HitRow[]>`
    WITH wanted AS (
      SELECT * FROM unnest(${sources.map((s) => s.sourceId)}::uuid[], ${sources.map((s) => s.version)}::int[]) AS w(source_id, version)
    ), q AS (
      SELECT to_tsquery('simple', immutable_unaccent(lower(${tsQuery}))) AS query
    ), hits AS (
      SELECT sp.source_id, sp.page, sp."text", q.query, ts_rank_cd(${TSV}, q.query) AS rank
      FROM source_pages sp
      JOIN wanted w ON w.source_id = sp.source_id AND w.version = sp.version
      CROSS JOIN q
      WHERE ${TSV} @@ q.query
      ORDER BY rank DESC, sp.source_id, sp.page
      LIMIT ${limit}
    )
    SELECT source_id, page, ts_headline('simple', immutable_unaccent(lower("text")), query, ${HEADLINE_OPTIONS}) AS excerpt
    FROM hits
    ORDER BY rank DESC, source_id, page`;
  return rows.map((row) => ({ sourceId: row.source_id, page: row.page, excerpt: row.excerpt.replace(WHITESPACE, " ").trim() }));
}

/** Pages of a source version; excerpts are unaccented lowercase (the match runs on that form), full text comes from readPages. */
export function createPostgresSourcePageStore(): SourcePageStore {
  return {
    async hasPages(sourceId, version) {
      const row = await prisma.sourcePage.findFirst({ where: { sourceId, version }, select: { id: true } });
      return row !== null;
    },

    async search(sources, query, limit) {
      const all = toTsQuery(query, "&");
      if (!sources.length || !all) return [];
      const hits = await searchWith(sources, all, limit);
      return hits.length ? hits : searchWith(sources, toTsQuery(query, "|"), limit);
    },

    async readPages(sourceId, version, from, to) {
      const rows = await prisma.sourcePage.findMany({
        where: { sourceId, version, page: { gte: from, lte: to } },
        orderBy: { page: "asc" },
        select: { page: true, text: true },
      });
      return rows;
    },
  };
}
