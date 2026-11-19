import { expect, test, spyOn } from "bun:test";
import { ScriptImportDocumentSchema } from "@repo/shared";
import { runScriptImport } from "../src/modules/gamification/quiz-import/runner";
import { app } from "../src/app";
import { auth } from "../src/modules/auth";
import { makeSession } from "./support/integration";

test("extracts a narrative as text without requiring quiz questions, answers or a saved episode", async () => {
  const file = new File(["Mở đầu câu chuyện\n\nNội dung về lịch sử Việt Nam."], "kich-ban.txt");
  const result = ScriptImportDocumentSchema.parse(await runScriptImport(file, "script-import-test", new AbortController().signal));
  expect(result.fileName).toBe("kich-ban.txt");
  expect(result.blocks.map((block) => block.text).join("\n")).toContain("Nội dung về lịch sử Việt Nam.");
  expect("questions" in result).toBe(false);
});
test("rejects invalid or oversized files and honors cancellation", async () => {
  await expect(runScriptImport(new File(["x"], "bad.exe"), "bad-import", new AbortController().signal)).rejects.toThrow("Chỉ hỗ trợ");
  await expect(runScriptImport(new File([new Uint8Array(5 * 1024 * 1024 + 1)], "large.txt"), "big-import", new AbortController().signal)).rejects.toThrow("5 MB");
  const controller = new AbortController(); controller.abort();
  await expect(runScriptImport(new File(["x"], "text.txt"), "abort-import", controller.signal)).rejects.toThrow();
});

for (const role of [null, "user", "admin"] as const) {
  test(`restricts script extraction for ${role ?? "anonymous"}`, async () => {
    const session = spyOn(auth.api, "getSession").mockResolvedValue(role ? makeSession("script-import-access", role) : null);
    try { expect((await app.request("/api/studio/script-import/extract", { method: "POST" })).status).toBe(role ? 403 : 401); }
    finally { session.mockRestore(); }
  });
}
