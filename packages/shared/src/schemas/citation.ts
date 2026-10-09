import { z } from "zod";

export const CitationSchema = z.object({
  id: z.string().uuid().optional(),
  episodeId: z.string().uuid(),
  bookTitle: z.string().min(1, "Book title is required"), // e.g. "Đại Việt Sử Ký Toàn Thư"
  volume: z.string().default(""), // e.g. "Quyển V"
  chapter: z.string().default(""), // e.g. "Kỷ Nhà Trần"
  passage: z.string().default(""),
  quote: z.string().default(""),
});

export type CitationDto = z.infer<typeof CitationSchema>;
