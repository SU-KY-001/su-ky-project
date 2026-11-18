import { afterAll, expect, mock, test } from "bun:test";
import type { ListeningRepository } from "../src/modules/listening/domain/listening.repository";
import type { MediaStorageGateway } from "../src/modules/media";

let outcome: "allowed" | "already" | "limit" = "allowed";
let reserves = 0;
let member = false;

mock.module("../src/core/config/system-config", () => ({ getSystemConfig: async () => 1_000 }));
mock.module("../src/modules/membership/application/entitlement", () => ({
  hasActiveMembership: async () => member,
  pendingOrderId: async () => null,
}));
mock.module("../src/modules/listening/application/daily-quota", () => ({
  checkDailyPlay: async () => ({ outcome }),
  reserveDailyPlay: async () => {
    reserves += 1;
    return { outcome, limit: 4 };
  },
  getDailyQuotaStatus: async () => ({ enforced: true, limit: 4, usedToday: 4, remaining: 0, resetsAt: new Date() }),
}));
const { ListeningService } = await import("../src/modules/listening/application/listening.service");

afterAll(() => mock.restore());

const audioAsset = {
  id: "asset-1", kind: "AUDIO" as const, publicId: "audio/one", status: "READY" as const,
  version: 1n, format: "mp3", sizeBytes: 100n, durationMs: 60_000,
  uploadedById: "u", createdAt: new Date(), verifiedAt: new Date(), detachedAt: null, deletedAt: null,
};
const narration = {
  id: "narration-1", episodeId: "episode-1", narrationType: "THIRD_PERSON" as const,
  narratorEntityId: null, scriptContent: "Kịch bản", audioAssetId: "asset-1",
  scriptUpdatedAt: null, audioAttachedAt: null, createdAt: new Date(), updatedAt: new Date(),
  audioAsset, isPremium: false,
};
const repo = {
  findPublicNarration: async () => narration,
  findProgress: async () => null,
} as unknown as ListeningRepository;
const storage = {
  deliveryUrl: () => "https://cdn.invalid/free.mp3",
  audioDeliveryUrl: () => "https://cdn.invalid/signed.mp3",
} as unknown as MediaStorageGateway;

function reset(overrides: { outcome?: typeof outcome; member?: boolean } = {}) {
  outcome = overrides.outcome ?? "allowed";
  member = overrides.member ?? false;
  reserves = 0;
}

test("the play over the daily limit is rejected", async () => {
  reset({ outcome: "limit" });
  await expect(new ListeningService(repo, storage).confirmPlaybackStart("narration-1", "user-1", "asset-1", null)).rejects.toMatchObject({
    status: 403,
    code: "DAILY_LISTEN_LIMIT_REACHED",
  });
});

test("replaying an episode already counted today is allowed without a new slot", async () => {
  reset({ outcome: "already" });
  const result = await new ListeningService(repo, storage).confirmPlaybackStart("narration-1", "user-1", "asset-1", null);
  expect(reserves).toBe(1);
  expect(result.started).toBe(true);
});

test("premium members skip the quota", async () => {
  reset({ member: true });
  await new ListeningService(repo, storage).confirmPlaybackStart("narration-1", "user-1", "asset-1", null);
  expect(reserves).toBe(0);
});

test("loading playback metadata does not consume a listening turn", async () => {
  reset();
  await new ListeningService(repo, storage).playback("narration-1", "user-1");
  expect(reserves).toBe(0);
});

test("confirming an obsolete audio asset does not consume quota", async () => {
  reset();
  await expect(new ListeningService(repo, storage).confirmPlaybackStart("narration-1", "user-1", "old-asset")).rejects.toMatchObject({ code: "AUDIO_CHANGED" });
  expect(reserves).toBe(0);
});

test("staff skip the quota", async () => {
  reset();
  await new ListeningService(repo, storage).confirmPlaybackStart("narration-1", "mod-1", "asset-1", "moderator");
  expect(reserves).toBe(0);
});

test("a failure generating the playback URL does not consume quota", async () => {
  reset();
  const unavailable = { ...storage, audioDeliveryUrl: () => { throw new Error("Delivery unavailable"); } };
  await expect(new ListeningService(repo, unavailable).playback("narration-1", "user-1")).rejects.toThrow("Delivery unavailable");
  expect(reserves).toBe(0);
});

test("a failure generating the playback URL does not consume quota", async () => {
  reset();
  const unavailable = { ...storage, audioDeliveryUrl: () => { throw new Error("Delivery unavailable"); } };
  await expect(new ListeningService(repo, unavailable).playback("narration-1", "user-1")).rejects.toThrow("Delivery unavailable");
  expect(reserves).toBe(0);
});
