import { z } from "zod";
import { parseQuizDocument } from "@repo/shared";
import { readQuizDocument } from "./document-reader";
import { DomainError } from "../../../core/errors/domain-error";

try {
  const input = z.object({ fileName: z.string().max(255), data: z.string(), defaultTime: z.number().int().min(10).max(120), directory: z.string() }).parse(JSON.parse(await Bun.stdin.text()));
  const document = await readQuizDocument(new File([Buffer.from(input.data, "base64")], input.fileName), new AbortController().signal, input.directory);
  process.stdout.write(JSON.stringify({ result: parseQuizDocument(document, input.defaultTime) }));
} catch (error) {
  const failure = error instanceof DomainError ? error : new DomainError(422, "VALIDATION_ERROR", "Không đọc được tài liệu. Hãy mở và lưu lại file rồi thử lại.");
  process.stdout.write(JSON.stringify({ error: { status: failure.status, error_code: failure.code, message: failure.message } }));
  process.exitCode = 1;
}
