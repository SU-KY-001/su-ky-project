import { describe, expect, it } from "bun:test";
import type { Session } from "../src/modules/auth";
import { ContentService } from "../src/modules/content/application/content.service";
import type {
  EpisodeRepository,
  SeriesRepository,
} from "../src/modules/content/domain/content.repository";
import type {
  EpisodeAttachmentEntity,
  MediaAssetEntity,
} from "../src/modules/content/domain/content.entity";
import { detachedMediaWhere } from "../src/core/jobs/maintenance-jobs";

const ownerId = "moderator-1";
const episodeId = "2cf835c7-4240-461b-804e-f8786a0031b7";
const assetId = "eaa81e16-07c5-4d8d-86ff-904b03bccb58";

const session = {
  user: { id: ownerId, role: "moderator" },
  session: {},
} as unknown as Session;

function media(overrides: Partial<MediaAssetEntity> = {}): MediaAssetEntity {
  return {
    id: assetId,
    kind: "DOCUMENT",
    publicId: "podcast-documents/reference.pdf",
    status: "READY",
    version: 1n,
    format: "pdf",
    sizeBytes: 1200n,
    durationMs: null,
    uploadedById: ownerId,
    createdAt: new Date("2026-10-13T01:00:00.000Z"),
    verifiedAt: new Date("2026-10-13T01:01:00.000Z"),
    detachedAt: null,
    deletedAt: null,
    ...overrides,
  };
}

function attachment(asset = media()): EpisodeAttachmentEntity {
  return {
    id: "12064520-9788-447f-889c-b6950d7933e4",
    episodeId,
    mediaAssetId: asset.id,
    fileName: "Tư liệu Bạch Đằng.pdf",
    createdAt: new Date("2026-10-13T02:00:00.000Z"),
    updatedAt: new Date("2026-10-13T02:00:00.000Z"),
    mediaAsset: asset,
  };
}

function createHarness(asset = media(), duplicate = false) {
  const item = attachment(asset);
  let detachedId: string | null = null;
  const seriesRepository = {
    findMediaAsset: async () => asset,
  } as unknown as SeriesRepository;
  const episodeRepository = {
    findEpisodeWithSeries: async () => ({
      id: episodeId,
      seriesId: "6e3f5047-425c-41b2-8bfd-2c95adfe46ef",
      title: "Bạch Đằng",
      slug: "bach-dang",
      description: null,
      sortOrder: 1,
      status: "DRAFT",
      statusBeforeDelete: null,
      adminLockedAt: null,
      adminLockedById: null,
      publishedAt: null,
      deletedAt: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      series: {
        id: "6e3f5047-425c-41b2-8bfd-2c95adfe46ef",
        ownerId,
        deletedAt: null,
        adminLockedAt: null,
      },
    }),
    findEpisodeAttachmentUsingAsset: async () => (duplicate ? item : null),
    attachEpisodeDocument: async () => item,
    listEpisodeAttachments: async () => [item],
    findEpisodeAttachment: async () => item,
    detachEpisodeDocument: async (id: string) => {
      detachedId = id;
    },
  } as unknown as EpisodeRepository;

  return {
    service: new ContentService(seriesRepository, episodeRepository),
    detached: () => detachedId,
  };
}

describe("episode document attachments", () => {
  it("attaches and lists a READY document uploaded by the moderator", async () => {
    const { service } = createHarness();

    const created = await service.attachEpisodeDocument(session, episodeId, {
      assetId,
      fileName: "Tư liệu Bạch Đằng.pdf",
    });
    const listed = await service.listEpisodeDocuments(session, episodeId);

    expect(created.fileName).toBe("Tư liệu Bạch Đằng.pdf");
    expect(listed.map((item) => item.fileName)).toEqual(["Tư liệu Bạch Đằng.pdf"]);
  });

  it("rejects audio, unverified media and another moderator's document", async () => {
    const unusable = [
      media({ kind: "AUDIO" }),
      media({ status: "PENDING" }),
      media({ uploadedById: "moderator-2" }),
    ];

    for (const asset of unusable) {
      await expect(
        createHarness(asset).service.attachEpisodeDocument(session, episodeId, {
          assetId,
          fileName: "reference.pdf",
        }),
      ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    }
  });

  it("rejects attaching the same media asset twice", async () => {
    await expect(
      createHarness(media(), true).service.attachEpisodeDocument(session, episodeId, {
        assetId,
        fileName: "reference.pdf",
      }),
    ).rejects.toMatchObject({ code: "ASSET_IN_USE" });
  });

  it("detaches an attachment owned through the episode", async () => {
    const harness = createHarness();

    await harness.service.detachEpisodeDocument(
      session,
      episodeId,
      "12064520-9788-447f-889c-b6950d7933e4",
    );

    expect(harness.detached()).toBe("12064520-9788-447f-889c-b6950d7933e4");
  });

  it("excludes attached documents from detached-media cleanup candidates", () => {
    expect(detachedMediaWhere(new Date("2026-10-13T00:00:00.000Z"))).toMatchObject({
      episodeAttachment: null,
    });
  });
});
