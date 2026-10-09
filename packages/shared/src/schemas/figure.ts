import { z } from "zod";

export const FigureSchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1, "Name is required"),
  dynasty: z.string().min(1, "Dynasty is required"),
  birthYear: z.number().int().nullable().optional(),
  deathYear: z.number().int().nullable().optional(),
  biography: z.string().default(""),
  avatarUrl: z.string().default(""),
});

export type FigureDto = z.infer<typeof FigureSchema>;
