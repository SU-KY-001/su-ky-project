import { afterAll, expect, mock, test } from "bun:test";
import type { ListeningRepository } from "../src/modules/listening/domain/listening.repository";
import type { MediaStorageGateway } from "../src/modules/media";

mock.module("../src/core/config/system-config", () => ({ getSystemConfig: async () => 1_000 }));
mock.module("../src/modules/membership/application/entitlement", () => ({
  hasActiveMembership: async () => false,
  pendingOrderId: async () => null,
}));
mock.module("../src/modules/listening/application/daily-quota", () => ({
  reserveDailyPlay: async () => ({ outcome: "allowed", limit: 4 }),
  getDailyQuotaStatus: async () => ({ enforced: true, limit: 4, usedToday: 1, remaining: 3, resetsAt: new Date() }),
}));
const { ListeningService } = await import("../src/modules/listening/application/listening.service");

afterAll(() => mock.restore());

const audioAsset = {
  id: "asset-1", kind: "AUDIO" as const, publicId: "audio/one", status: "READY" as const,
  version: 1n, format: "mp3", sizeBytes: 100n, durationMs: 60_000, uploadedById: "u",
  createdAt: new Date(), verifiedAt: new Date(), detachedAt: null, deletedAt: null,
};

function narration(overrides: Record<string, unknown> = {}) {
  return {
    id: "narration-1", episodeId: "episode-1", narrationType: "THIRD_PERSON" as const,
    narratorEntityId: null, scriptContent: "Kịch bản trả tiền", audioAssetId: "asset-1",
    scriptUpdatedAt: null, audioAttachedAt: null, createdAt: new Date(), updatedAt: new Date(),
    audioAsset, isPremium: true, ...overrides,
  };
}

function repoWith(row: unknown) {
  return {
    findPublicNarration: async () => row,
    findProgress: async () => null,
  } as unknown as ListeningRepository;
}

const storage = {
  deliveryUrl: () => "https://cdn.invalid/free.mp3",
  audioDeliveryUrl: () => "https://cdn.invalid/signed.mp3",
} as unknown as MediaStorageGateway;

test("anonymous listeners cannot play anything", async () => {
  const service = new ListeningService(repoWith(narration({ isPremium: false })), storage);
  await expect(service.playback("narration-1", null, null)).rejects.toMatchObject({ status: 401, code: "AUTH_REQUIRED" });
});

test("legacy episode labels do not block a free listener admitted under the feature policy", async () => {
  const service = new ListeningService(repoWith(narration()), storage);
  expect((await service.playback("narration-1", "user-1", null)).audio.url).toBe("https://cdn.invalid/signed.mp3");
});

test("moderators review premium audio without a membership", async () => {
  const service = new ListeningService(repoWith(narration()), storage);
  const result = await service.playback("narration-1", "mod-1", "moderator");
  expect(result.audio.url).toBe("https://cdn.invalid/signed.mp3");
});

test("free audio is delivered through the expiring URL", async () => {
  const service = new ListeningService(repoWith(narration({ isPremium: false })), storage);
  const result = await service.playback("narration-1", "user-1", null);
  expect(result.audio.url).toBe("https://cdn.invalid/signed.mp3");
});

test("progress sync validates the audio version independently of legacy labels", async () => {
  const service = new ListeningService(repoWith(narration()), storage);
  await expect(
    service.updateProgress("narration-1", "user-1", { assetId: "old-asset", positionMs: 1000, playedBitmap: "" } as never, null),
  ).rejects.toMatchObject({ status: 409, code: "AUDIO_CHANGED" });
});

test("public episode detail does not hide content using legacy labels", async () => {
  const episode = {
    id: "episode-1", slug: "tap-1", title: "Tập 1", description: null, publishedAt: null,
    isPremium: true, publicationApproval: null, entityTags: [], quiz: null,
    series: { id: "series-1", slug: "series-1", title: "Series", isPremium: false, episodes: [], sources: [], coverImageAsset: null, coverLandscapeAsset: null },
    narrations: [{ id: "narration-1", narrationType: "THIRD_PERSON", narratorEntity: null, audioAsset, scriptContent: "Kịch bản trả tiền" }],
  };
  const repo = { findPublicEpisodeBySlug: async () => episode } as unknown as ListeningRepository;
  const result = await new ListeningService(repo, {} as MediaStorageGateway).getEpisodeDetail("tap-1", null);
  expect(result.locked).toBe(false);
  expect(result.narrations[0]?.scriptContent).toBe("Kịch bản trả tiền");
});
