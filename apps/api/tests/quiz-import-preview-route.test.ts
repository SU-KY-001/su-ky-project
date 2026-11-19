import { afterEach, expect, it, spyOn } from "bun:test";
import { Hono } from "hono";
import { app } from "../src/app";
import { auth } from "../src/modules/auth";
import { makeSession } from "./support/integration";
import { MIXED_QUIZ } from "./support/quiz-import-fixtures";
import { QuizImportPreviewSchema } from "@repo/shared";
import type { AppEnv } from "../src/types";
import { handleQuizImportPreview } from "../src/modules/gamification/quiz-import/preview-handler";
import { DomainError } from "../src/core/errors/domain-error";
const handlerApp = new Hono<AppEnv>().use("*", async (c, next) => { c.set("session", makeSession("preview-handler", "moderator")); await next(); }).post("/preview", handleQuizImportPreview);
handlerApp.onError((error, c) => error instanceof DomainError ? c.json({ error_code: error.code, message: error.message }, error.status) : c.json({ message: "Unexpected test error" }, 500));
let restore: (() => void) | undefined;
afterEach(() => { restore?.(); restore = undefined; });
function session(role: "moderator" | "admin" | "user" | null): void {
  const spy = spyOn(auth.api, "getSession").mockResolvedValue(role ? makeSession(`import-${crypto.randomUUID()}`, role) : null);
  restore = () => spy.mockRestore();
}
async function post(form = new FormData()): Promise<Response> { return handlerApp.request("/preview", { method: "POST", body: form }); }
it.each([[null, 401], ["user", 403], ["admin", 403]] as const)("restricts preview for %s", async (role, status) => { session(role); expect((await app.request("/api/studio/quiz-import/preview", { method: "POST" })).status).toBe(status); });
it("returns a typed preview without saving anything", async () => {
  session("moderator"); const form = new FormData(); form.set("file", new File([MIXED_QUIZ], "quiz.txt")); form.set("defaultTime", "60");
  const response = await post(form); expect(response.status).toBe(200); expect(response.headers.get("cache-control")).toBe("no-store");
  const result = QuizImportPreviewSchema.parse(await response.json()); expect(result.status).toBe("ready"); expect(result.questions[0].timeLimit).toBe(60);
});
it("returns content errors as an analyzable report", async () => {
  session("moderator"); const form = new FormData(); form.set("file", new File(["Câu 1: Thiếu đáp án\nA. Một\nB. Hai"], "quiz.txt"));
  const response = await post(form); expect(response.status).toBe(200); expect(QuizImportPreviewSchema.parse(await response.json()).status).toBe("needs_correction");
});
it("rejects missing/multiple files and invalid default time", async () => {
  session("moderator"); expect((await post()).status).toBe(422);
  const form = new FormData(); form.append("file", new File([MIXED_QUIZ], "one.txt")); form.append("file", new File([MIXED_QUIZ], "two.txt"));
  expect((await post(form)).status).toBe(422);
  form.delete("file"); form.set("file", new File([MIXED_QUIZ], "one.txt")); form.set("defaultTime", "5"); expect((await post(form)).status).toBe(422);
});
