import { describe, expect, it } from "bun:test";
import { ContentService } from "../../src/modules/content/application/content.service";

const series = { id: "s1", ownerId: "owner", deletedAt: null, adminLockedAt: null };

function build(collaborator: boolean) {
  let appended = 0;
  const service = new ContentService(
    { findSeriesById: async () => series, isActiveReleaseCollaboratorForSeries: async () => collaborator } as never,
    { appendEpisodes: async () => { appended += 1; return [{ episodeId: "e1" }]; }, getEpisodeWorkspace: async () => ({ id: "e1" }) } as never,
  );
  return { service, appended: () => appended };
}

const session = (id: string, role: string) => ({ user: { id, role } }) as never;

describe("appendEpisode access", () => {
  it("rejects a release collaborator: they can read the series but could not open the episode they create", async () => {
    const { service, appended } = build(true);
    await expect(service.appendEpisode(session("collab", "moderator"), "s1", { title: "T" } as never)).rejects.toMatchObject({ status: 403 });
    expect(appended()).toBe(0);
  });

  it("allows the owner", async () => {
    const { service, appended } = build(false);
    await service.appendEpisode(session("owner", "moderator"), "s1", { title: "T" } as never);
    expect(appended()).toBe(1);
  });
});
