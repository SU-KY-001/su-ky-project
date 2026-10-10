import type { DbClient } from "./index";
import { describeHalfOpenRange, HISTORICAL_PERIOD_TREE } from "./historical-seed-data";

/** Idempotent: upserts by slug, so re-running keeps ids stable and only refreshes names/years/notes. */
export async function seedHistoricalPeriods(db: DbClient): Promise<void> {
  for (const [periodIndex, period] of HISTORICAL_PERIOD_TREE.entries()) {
    const { slug, name, startYear, endYear } = period;
    const periodData = { name, startYear, endYear, sortOrder: periodIndex + 1 };
    const row = await db.historicalPeriod.upsert({ where: { slug }, create: { slug, ...periodData }, update: periodData });
    for (const [phaseIndex, phase] of period.phases.entries()) {
      const phaseData = {
        periodId: row.id,
        name: phase.name,
        startYear: phase.startYear,
        endYear: phase.endYear,
        note: describeHalfOpenRange(phase.startYear, phase.endYear),
        sortOrder: phaseIndex + 1,
      };
      await db.historicalPhase.upsert({ where: { slug: phase.slug }, create: { slug: phase.slug, ...phaseData }, update: phaseData });
    }
  }
}
