import { z } from "zod";
import { exhibitionTemplate } from "../exhibition-template";

const uuid = z.string().uuid();
const text = z.string().trim();
const metadata = z.object({ title: text.min(1).max(255), subtitle: text.max(255), description: text.max(2000), coverAssetId: uuid.nullable() });
const chapter = z.object({ id: uuid, roomKey: z.enum(["room-1", "room-2", "room-3"]), title: text.min(1).max(255), period: text.max(255), description: text.max(2000) });
const item = z.object({
  id: uuid, chapterId: uuid, imageAssetId: uuid, title: text.min(1).max(255),
  description: text.max(2000), displayDate: text.max(255), credit: text.max(500),
  sourceUrl: text.max(2048).refine(value => value === "" || /^https?:\/\//i.test(value) && z.string().url().safeParse(value).success),
  rights: text.max(2000), narrationId: uuid.nullable(),
  placement: z.object({ wallId: text.min(1), offset: z.number().finite().nonnegative(), width: z.number().finite().positive().max(20), widthMode: z.literal("actual").optional() }),
});

export const ExhibitionDocumentSchema = z.object({
  schemaVersion: z.literal(1), templateId: z.literal("gallery-1975-v1"), templateVersion: z.literal(1),
  metadata,
  chapters: z.array(chapter).length(3), items: z.array(item).max(100),
}).superRefine((document, ctx) => {
  if (new Set(document.chapters.map(value => value.id)).size !== 3 || new Set(document.chapters.map(value => value.roomKey)).size !== 3)
    ctx.addIssue({ code: "custom", message: "Chương và phòng phải duy nhất", path: ["chapters"] });
  if (new Set(document.items.map(value => value.id)).size !== document.items.length)
    ctx.addIssue({ code: "custom", message: "Điểm trưng bày phải có ID duy nhất", path: ["items"] });
  document.items.forEach((value, index) => {
    const room = document.chapters.find(entry => entry.id === value.chapterId)?.roomKey;
    const wall = exhibitionTemplate.walls.find(entry => entry.id === value.placement.wallId);
    if (!room || !wall || wall.roomKey !== room)
      ctx.addIssue({ code: "custom", message: "Tường không thuộc chương", path: ["items", index, "placement", "wallId"] });
  });
});
export const CreateExhibitionSchema = z.object({ document: ExhibitionDocumentSchema });
export const SaveExhibitionDraftSchema = z.object({ baseRevision: z.number().int().positive(), document: ExhibitionDocumentSchema });
export const PublishExhibitionSchema = z.object({ baseRevision: z.number().int().positive() });
export const ExhibitionListQuerySchema = z.object({ q: text.max(255).default(""), status: z.enum(["all", "published", "unpublished"]).default("all"), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(10) });
export const ExhibitionPodcastQuerySchema = z.object({ q: text.max(255).default(""), seriesId: uuid.optional(), page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(50).default(10) });
export const ExhibitionPodcastOptionSchema = z.object({ id: uuid, episodeId: uuid, episodeTitle: z.string(), seriesId: uuid, seriesTitle: z.string(), narrationLabel: z.string() });
export type ExhibitionPodcastOption = z.infer<typeof ExhibitionPodcastOptionSchema>;
export type ExhibitionPodcastQuery = z.infer<typeof ExhibitionPodcastQuerySchema>;
export const ExhibitionSummarySchema = z.object({ id: uuid, title: z.string(), slug: z.string(), chapterCount: z.number().int().nonnegative(), itemCount: z.number().int().nonnegative(), podcastCount: z.number().int().nonnegative(), publicationStatus: z.enum(["UNPUBLISHED", "PUBLISHED"]), revision: z.number().int().positive(), updatedAt: z.string().datetime() });
const resolvedItem = item.extend({ image: z.object({ url: z.string().url(), width: z.number().positive(), height: z.number().positive() }), narration: z.object({ id: uuid, episodeTitle: z.string(), seriesTitle: z.string(), narrationLabel: z.string(), available: z.boolean() }).nullable() });
export const ResolvedExhibitionSchema = z.object({ metadata, chapters: z.array(chapter).length(3), items: z.array(resolvedItem) });
export const ExhibitionWorkspaceSchema = z.object({ id: uuid, slug: z.string(), revision: z.number().int().positive(), updatedAt: z.string().datetime(), publicationStatus: z.enum(["UNPUBLISHED", "PUBLISHED"]), publishedRevision: z.number().int().positive().nullable(), document: ExhibitionDocumentSchema, resolved: ResolvedExhibitionSchema, allowedActions: z.array(z.enum(["edit", "publish"])) });
export type ExhibitionDocument = z.infer<typeof ExhibitionDocumentSchema>;
export type ExhibitionWorkspace = z.infer<typeof ExhibitionWorkspaceSchema>;
export type ExhibitionSummary = z.infer<typeof ExhibitionSummarySchema>;
export type ResolvedExhibition = z.infer<typeof ResolvedExhibitionSchema>;
