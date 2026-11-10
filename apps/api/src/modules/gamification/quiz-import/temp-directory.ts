import { rm } from "node:fs/promises";
import { basename, dirname, resolve } from "node:path";
import { tmpdir } from "node:os";

export async function removeImportDirectory(directory: string): Promise<void> {
  const target = resolve(directory), parent = resolve(tmpdir());
  const canonical = (path: string): string => process.platform === "win32" ? path.toLowerCase() : path;
  if (canonical(dirname(target)) !== canonical(parent) || !/^quiz-import-[\w-]+$/.test(basename(target))) throw new Error("Refusing cleanup outside an owned quiz import temporary directory");
  await rm(target, { recursive: true, force: true, maxRetries: 3, retryDelay: 50 });
}
