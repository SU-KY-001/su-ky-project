import { describe, expect, it } from "bun:test";
import { ContentService } from "../../src/modules/content/application/content.service";

const user = (id: string) => ({ user: { id, role: "moderator" } }) as never;
const series = { id: "s", ownerId: "owner", status: "DRAFT", deletedAt: null, adminLockedAt: null };
function setup(seriesStatus = "DRAFT", episodeStatus = "DRAFT") {
  const calls: string[] = [];
  const parent = { ...series, status: seriesStatus };
  const service = new ContentService({
    findSeriesById: async () => parent,
    isActiveReleaseCollaboratorForSeries: async () => true,
    isActiveReleaseCollaboratorForEpisode: async () => true,
    trashSeries: async () => { calls.push("series"); },
  } as never, {
    findEpisodeWithSeries: async () => ({ id: "e", status: episodeStatus, deletedAt: null, adminLockedAt: null, series: parent }),
    trashEpisode: async () => { calls.push("episode"); },
  } as never);
  return { service, calls };
}

describe("moderator draft deletion", () => {
  it("allows the owner to trash drafts", async () => {
    const { service, calls } = setup();
    await service.deleteSeries(user("owner"), "s");
    await service.deleteEpisode(user("owner"), "e");
    expect(calls).toEqual(["series", "episode"]);
  });
  it("rejects collaborators and non-drafts", async () => {
    const collaborator = setup();
    await expect(collaborator.service.deleteSeries(user("other"), "s")).rejects.toMatchObject({ status: 403 });
    await expect(collaborator.service.deleteEpisode(user("other"), "e")).rejects.toMatchObject({ status: 403 });
    await expect(setup("PUBLISHED").service.deleteSeries(user("owner"), "s")).rejects.toMatchObject({ status: 409 });
    await expect(setup("DRAFT", "PUBLISHED").service.deleteEpisode(user("owner"), "e")).rejects.toMatchObject({ status: 409 });
    expect(collaborator.calls).toEqual([]);
  });
});
