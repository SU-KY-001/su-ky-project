import { describe, expect, it } from "bun:test";
import type { EpisodeWorkspaceEntity } from "../../src/modules/content/domain/content.entity";
import {
  computeEpisodeReadiness,
  episodeChecklistFromReadiness,
} from "../../src/modules/content/application/episode-readiness";

const baseEpisode = (): EpisodeWorkspaceEntity =>
  ({
    title: "Tập thử",
    contentRevision: 3,
    description: "Mô tả",
    adminLockedAt: null,
    series: { status: "PUBLISHED" },
    narrations: [
      {
        narrationType: "THIRD_PERSON",
        scriptContent: "Lời kể đã có",
        audioAsset: { status: "READY" },
      },
    ],
    entityTags: [],
    attachments: [],
  }) as unknown as EpisodeWorkspaceEntity;

describe("computeEpisodeReadiness", () => {
  it("keeps the legacy publish checklist ready result aligned with the new readiness result", () => {
    const episode = baseEpisode();
    const readiness = computeEpisodeReadiness(episode);
    const checklist = episodeChecklistFromReadiness(readiness);

    expect(readiness.ready).toBe(true);
    expect(checklist.ready).toBe(readiness.ready);
    expect(checklist.items).toEqual([
      { key: "BASIC_INFO", ok: true },
      { key: "THIRD_PERSON_SCRIPT", ok: true },
      { key: "THIRD_PERSON_AUDIO", ok: true },
    ]);
  });

  it("marks missing third-person audio as required while keeping advisory warnings separate", () => {
    const episode = baseEpisode();
    episode.narrations[0]!.audioAsset = null;
    episode.series.status = "DRAFT";
    episode.entityTags = [
      { status: "SUGGESTED" },
    ] as unknown as EpisodeWorkspaceEntity["entityTags"];

    const readiness = computeEpisodeReadiness(episode);
    const missing = readiness.items.find((item) => item.key === "THIRD_PERSON_AUDIO");

    expect(readiness.ready).toBe(false);
    expect(missing).toMatchObject({ level: "REQUIRED", state: "MISSING" });
    expect(readiness.items).toContainEqual(
      expect.objectContaining({ key: "SERIES_NOT_PUBLISHED", state: "WARN" }),
    );
    expect(readiness.items).toContainEqual(
      expect.objectContaining({ key: "ENTITY_TAGS_UNCONFIRMED", state: "WARN" }),
    );
  });

  it("accepts legacy partial entity fixtures with omitted collections as empty", () => {
    const episode = {
      ...baseEpisode(),
      narrations: undefined,
      entityTags: undefined,
      attachments: undefined,
    } as unknown as EpisodeWorkspaceEntity;

    expect(computeEpisodeReadiness(episode).ready).toBe(false);
  });
});
