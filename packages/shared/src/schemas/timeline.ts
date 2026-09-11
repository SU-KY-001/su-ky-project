import { z } from "zod";

export const PeriodSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Period name is required"),
  slug: z.string().min(1, "Slug is required"),
  startYear: z.number().int(),
  endYear: z.number().int().nullable().optional(),
  description: z.string().default(""),
  orderIndex: z.number().int().default(0),
});

export const CreatePeriodSchema = PeriodSchema.omit({ id: true });
export type PeriodDto = z.infer<typeof PeriodSchema>;
export type CreatePeriodDto = z.infer<typeof CreatePeriodSchema>;
