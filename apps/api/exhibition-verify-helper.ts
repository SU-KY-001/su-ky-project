import { prisma } from "@repo/db";
import { ExhibitionDocumentSchema, validateExhibitionPlacements } from "@repo/shared";
const id = "1b30f1a0-787f-4962-9e83-37ecfc31c668";
const row = await prisma.exhibition.findUniqueOrThrow({ where: { id } });
const document = ExhibitionDocumentSchema.parse(row.draftDocument);
const assets = await prisma.mediaAsset.findMany({ where: { id: { in: document.items.map(item => item.imageAssetId) } }, select: { id: true, status: true, uploadedById: true, widthPx: true, heightPx: true } });
const sizes = Object.fromEntries(assets.filter(a => a.widthPx && a.heightPx).map(a => [a.id, { width: a.widthPx!, height: a.heightPx! }]));
console.log(JSON.stringify({ id: row.id, owner: row.ownerId, title: document.metadata.title, revision: row.draftRevision, published: row.publishedRevision !== null, chapters: document.chapters.map(c => ({ title: c.title, count: document.items.filter(i => i.chapterId === c.id).length })), items: document.items.map(i => ({ title: i.title, asset: i.imageAssetId })), audio: document.audioAssetId ?? null, verifiedImages: assets.filter(a => a.status === "READY" && a.uploadedById === row.ownerId).length, placementErrors: validateExhibitionPlacements(document, sizes) }, null, 2));
await prisma.$disconnect();
