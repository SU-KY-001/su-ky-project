import { z } from "zod";
import { HistoricalYearSchema } from "./common";
import {
  compareHistoricalDates,
  daysInHistoricalMonth,
} from "../historical-time";

export const HistoricalDateSchema = z
  .object({
    year: HistoricalYearSchema,
    precision: z.enum(["YEAR", "MONTH", "DAY"]),
    month: z.number().int().min(1).max(12).optional(),
    day: z.number().int().min(1).max(31).optional(),
    approximate: z.boolean().default(false),
  })
  .strict()
  .superRefine((value, ctx) => {
    const valid =
      value.precision === "YEAR"
        ? value.month === undefined && value.day === undefined
        : value.precision === "MONTH"
          ? value.month !== undefined && value.day === undefined
          : value.month !== undefined &&
            value.day !== undefined &&
            value.day <= daysInHistoricalMonth(value.year, value.month);
    if (!valid)
      ctx.addIssue({
        code: "custom",
        message: "Ngày tháng không phù hợp với độ chính xác đã chọn",
      });
  });
const note = z.string().trim().max(2000).optional();
export const HistoricalTimeSchema = z
  .discriminatedUnion("kind", [
    z
      .object({ kind: z.literal("POINT"), at: HistoricalDateSchema, note })
      .strict(),
    z
      .object({
        kind: z.literal("RANGE"),
        start: HistoricalDateSchema.nullable(),
        end: HistoricalDateSchema.nullable(),
        endState: z.enum(["KNOWN", "ONGOING", "UNKNOWN"]),
        note,
      })
      .strict(),
    z
      .object({
        kind: z.literal("UNKNOWN"),
        note: z.string().trim().min(1).max(2000),
      })
      .strict(),
  ])
  .superRefine((value, ctx) => {
    if (value.kind !== "RANGE") return;
    if ((value.endState === "KNOWN") !== (value.end !== null))
      ctx.addIssue({
        code: "custom",
        path: ["end"],
        message: "Trạng thái kết thúc không khớp mốc thời gian",
      });
    if (
      value.start &&
      value.end &&
      compareHistoricalDates(value.start, value.end) === 1
    )
      ctx.addIssue({
        code: "custom",
        path: ["end"],
        message: "Mốc kết thúc phải sau mốc bắt đầu",
      });
  });
export type HistoricalDateDto = z.infer<typeof HistoricalDateSchema>;
export type HistoricalTimeDto = z.infer<typeof HistoricalTimeSchema>;
