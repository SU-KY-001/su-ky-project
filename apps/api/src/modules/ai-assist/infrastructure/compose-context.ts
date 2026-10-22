import { prisma } from "@repo/db";
import type { NarratorInput } from "../compose/input/outline.input";
import type { SourceExcerpt } from "../compose/input/xml";

/** What compose prompts need beyond the episode row: series source excerpts and the narrator entity. */
export interface ComposeContextLoader {
  /** Sources of the series with a non-empty excerpt, in `sortOrder`. */
  loadSources(seriesId: string): Promise<SourceExcerpt[]>;
  /** Null when the entity does not exist or is deleted. */
  loadNarrator(entityId: string): Promise<NarratorInput | null>;
}

export function createPrismaComposeContext(): ComposeContextLoader {
  return {
    async loadSources(seriesId) {
      const rows = await prisma.seriesSource.findMany({
        where: { seriesId, excerpt: { not: null } },
        orderBy: { sortOrder: "asc" },
        select: { locator: true, excerpt: true, source: { select: { title: true, author: true, publicationYear: true } } },
      });
      return rows.flatMap((row) =>
        row.excerpt?.trim()
          ? [{ title: row.source.title, author: row.source.author, year: row.source.publicationYear, locator: row.locator, excerpt: row.excerpt }]
          : [],
      );
    },
    async loadNarrator(entityId) {
      const entity = await prisma.historicalEntity.findFirst({
        where: { id: entityId, deletedAt: null },
        select: { name: true, summary: true },
      });
      return entity ? { name: entity.name, summary: entity.summary } : null;
    },
  };
}
