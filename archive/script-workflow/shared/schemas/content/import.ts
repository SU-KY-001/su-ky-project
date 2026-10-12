import { z } from "zod";

const basis = z.object({ factCheckerVersionId: z.number().int().positive() });
const sourceDecision = z.discriminatedUnion("action", [
  z.object({ itemId: z.string(), action: z.literal("USE_EXISTING"), sourceId: z.string().uuid() }),
  z.object({ itemId: z.string(), action: z.literal("CREATE"), overrides: z.object({ title: z.string().trim().min(1).optional(), author: z.string().trim().optional(), url: z.string().url().optional() }).optional() }),
  z.object({ itemId: z.string(), action: z.literal("DROP") }),
]);
const entityDecision = z.discriminatedUnion("action", [
  z.object({ itemKey: z.string(), action: z.literal("USE_EXISTING"), entityId: z.string().uuid(), confirm: z.boolean().default(false) }),
  z.object({ itemKey: z.string(), action: z.literal("CREATE"), confirm: z.boolean().default(false) }),
  z.object({ itemKey: z.string(), action: z.literal("DROP"), confirm: z.boolean().default(false) }),
]);
export const ImportRequestSchema = z.object({ basis, approvalNote: z.string().trim().max(2000).optional(), sourceDecisions: z.array(sourceDecision), entityDecisions: z.array(entityDecision).default([]) });
export const ImportPreviewSchema = z.object({ target: z.unknown(), factCheck: z.unknown(), basis, episodes: z.array(z.unknown()), sources: z.array(z.unknown()), entities: z.array(z.unknown()) });
export const ImportResultSchema = z.object({ seriesId: z.string().uuid(), createdSeries: z.boolean(), episodes: z.array(z.object({ episodeNo: z.number().int(), episodeId: z.string().uuid(), narrationId: z.string().uuid(), title: z.string() })), createdSourceIds: z.array(z.string().uuid()), createdEntityIds: z.array(z.string().uuid()), importedAt: z.string() });
export type ImportRequest = z.infer<typeof ImportRequestSchema>;
export type ImportResult = z.infer<typeof ImportResultSchema>;
