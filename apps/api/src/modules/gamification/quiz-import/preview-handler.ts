import type { Context } from "hono";
import { z } from "zod";
import { QuizImportPreviewSchema } from "@repo/shared";
import type { AppEnv } from "../../../types";
import { DomainError } from "../../../core/errors/domain-error";
import { runQuizImport } from "./runner";
export async function handleQuizImportPreview(c: Context<AppEnv>): Promise<Response> {
  let body: Record<string, string | File | (string | File)[]>;
  try { body = await c.req.parseBody({ all: true }); } catch { throw new DomainError(422, "VALIDATION_ERROR", "Không đọc được tệp tải lên. Hãy chọn một tài liệu."); }
  if (!(body.file instanceof File)) throw new DomainError(422, "VALIDATION_ERROR", "Mỗi lần chọn đúng một tài liệu để đọc.");
  const time = z.coerce.number().int().min(10).max(120).safeParse(body.defaultTime ?? 20);
  if (!time.success || Array.isArray(body.defaultTime)) throw new DomainError(422, "VALIDATION_ERROR", "Thời gian câu hỏi phải từ 10 đến 120 giây.");
  c.header("Cache-Control", "no-store");
  const result = await runQuizImport(body.file, time.data, c.get("session")!.user.id, c.req.raw.signal);
  return c.json(QuizImportPreviewSchema.parse(result));
}
