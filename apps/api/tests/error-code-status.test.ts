import { describe, expect, it } from "bun:test";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

const SRC_DIR = join(import.meta.dir, "..", "src");
// `\s` spans CRLF, so DomainError calls formatted over several lines are matched too.
const DOMAIN_ERROR_PATTERN = /new DomainError\(\s*(\d{3})\s*,\s*"([A-Z_]+)"/g;

// A code listed here may legitimately carry several statuses. Each entry needs a reason.
const MULTI_STATUS_EXCEPTIONS: Record<string, string> = {};

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return path.endsWith(".ts") && !path.endsWith(".test.ts") ? [path] : [];
  });
}

function statusesByCode(): Map<string, Map<number, string[]>> {
  const result = new Map<string, Map<number, string[]>>();
  for (const file of sourceFiles(SRC_DIR)) {
    for (const [, status, code] of readFileSync(file, "utf8").matchAll(DOMAIN_ERROR_PATTERN)) {
      const byStatus = result.get(code) ?? new Map<number, string[]>();
      byStatus.set(Number(status), [...(byStatus.get(Number(status)) ?? []), file.slice(SRC_DIR.length + 1)]);
      result.set(code, byStatus);
    }
  }
  return result;
}

describe("DomainError codes", () => {
  it("finds the DomainError call sites (guards the pattern itself)", () => {
    expect(statusesByCode().size).toBeGreaterThan(30);
  });

  it("uses one HTTP status per error code", () => {
    const conflicts = [...statusesByCode()]
      .filter(([code, byStatus]) => byStatus.size > 1 && !(code in MULTI_STATUS_EXCEPTIONS))
      .map(([code, byStatus]) => `${code}: ${[...byStatus].map(([status, files]) => `${status} in ${files.join(", ")}`).join(" | ")}`);
    expect(conflicts).toEqual([]);
  });
});
