import { expect, test } from "bun:test";
import { ListeningService } from "../src/modules/listening/application/listening.service";
import type { ListeningRepository } from "../src/modules/listening/domain/listening.repository";
import type { MediaStorageGateway } from "../src/modules/media";

test("public episode exposes scripts only for ready audio", async () => {
  const episode = {
    id: "episode", slug: "episode", title: "Tập", description: null, publishedAt: null,
    publicationApproval: null, entityTags: [], quiz: null,
    series: { id: "series", slug: "series", title: "Series", episodes: [], sources: [], coverImageAsset: null, coverLandscapeAsset: null },
    narrations: [
      { id: "ready", narrationType: "THIRD_PERSON", narratorEntity: null, audioAsset: { status: "READY", durationMs: 1000 }, scriptContent: "Nội dung công khai" },
      { id: "pending", narrationType: "FIRST_PERSON", narratorEntity: null, audioAsset: { status: "PENDING" }, scriptContent: "Chưa công khai" },
    ],
  };
  const repo = { findPublicEpisodeBySlug: async () => episode } as unknown as ListeningRepository;
  const result = await new ListeningService(repo, {} as MediaStorageGateway).getEpisodeDetail("episode", null);
  expect(result.narrations.map((item) => item.scriptContent)).toEqual(["Nội dung công khai", null]);
});

test("an unavailable public episode does not expose a script", async () => {
  const repo = { findPublicEpisodeBySlug: async () => null } as unknown as ListeningRepository;
  await expect(new ListeningService(repo, {} as MediaStorageGateway).getEpisodeDetail("draft", null)).rejects.toMatchObject({ status: 404 });
});
