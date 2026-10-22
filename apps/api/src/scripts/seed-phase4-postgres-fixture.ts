import { v2 as cloudinary } from "cloudinary";
import { prisma } from "@repo/db";
import { env } from "../core/env";

const MODERATOR_EMAIL = "mod@suky.local";
const SERIES_SLUG = "phase4-toan-thu-postgres-fixture";
const SOURCE_URL = "https://vi.wikipedia.org/wiki/%C4%90%E1%BA%A1i_Vi%E1%BB%87t_s%E1%BB%AD_k%C3%BD_to%C3%A0n_th%C6%B0";
const SCRIPT_CONTENT =
  "Đức, thành Hoa Lư gọi là phủ Trường Yên, sông Hồng gọi là sông Thiên Đức.";

function pdfPath(): string {
  const index = process.argv.indexOf("--pdf");
  const value = index >= 0 ? process.argv[index + 1] : undefined;
  if (!value) throw new Error("Missing required argument: --pdf <path>");
  return value;
}

function documentPublicId(assetId: string): string {
  return `${env.CLOUDINARY_FOLDER}/document/${assetId}.pdf`;
}

async function uploadPdf(publicId: string, path: string) {
  cloudinary.config({
    cloud_name: env.CLOUDINARY_CLOUD_NAME,
    api_key: env.CLOUDINARY_API_KEY,
    api_secret: env.CLOUDINARY_API_SECRET,
    secure: true,
  });
  const result = await cloudinary.uploader.upload(path, {
    public_id: publicId,
    resource_type: "raw",
    type: "upload",
    overwrite: true,
    invalidate: true,
    unique_filename: false,
    use_filename: false,
    timeout: 120_000,
  });
  return {
    version: BigInt(result.version),
    format: result.format || "pdf",
    sizeBytes: BigInt(result.bytes),
  };
}

const moderator = await prisma.user.findUnique({ where: { email: MODERATOR_EMAIL } });
if (!moderator) throw new Error(`Moderator account not found: ${MODERATOR_EMAIL}`);

const existing = await prisma.series.findUnique({
  where: { slug: SERIES_SLUG },
  include: {
    episodes: true,
    sources: { include: { source: { include: { fileAsset: true } } } },
  },
});

let fixture: { seriesId: string; episodeId: string; sourceId: string; fileAssetId: string };

if (existing) {
  const episode = existing.episodes[0];
  const sourceLink = existing.sources[0];
  const fileAsset = sourceLink?.source.fileAsset;
  if (!episode || !sourceLink || !fileAsset) throw new Error("Existing fixture is incomplete");
  fixture = {
    seriesId: existing.id,
    episodeId: episode.id,
    sourceId: sourceLink.sourceId,
    fileAssetId: fileAsset.id,
  };
  await prisma.episodeNarration.upsert({
    where: { episodeId_narrationType: { episodeId: episode.id, narrationType: "THIRD_PERSON" } },
    create: {
      episodeId: episode.id,
      narrationType: "THIRD_PERSON",
      scriptContent: SCRIPT_CONTENT,
      scriptUpdatedAt: new Date(),
    },
    update: { scriptContent: SCRIPT_CONTENT, scriptUpdatedAt: new Date() },
  });
} else {
  const assetId = crypto.randomUUID();
  const created = await prisma.$transaction(async (tx) => {
    const fileAsset = await tx.mediaAsset.create({
      data: {
        id: assetId,
        kind: "DOCUMENT",
        publicId: documentPublicId(assetId),
        status: "PENDING",
        format: "pdf",
        uploadedById: moderator.id,
      },
    });
    const source = await tx.source.create({
      data: {
        tier: "TIER_1_CHINH_SU",
        title: "Đại Việt sử ký toàn thư — phase 4 Postgres fixture",
        originalTitle: "Đại Việt sử ký toàn thư",
        author: "Ngô Sĩ Liên",
        publisher: "Nhà xuất bản Khoa học xã hội",
        publicationYear: 1993,
        url: SOURCE_URL,
        createdById: moderator.id,
        fileAssetId: fileAsset.id,
        verificationStatus: "VERIFIED",
        verifiedVersion: 1,
        verifiedById: moderator.id,
        verifiedAt: new Date(),
        verificationNote: "Phase 4 browser fixture backed by the imported book pages.",
      },
    });
    const series = await tx.series.create({
      data: {
        ownerId: moderator.id,
        title: "Phase 4 — Đại Việt sử ký toàn thư",
        slug: SERIES_SLUG,
        description: "Fixture dùng để kiểm tra AI source review trên source_pages của Postgres.",
        status: "DRAFT",
      },
    });
    await tx.seriesSource.create({
      data: { seriesId: series.id, sourceId: source.id, locator: "", sortOrder: 0 },
    });
    const episode = await tx.episode.create({
      data: {
        seriesId: series.id,
        title: "Phase 4 — Đối chiếu Hoa Lư và sông Thiên Đức",
        slug: "phase4-doi-chieu-hoa-lu-song-thien-duc",
        sortOrder: 0,
        status: "DRAFT",
      },
    });
    await tx.episodeNarration.create({
      data: {
        episodeId: episode.id,
        narrationType: "THIRD_PERSON",
        scriptContent: SCRIPT_CONTENT,
        scriptUpdatedAt: new Date(),
      },
    });
    return {
      seriesId: series.id,
      episodeId: episode.id,
      sourceId: source.id,
      fileAssetId: fileAsset.id,
    };
  });
  fixture = created;
}

const asset = await uploadPdf(documentPublicId(fixture.fileAssetId), pdfPath());
await prisma.mediaAsset.update({
  where: { id: fixture.fileAssetId },
  data: {
    publicId: documentPublicId(fixture.fileAssetId),
    status: "READY",
    version: asset.version,
    format: asset.format,
    sizeBytes: asset.sizeBytes,
    verifiedAt: new Date(),
    deletedAt: null,
    detachedAt: null,
  },
});

console.log(
  JSON.stringify({
    ...fixture,
    publicId: documentPublicId(fixture.fileAssetId),
    uploaded: true,
  }),
);
await prisma.$disconnect();
