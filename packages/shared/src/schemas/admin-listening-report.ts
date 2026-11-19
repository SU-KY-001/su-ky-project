import { z } from "zod";

const date = z.string().date();
export const AdminListeningReportQuerySchema = z.object({
  from: date,
  to: date,
}).strict().superRefine(({ from, to }, ctx) => {
  const days = (Date.parse(to) - Date.parse(from)) / 86_400_000;
  if (days < 0 || days > 365) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["to"], message: "Chọn khoảng thời gian từ 1 đến 366 ngày." });
});

const counts = {
  uniqueListeners: z.number().int().nonnegative(),
  validListens: z.number().int().nonnegative(),
  listeningMs: z.number().nonnegative(),
};
export const AdminListeningReportSchema = z.object({
  from: date,
  to: date,
  timezone: z.literal("Asia/Ho_Chi_Minh"),
  generatedAt: z.string().datetime(),
  summary: z.object({ ...counts, completedEpisodes: z.number().int().nonnegative() }),
  daily: z.array(z.object({ date, ...counts })),
  weekly: z.array(z.object({ date, ...counts })).optional(),
  monthly: z.array(z.object({ date, ...counts })).optional(),
  topEpisodes: z.array(z.object({
    episodeId: z.string().uuid(),
    title: z.string(),
    seriesTitle: z.string(),
    ...counts,
  })),
});
export type AdminListeningReportQuery = z.infer<typeof AdminListeningReportQuerySchema>;
export type AdminListeningReport = z.infer<typeof AdminListeningReportSchema>;
