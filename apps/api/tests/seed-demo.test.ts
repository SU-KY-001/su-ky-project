import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { prisma } from "@repo/db";
import { seedDemo, SERIES, SCENARIOS, type Ingest } from "../src/scripts/seed-demo";
import { assertTestDatabase, createModerator, RUN_INTEGRATION, uniqueSuffix } from "./support/integration";

const PORTRAIT = { width: 600, height: 900 };
const LANDSCAPE = { width: 1280, height: 720 };
const AUDIO_SECONDS = 60;
const FAIL_AFTER_INGESTS = 9;

const okIngest: Ingest = async (kind, publicId) => ({
  version: 1,
  format: kind === "AUDIO" ? "mp3" : "jpg",
  bytes: 1024,
  ...(kind === "AUDIO" ? { duration: AUDIO_SECONDS } : publicId.endsWith("-portrait") ? PORTRAIT : LANDSCAPE),
});

function ingestFailingAfter(limit: number): Ingest {
  let calls = 0;
  return (kind, publicId, url) => {
    if (++calls > limit) throw new Error("simulated upload failure");
    return okIngest(kind, publicId, url);
  };
}

const slugs = SERIES.map((series) => series.slug);

async function snapshot() {
  const scheduleWhere = { episode: { series: { slug: { in: slugs } } } };
  const [series, episodes, schedules, assignments, reviews, tickets, audioNarrations] = await Promise.all([
    prisma.series.count({ where: { slug: { in: slugs } } }),
    prisma.episode.count({ where: { series: { slug: { in: slugs } } } }),
    prisma.releaseSchedule.count({ where: scheduleWhere }),
    prisma.productionAssignment.count({ where: { removedAt: null, schedule: scheduleWhere } }),
    prisma.episodeReview.count({ where: { schedule: scheduleWhere } }),
    prisma.releaseReassignmentTicket.count({ where: { schedule: scheduleWhere } }),
    prisma.episodeNarration.count({ where: { audioAssetId: { not: null }, episode: { series: { slug: { in: slugs } } } } }),
  ]);
  return { series, episodes, schedules, assignments, reviews, tickets, audioNarrations };
}

describe.skipIf(!RUN_INTEGRATION)("demo seed (database)", () => {
  const runId = uniqueSuffix();
  const moderatorId = `it-seed-mod-${runId}`;
  const createdCatalog: { topicId?: string; periodId?: string; phaseId?: string } = {};

  async function cleanup() {
    const scheduleWhere = { episode: { series: { slug: { in: slugs } } } };
    await prisma.releaseSchedule.deleteMany({ where: scheduleWhere });
    await prisma.episodeNarration.deleteMany({ where: { episode: { series: { slug: { in: slugs } } } } });
    await prisma.episode.deleteMany({ where: { series: { slug: { in: slugs } } } });
    await prisma.seriesSource.deleteMany({ where: { series: { slug: { in: slugs } } } });
    await prisma.series.deleteMany({ where: { slug: { in: slugs } } });
    await prisma.mediaAsset.deleteMany({ where: { publicId: { contains: "/seed/" } } });
    await prisma.user.deleteMany({ where: { id: { startsWith: "demo-mod-" } } });
  }

  beforeAll(async () => {
    assertTestDatabase();
    await cleanup();
    await createModerator(moderatorId);
    if (!(await prisma.topic.findFirst({ where: { isActive: true } }))) {
      createdCatalog.topicId = (await prisma.topic.create({ data: { name: `it-topic-${runId}`, slug: `it-topic-${runId}` } })).id;
    }
    if (!(await prisma.historicalPhase.findFirst({ where: { isActive: true, deletedAt: null } }))) {
      const period = await prisma.historicalPeriod.create({ data: { name: `it-period-${runId}`, slug: `it-period-${runId}` } });
      createdCatalog.periodId = period.id;
      createdCatalog.phaseId = (await prisma.historicalPhase.create({ data: { periodId: period.id, name: `it-phase-${runId}`, slug: `it-phase-${runId}` } })).id;
    }
  });

  afterAll(async () => {
    await cleanup();
    if (createdCatalog.phaseId) await prisma.historicalPhase.deleteMany({ where: { id: createdCatalog.phaseId } });
    if (createdCatalog.periodId) await prisma.historicalPeriod.deleteMany({ where: { id: createdCatalog.periodId } });
    if (createdCatalog.topicId) await prisma.topic.deleteMany({ where: { id: createdCatalog.topicId } });
    await prisma.user.deleteMany({ where: { id: moderatorId } });
  });

  it("completes after an upload failure mid-run, then a rerun adds nothing", async () => {
    await expect(seedDemo(ingestFailingAfter(FAIL_AFTER_INGESTS))).rejects.toThrow("simulated upload failure");
    const partial = await snapshot();
    expect(partial.schedules).toBe(0);

    await seedDemo(okIngest);
    const complete = await snapshot();
    expect(complete.series).toBe(SERIES.length);
    expect(complete.schedules).toBe(SCENARIOS.length);
    // One active assignee per schedule is a DB invariant (partial unique index).
    expect(complete.assignments).toBe(SCENARIOS.length);
    expect(complete.reviews).toBe(SCENARIOS.filter((scenario) => scenario.review).length);
    expect(complete.tickets).toBe(SCENARIOS.filter((scenario) => scenario.ticket).length);
    expect(complete.audioNarrations).toBeGreaterThan(0);

    const counts = await seedDemo(okIngest);
    expect({ series: counts.series, episodes: counts.episodes, schedules: counts.schedules }).toEqual({ series: 0, episodes: 0, schedules: 0 });
    expect(await snapshot()).toEqual(complete);
  });

  it("restores schedule children and audio that a crashed run left missing", async () => {
    const complete = await snapshot();
    const scheduleWhere = { episode: { series: { slug: { in: slugs } } } };
    await prisma.productionAssignment.deleteMany({ where: { schedule: scheduleWhere } });
    await prisma.episodeReview.deleteMany({ where: { schedule: scheduleWhere } });
    await prisma.releaseReassignmentTicket.deleteMany({ where: { schedule: scheduleWhere } });
    await prisma.episodeNarration.updateMany({ where: { episode: { series: { slug: { in: slugs } } } }, data: { audioAssetId: null, audioAttachedAt: null } });

    await seedDemo(okIngest);
    expect(await snapshot()).toEqual(complete);
  });
});
