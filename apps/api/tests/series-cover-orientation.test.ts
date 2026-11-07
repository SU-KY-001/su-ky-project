import { describe, expect, it } from "bun:test";
import type { Session } from "../src/modules/auth";
import { ContentService } from "../src/modules/content/application/content.service";
import type {
  CreateSeriesInput,
  EpisodeRepository,
  SeriesRepository,
} from "../src/modules/content/domain/content.repository";
import type { MediaAssetEntity } from "../src/modules/content/domain/content.entity";

const ownerId = "moderator-1";
const seriesId = "6e3f5047-425c-41b2-8bfd-2c95adfe46ef";
const portraitId = "eaa81e16-07c5-4d8d-86ff-904b03bccb58";
const landscapeId = "2cf835c7-4240-461b-804e-f8786a0031b7";

const session = {
  user: { id: ownerId, role: "moderator" },
  session: {},
} as unknown as Session;

function image(
  id: string,
  widthPx: number | null,
  heightPx: number | null,
): MediaAssetEntity {
  return {
    id,
    kind: "IMAGE",
    publicId: `su-ky/image/${id}`,
    status: "READY",
    version: 1n,
    format: "jpg",
    sizeBytes: 1000n,
    durationMs: null,
    widthPx,
    heightPx,
    uploadedById: ownerId,
    createdAt: new Date(),
    verifiedAt: new Date(),
    detachedAt: null,
    deletedAt: null,
  };
}

function createService(assets: MediaAssetEntity[]) {
  let created: CreateSeriesInput | null = null;
  const series = {
    findMediaAsset: async (id: string) =>
      assets.find((asset) => asset.id === id) ?? null,
    createSeries: async (input: CreateSeriesInput) => {
      created = input;
      return { id: seriesId };
    },
    getSeriesDetail: async () => ({ id: seriesId }),
  } as unknown as SeriesRepository;
  const config = { get: async () => 0 };
  return {
    service: new ContentService(series, {} as EpisodeRepository, config),
    created: () => created,
  };
}

describe("series cover orientation", () => {
  it("accepts a portrait cover and a landscape cover in their own slots", async () => {
    const { service, created } = createService([
      image(portraitId, 600, 900),
      image(landscapeId, 1600, 900),
    ]);
    await service.createSeries(
      session,
      {
        title: "Bạch Đằng",
        coverImageAssetId: portraitId,
        coverLandscapeAssetId: landscapeId,
      },
      null,
    );
    expect(created()).toMatchObject({
      coverImageAssetId: portraitId,
      coverLandscapeAssetId: landscapeId,
    });
  });

  it("rejects a landscape image in the portrait slot and vice versa", async () => {
    const { service } = createService([
      image(portraitId, 600, 900),
      image(landscapeId, 1600, 900),
    ]);
    await expect(
      service.createSeries(
        session,
        { title: "A", coverImageAssetId: landscapeId },
        null,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 422 });
    await expect(
      service.createSeries(
        session,
        { title: "A", coverLandscapeAssetId: portraitId },
        null,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR", status: 422 });
  });

  it("rejects square images and tolerates assets verified before dimensions were stored", async () => {
    const squareId = "11111111-1111-4111-8111-111111111111";
    const legacyId = "22222222-2222-4222-8222-222222222222";
    const { service } = createService([
      image(squareId, 800, 800),
      image(legacyId, null, null),
    ]);
    await expect(
      service.createSeries(
        session,
        { title: "A", coverLandscapeAssetId: squareId },
        null,
      ),
    ).rejects.toMatchObject({ code: "VALIDATION_ERROR" });
    await service.createSeries(
      session,
      { title: "A", coverLandscapeAssetId: legacyId },
      null,
    );
  });
});
