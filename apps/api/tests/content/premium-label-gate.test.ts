import { describe, expect, it } from "bun:test";
import { ContentService } from "../../src/modules/content/application/content.service";

const moderator = { user: { id: "mod-1", role: "moderator" } } as never;
const parent = { id: "s", ownerId: "mod-1", status: "DRAFT", deletedAt: null, adminLockedAt: null, updatedAt: new Date() };

function setup() {
  return new ContentService(
    { findSeriesById: async () => parent } as never,
    { findEpisodeWithSeries: async () => ({ id: "e", status: "DRAFT", deletedAt: null, adminLockedAt: null, series: parent }) } as never,
  );
}

describe("premium labels are admin only", () => {
  it("rejects a moderator creating a premium series", async () => {
    await expect(
      setup().createSeries(moderator, { title: "Series", isPremium: true }, null),
    ).rejects.toMatchObject({ status: 403, code: "PREMIUM_ADMIN_ONLY" });
  });

  it("rejects a moderator toggling the series label", async () => {
    await expect(
      setup().updateSeries(moderator, "s", { isPremium: true }, null),
    ).rejects.toMatchObject({ status: 403, code: "PREMIUM_ADMIN_ONLY" });
  });

  it("rejects a moderator toggling an episode label", async () => {
    await expect(
      setup().updateEpisode(moderator, "e", { isPremium: true }),
    ).rejects.toMatchObject({ status: 403, code: "PREMIUM_ADMIN_ONLY" });
  });
});
