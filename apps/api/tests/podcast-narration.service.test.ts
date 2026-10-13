import { describe, expect, it } from "bun:test";
import type { AudioAnalysis, EditorDocument } from "@repo/shared";
import type { Session } from "../src/modules/auth";
import { ContentService } from "../src/modules/content/application/content.service";
import type {
  AttachAudioInput,
  EpisodeRepository,
  SeriesRepository,
  UpsertNarrationInput,
} from "../src/modules/content/domain/content.repository";
import type {
  EpisodeNarrationDetailEntity,
  MediaAssetEntity,
} from "../src/modules/content/domain/content.entity";

const ownerId = "moderator-1";
const episodeId = "2cf835c7-4240-461b-804e-f8786a0031b7";
const narrationId = "53916665-5d50-4fc6-af1a-6ad383e17ca0";
const audioId = "eaa81e16-07c5-4d8d-86ff-904b03bccb58";

const session = {
  user: { id: ownerId, role: "moderator" },
  session: {},
} as unknown as Session;

const document: EditorDocument = {
  type: "doc",
  content: [
    {
      type: "heading",
      attrs: { level: 2 },
      content: [{ type: "text", text: "Mở đầu" }],
    },
    {
      type: "paragraph",
      content: [{ type: "text", text: "Năm 938 trên sông Bạch Đằng." }],
    },
  ],
};

const analysis: AudioAnalysis = {
  clientDurationMs: 42_000,
  estimatedScriptDurationMs: 40_000,
  durationRatio: 1.05,
  noiseLevelDb: -48,
  formatStatus: "PASS",
  durationStatus: "PASS",
  noiseStatus: "PASS",
  checkedAt: "2026-10-13T03:00:00.000Z",
};

function createHarness(maxChars = 60_000, allowedSourceIds: string[] = []) {
  let upsertInput: UpsertNarrationInput | null = null;
  let attachInput: AttachAudioInput | null = null;
  const audioAsset = {
    id: audioId,
    kind: "AUDIO",
    publicId: "podcast/audio.mp3",
    status: "READY",
    version: 1n,
    format: "mp3",
    sizeBytes: 2048n,
    durationMs: 42_000,
    uploadedById: ownerId,
    createdAt: new Date(),
    verifiedAt: new Date(),
    detachedAt: null,
    deletedAt: null,
  } satisfies MediaAssetEntity;
  const baseNarration = {
    id: narrationId,
    episodeId,
    narrationType: "THIRD_PERSON",
    narratorEntityId: null,
    scriptContent: null,
    scriptDocument: null,
    audioAnalysis: null,
    audioAssetId: null,
    scriptUpdatedAt: null,
    audioAttachedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    narratorEntity: null,
    audioAsset: null,
  } satisfies EpisodeNarrationDetailEntity;
  const seriesRepository = {
    findMediaAsset: async () => audioAsset,
    listSeriesSourceIds: async () => allowedSourceIds,
  } as unknown as SeriesRepository;
  const episodeRepository = {
    findEpisodeWithSeries: async () => ({
      id: episodeId,
      seriesId: "6e3f5047-425c-41b2-8bfd-2c95adfe46ef",
      status: "DRAFT",
      deletedAt: null,
      adminLockedAt: null,
      series: {
        ownerId,
        deletedAt: null,
        adminLockedAt: null,
      },
    }),
    findNarrationByType: async () => baseNarration,
    findNarrationUsingAsset: async () => null,
    upsertNarration: async (input: UpsertNarrationInput) => {
      upsertInput = input;
      return {
        ...baseNarration,
        scriptContent: input.scriptContent ?? null,
        scriptDocument: input.scriptDocument ?? null,
      };
    },
    attachAudio: async (_id: string, input: AttachAudioInput) => {
      attachInput = input;
      return {
        ...baseNarration,
        audioAssetId: input.assetId,
        audioAsset,
        audioAnalysis: input.analysis ?? null,
      };
    },
  } as unknown as EpisodeRepository;
  const config = {
    get: async (key: string) => {
      if (key === "script.max_chars") return maxChars;
      throw new Error(`Unexpected config key: ${key}`);
    },
  };

  return {
    service: new ContentService(seriesRepository, episodeRepository, config),
    upsertInput: () => upsertInput,
    attachInput: () => attachInput,
  };
}

describe("rich narration persistence", () => {
  it("derives authoritative plain text and persists the editor document", async () => {
    const harness = createHarness();

    const saved = await harness.service.putNarration(
      session,
      episodeId,
      "THIRD_PERSON",
      { scriptDocument: document },
    );

    expect(saved.scriptContent).toBe("Mở đầu\nNăm 938 trên sông Bạch Đằng.");
    expect(saved.scriptDocument).toEqual(document);
    expect(harness.upsertInput()).toMatchObject({
      scriptContent: "Mở đầu\nNăm 938 trên sông Bạch Đằng.",
      scriptDocument: document,
    });
  });

  it("rejects unsupported editor content and derived text above the configured limit", async () => {
    const unsupported = {
      type: "doc",
      content: [{ type: "rawHtml", attrs: { html: "<b>unsafe</b>" } }],
    };
    await expect(
      createHarness().service.putNarration(session, episodeId, "THIRD_PERSON", {
        scriptDocument: unsupported,
      } as unknown as { scriptDocument: EditorDocument }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await expect(
      createHarness(4).service.putNarration(session, episodeId, "THIRD_PERSON", {
        scriptDocument: document,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
  });

  it("persists browser audio analysis in the same attach operation", async () => {
    const harness = createHarness();

    const saved = await harness.service.attachAudio(
      session,
      episodeId,
      "THIRD_PERSON",
      { assetId: audioId, analysis },
    );

    expect(saved.audioAnalysis).toEqual(analysis);
    expect(harness.attachInput()).toMatchObject({ analysis });
  });

  it("clears stale rich JSON when a legacy plain-text edit is saved", async () => {
    const harness = createHarness();

    await harness.service.putNarration(session, episodeId, "THIRD_PERSON", {
      scriptContent: "Kịch bản văn bản thuần mới",
    });

    expect(harness.upsertInput()).toMatchObject({
      scriptContent: "Kịch bản văn bản thuần mới",
      scriptDocument: null,
    });
  });

  it("rejects a citation that is not attached to the selected series", async () => {
    const citedDocument: EditorDocument = {
      type: "doc",
      content: [
        {
          type: "paragraph",
          content: [
            {
              type: "text",
              text: "Thông tin có nguồn",
              marks: [
                {
                  type: "sourceCitation",
                  attrs: { sourceId: "25289908-06c8-4f12-a6d8-cc194cd260aa" },
                },
              ],
            },
          ],
        },
      ],
    };

    await expect(
      createHarness().service.putNarration(session, episodeId, "THIRD_PERSON", {
        scriptDocument: citedDocument,
      }),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });

    await expect(
      createHarness(60_000, ["25289908-06c8-4f12-a6d8-cc194cd260aa"]).service.putNarration(
        session,
        episodeId,
        "THIRD_PERSON",
        { scriptDocument: citedDocument },
      ),
    ).resolves.toMatchObject({ scriptContent: "Thông tin có nguồn" });
  });
});
