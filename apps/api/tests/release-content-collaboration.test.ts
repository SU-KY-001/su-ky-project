import { describe, expect, it } from "bun:test";
import { ContentService } from "../src/modules/content/application/content.service";
import type { Session } from "../src/modules/auth";

const session = { user: { id: "moderator-2", role: "moderator" } } as Session;
const series = {
  id: "series-1",
  ownerId: "moderator-1",
  deletedAt: null,
  adminLockedAt: null,
};
const episode = {
  id: "episode-1",
  series,
  deletedAt: null,
  adminLockedAt: null,
};

describe("release content collaboration", () => {
  it("allows an actively assigned moderator to read the linked series and episode", async () => {
    const seriesRepository = {
      findSeriesById: async () => series,
      isActiveReleaseCollaboratorForSeries: async () => true,
      isActiveReleaseCollaboratorForEpisode: async () => true,
    };
    const episodeRepository = { findEpisodeWithSeries: async () => episode };
    const service = new ContentService(seriesRepository as never, episodeRepository as never);

    expect((await service.loadSeriesForRead(session, "series-1")).id).toBe("series-1");
    expect((await service.loadEpisodeForRead(session, "episode-1")).id).toBe("episode-1");
  });

  it("shows a collaborator only the episodes they are assigned to, the owner all of them", async () => {
    const detail = { ...series, episodes: [{ id: "episode-1" }, { id: "episode-2" }] };
    const seriesRepository = {
      findSeriesById: async () => series,
      isActiveReleaseCollaboratorForSeries: async () => true,
      getSeriesDetail: async () => detail,
      listActiveCollaboratorEpisodeIds: async () => ["episode-1"],
    };
    const service = new ContentService(seriesRepository as never, {} as never);
    const owner = { user: { id: "moderator-1", role: "moderator" } } as Session;

    expect((await service.getSeriesDetailForRead(session, "series-1")).episodes.map((e) => e.id)).toEqual(["episode-1"]);
    expect((await service.getSeriesDetailForRead(owner, "series-1")).episodes).toHaveLength(2);
  });
});
