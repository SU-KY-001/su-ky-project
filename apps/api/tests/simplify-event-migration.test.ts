import { describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { assertTestDatabase, RUN_INTEGRATION } from "./support/integration";

describe.skipIf(!RUN_INTEGRATION)("event simplification migration", () => {
  it("removes event evidence while preserving independent podcast documents and pinned revisions", async () => {
    assertTestDatabase();
    const schema = `event_migration_${crypto.randomUUID().replaceAll("-", "")}`;
    const rollback = new Error("Rollback isolated migration fixture");
    const migration = await Bun.file(new URL("../../../packages/db/prisma/migrations/20261103060000_simplify_historical_events/migration.sql", import.meta.url)).text();
    try {
      await prisma.$transaction(async tx => {
        await tx.$executeRawUnsafe(`CREATE SCHEMA ${schema}`);
        await tx.$executeRawUnsafe(`SET LOCAL search_path TO ${schema}`);
        const setup = [
          `CREATE TYPE "HistoricalReviewStatus" AS ENUM ('DRAFT', 'APPROVED')`,
          `CREATE TABLE sources (id integer PRIMARY KEY, document text NOT NULL)`,
          `CREATE TABLE source_revisions (id integer PRIMARY KEY, source_id integer REFERENCES sources(id))`,
          `CREATE TABLE historical_entities (id integer PRIMARY KEY, entity_type text, historical_phase_id integer, deleted_at timestamptz, review_status "HistoricalReviewStatus" DEFAULT 'DRAFT', reviewed_version integer, reviewed_by_id text, reviewed_at timestamptz, review_note text)`,
          `CREATE INDEX historical_entities_historical_phase_id_review_status_delet_idx ON historical_entities(historical_phase_id, review_status, deleted_at)`,
          `CREATE TABLE historical_citations (id integer PRIMARY KEY, entity_id integer REFERENCES historical_entities(id), source_id integer REFERENCES sources(id), source_revision_id integer REFERENCES source_revisions(id))`,
          `CREATE TABLE series_sources (id integer PRIMARY KEY, historical_citation_id integer REFERENCES historical_citations(id), source_id integer REFERENCES sources(id), source_revision_id integer REFERENCES source_revisions(id), locator text)`,
          `CREATE TABLE historical_entity_revisions (id integer PRIMARY KEY, entity_id integer REFERENCES historical_entities(id), snapshot jsonb)`,
          `INSERT INTO sources VALUES (1, 'document.pdf')`,
          `INSERT INTO source_revisions VALUES (2, 1)`,
          `INSERT INTO historical_entities (id, entity_type) VALUES (10, 'EVENT'), (11, 'FIGURE')`,
          `INSERT INTO historical_citations VALUES (20, 10, 1, 2), (21, 11, 1, 2)`,
          `INSERT INTO series_sources VALUES (40, 20, 1, 2, 'tr. 10')`,
          `INSERT INTO historical_entity_revisions VALUES (30, 10, '{"name":"Sự kiện","reviewStatus":"DRAFT","citations":[20]}')`,
        ];
        for (const statement of setup) await tx.$executeRawUnsafe(statement);
        for (const statement of migration.replace(/--[^\n]*/g, "").split(";").map(value => value.trim()).filter(Boolean)) {
          await tx.$executeRawUnsafe(statement);
        }
        expect(await tx.$queryRawUnsafe<Array<{ id: number; document: string }>>("SELECT * FROM sources")).toEqual([{ id: 1, document: "document.pdf" }]);
        expect(await tx.$queryRawUnsafe<Array<{ id: number; source_id: number }>>("SELECT * FROM source_revisions")).toEqual([{ id: 2, source_id: 1 }]);
        expect(await tx.$queryRawUnsafe<Array<{ id: number; historical_citation_id: number | null; source_id: number; source_revision_id: number; locator: string }>>("SELECT * FROM series_sources")).toEqual([{ id: 40, historical_citation_id: null, source_id: 1, source_revision_id: 2, locator: "tr. 10" }]);
        expect(await tx.$queryRawUnsafe<Array<{ id: number }>>("SELECT id FROM historical_citations")).toEqual([{ id: 21 }]);
        expect(await tx.$queryRawUnsafe<Array<{ snapshot: { name: string } }>>("SELECT snapshot FROM historical_entity_revisions")).toEqual([{ snapshot: { name: "Sự kiện" } }]);
        const columns = await tx.$queryRawUnsafe<Array<{ column_name: string }>>(`SELECT column_name FROM information_schema.columns WHERE table_schema = '${schema}' AND table_name = 'historical_entities'`);
        expect(columns.some(column => column.column_name.startsWith("review"))).toBe(false);
        throw rollback;
      });
    } catch (error) {
      if (error !== rollback) throw error;
    }
    expect(await prisma.$queryRawUnsafe<Array<{ schema_name: string }>>(`SELECT schema_name FROM information_schema.schemata WHERE schema_name = '${schema}'`)).toEqual([]);
  });
});
