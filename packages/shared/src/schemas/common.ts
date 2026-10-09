import { z } from "zod";

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const paginatedSchema = <T extends z.ZodTypeAny>(item: T) =>
  z.object({
    items: z.array(item),
    page: z.number().int().min(1),
    limit: z.number().int().min(1),
    total: z.number().int().nonnegative(),
  });

export const UuidParamSchema = z.object({ id: z.string().uuid() });
export const HistoricalYearSchema = z.number().int().max(1945).refine((year) => year !== 0, {
  message: "Year zero is not valid",
});
export const ContentStatusSchema = z.enum(["DRAFT", "PUBLISHED", "HIDDEN"]);
