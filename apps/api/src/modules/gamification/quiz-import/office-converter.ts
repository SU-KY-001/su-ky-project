import { pathToFileURL } from "node:url";
import { join } from "node:path";
import { mkdir } from "node:fs/promises";
import { QUIZ_IMPORT_LIMITS } from "@repo/shared";
import { env } from "../../../core/env";
import { DomainError } from "../../../core/errors/domain-error";

export async function convertLegacyWord(bytes: Uint8Array, directory: string, signal: AbortSignal): Promise<Uint8Array> {
  const input = join(directory, "source.doc"), output = join(directory, "source.docx");
  await Bun.write(input, bytes);
  await mkdir(join(directory, "profile"), { recursive: true });
  await mkdir(join(directory, "profile", "user"), { recursive: true });
  await Bun.write(join(directory, "profile", "user", "registrymodifications.xcu"), '<?xml version="1.0" encoding="UTF-8"?><oor:items xmlns:oor="http://openoffice.org/2001/registry"><item oor:path="/org.openoffice.Office.Common/Security/Scripting"><prop oor:name="MacroSecurityLevel" oor:op="fuse"><value>3</value></prop></item></oor:items>');
  const executable = env.QUIZ_IMPORT_OFFICE_PATH ?? (process.platform === "win32" ? "soffice.com" : "libreoffice");
  let child: ReturnType<typeof Bun.spawn>;
  try {
    child = Bun.spawn([executable, `-env:UserInstallation=${pathToFileURL(join(directory, "profile")).href}`, "--headless", "--norestore", "--nodefault", "--nofirststartwizard", "--convert-to", "docx:Office Open XML Text", "--outdir", directory, input], { stdin: "ignore", stdout: "ignore", stderr: "ignore" });
  } catch { throw new DomainError(503, "SERVICE_UNAVAILABLE", "Bộ đọc DOC chưa sẵn sàng. Hãy lưu thành DOCX rồi tải lại hoặc liên hệ quản trị."); }
  let timedOut = false;
  let stopping: Promise<void> | undefined;
  const stop = (): void => {
    stopping ??= (async (): Promise<void> => {
      if (process.platform === "win32") {
        try { const kill = Bun.spawn([join(process.env.SystemRoot ?? "C:\\Windows", "System32", "taskkill.exe"), "/PID", String(child.pid), "/T", "/F"], { stdout: "ignore", stderr: "ignore" }); await kill.exited; } catch { child.kill(); }
      } else child.kill();
    })();
  };
  const timer = setTimeout(() => { timedOut = true; stop(); }, QUIZ_IMPORT_LIMITS.officeMs);
  signal.addEventListener("abort", stop, { once: true });
  try {
    const code = await child.exited;
    signal.throwIfAborted();
    if (timedOut) throw new DomainError(503, "SERVICE_UNAVAILABLE", "Chuyển DOC quá thời gian. Hãy lưu thành DOCX rồi tải lại.");
    if (code !== 0 || !await Bun.file(output).exists()) throw new DomainError(422, "VALIDATION_ERROR", "Không chuyển được DOC; file có thể hỏng hoặc bị khóa. Hãy mở và lưu lại thành DOCX.");
    if (Bun.file(output).size > QUIZ_IMPORT_LIMITS.bytes) throw new DomainError(413, "PAYLOAD_TOO_LARGE", "DOC sau chuyển đổi vượt 5 MB. Hãy chia nhỏ tài liệu.");
    return new Uint8Array(await Bun.file(output).arrayBuffer());
  } finally { clearTimeout(timer); signal.removeEventListener("abort", stop); await stopping; }
}
