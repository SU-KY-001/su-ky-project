import { z } from "zod";

export const TopQuizzesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).max(1000000).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(4),
}).strict();
export const TopQuizItemSchema = z.object({
  quizId: z.string().uuid(), title: z.string(),
  episodeId: z.string().uuid(), episodeSlug: z.string(), episodeTitle: z.string(),
  seriesTitle: z.string(), seriesSlug: z.string(),
  attemptCount: z.number().int().positive(), lastSubmittedAt: z.coerce.date(), available: z.boolean(),
});
export const TopQuizzesResponseSchema = z.object({
  items: z.array(TopQuizItemSchema), page: z.number().int().positive(),
  limit: z.number().int().positive(), total: z.number().int().nonnegative(),
});
export type TopQuizzesQuery = z.infer<typeof TopQuizzesQuerySchema>;
export type TopQuizItem = z.infer<typeof TopQuizItemSchema>;
export type TopQuizzesResponse = z.infer<typeof TopQuizzesResponseSchema>;
