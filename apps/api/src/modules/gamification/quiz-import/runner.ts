import { spawn, type ChildProcess } from "node:child_process";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { z } from "zod";
import { QUIZ_IMPORT_LIMITS, QuizImportPreviewSchema, ERROR_CODES, type QuizImportPreview } from "@repo/shared";
import { DomainError } from "../../../core/errors/domain-error";
import { removeImportDirectory } from "./temp-directory";

const workerPath = fileURLToPath(new URL("./document-worker.ts", import.meta.url));
const WorkerError = z.object({ status: z.union([z.literal(413), z.literal(422), z.literal(503)]), error_code: z.enum(ERROR_CODES), message: z.string() });
async function killTree(child: ChildProcess): Promise<void> {
  if (!child.pid) return;
  if (process.platform === "win32") {
    if (child.exitCode !== null) return;
    try {
      const stop = Bun.spawn([join(process.env.SystemRoot ?? "C:\\Windows", "System32", "taskkill.exe"), "/PID", String(child.pid), "/T", "/F"], { stdout: "ignore", stderr: "ignore" });
      await stop.exited;
    } catch { child.kill(); }
  } else { try { process.kill(-child.pid, "SIGKILL"); } catch { child.kill("SIGKILL"); } }
}

export function createQuizImportRunner(options: { deadlineMs?: number } = {}): (file: File, defaultTime: number, userId: string, signal: AbortSignal) => Promise<QuizImportPreview> {
  const users = new Set<string>();
  return async (file, defaultTime, userId, signal): Promise<QuizImportPreview> => {
    signal.throwIfAborted();
    if (users.has(userId)) throw new DomainError(503, "SERVICE_UNAVAILABLE", "Tài liệu của bạn đang được xử lý. Hãy chờ hoàn tất rồi thử lại.");
    if (users.size >= 2) throw new DomainError(503, "SERVICE_UNAVAILABLE", "Hệ thống đang xử lý nhiều tài liệu. Hãy thử lại sau.");
    if (file.size > QUIZ_IMPORT_LIMITS.bytes) throw new DomainError(413, "PAYLOAD_TOO_LARGE", "Tài liệu tối đa 5 MB.");
    users.add(userId);
    let directory: string | undefined, child: ChildProcess | undefined, timer: ReturnType<typeof setTimeout> | undefined;
    let failure: Error | undefined;
    const stop = (): void => { failure = new DomainError(400, "REQUEST_ABORTED", "Đã dừng đọc tài liệu."); if (child) void killTree(child); };
    signal.addEventListener("abort", stop, { once: true });
    timer = setTimeout(() => { failure = new DomainError(503, "SERVICE_UNAVAILABLE", "Đọc tài liệu quá thời gian. Hãy chia nhỏ hoặc lưu lại thành DOCX/TXT rồi tải lại."); if (child) void killTree(child); }, options.deadlineMs ?? QUIZ_IMPORT_LIMITS.deadlineMs);
    try {
      directory = await mkdtemp(join(tmpdir(), "quiz-import-"));
      const data = Buffer.from(await file.arrayBuffer()).toString("base64");
      if (failure) throw failure;
      child = spawn(process.execPath, [workerPath], { detached: process.platform !== "win32", stdio: ["pipe", "pipe", "pipe"], windowsHide: true });
      const active = child;
      const output = await new Promise<string>((resolve, reject) => {
        let text = "";
        active.stdout?.setEncoding("utf8");
        active.stdout?.on("data", (chunk: string) => { text += chunk; if (text.length > 8 * 1024 * 1024) { failure = new DomainError(422, "VALIDATION_ERROR", "Kết quả tài liệu quá lớn. Hãy chia nhỏ file."); void killTree(active); } });
        active.stderr?.resume();
        active.on("error", () => reject(new DomainError(503, "SERVICE_UNAVAILABLE", "Bộ đọc tài liệu chưa sẵn sàng. Hãy thử lại sau.")));
        active.on("close", () => failure ? reject(failure) : resolve(text));
        active.stdin?.on("error", () => {});
        active.stdin?.end(JSON.stringify({ fileName: file.name.slice(0, 255), data, defaultTime, directory }));
      });
      if (failure) throw failure;
      let body: unknown;
      try { body = JSON.parse(output); } catch { throw new DomainError(503, "SERVICE_UNAVAILABLE", "Bộ đọc tài liệu bị gián đoạn. Hãy thử lại."); }
      const response = z.object({ result: QuizImportPreviewSchema.optional(), error: WorkerError.optional() }).parse(body);
      if (response.error) throw new DomainError(response.error.status, response.error.error_code, response.error.message);
      if (!response.result) throw new DomainError(503, "SERVICE_UNAVAILABLE", "Chưa nhận được kết quả tài liệu. Hãy thử lại.");
      return response.result;
    } finally {
      clearTimeout(timer); signal.removeEventListener("abort", stop);
      if (child) await killTree(child);
      try { if (directory) await removeImportDirectory(directory); } finally { users.delete(userId); }
    }
  };
}
export const runQuizImport = createQuizImportRunner();
