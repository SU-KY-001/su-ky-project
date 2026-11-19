import { expect, it } from "bun:test";
import { createQuizImportRunner } from "../src/modules/gamification/quiz-import/runner";
import { MIXED_QUIZ } from "./support/quiz-import-fixtures";
import { removeImportDirectory } from "../src/modules/gamification/quiz-import/temp-directory";
const file = (): File => new File([MIXED_QUIZ], "quiz.txt");
it("runs real extraction and parsing outside the API thread", async () => {
  const run = createQuizImportRunner();
  const r = await run(file(), 20, "user", new AbortController().signal);
  expect(r.status).toBe("ready"); expect(r.summary.total).toBe(3);
});
it("aborts a request and allows retry without leaking capacity", async () => {
  const run = createQuizImportRunner(); const controller = new AbortController();
  const promise = run(file(), 20, "user", controller.signal); controller.abort();
  await expect(promise).rejects.toThrow();
  expect((await run(file(), 20, "user", new AbortController().signal)).status).toBe("ready");
});
it("terminates a started worker on abort and releases its slot", async () => {
  const run = createQuizImportRunner(); const controller = new AbortController();
  const pending = run(file(), 20, "running-user", controller.signal);
  await Bun.sleep(20); controller.abort();
  await expect(pending).rejects.toThrow("dừng");
  expect((await run(file(), 20, "running-user", new AbortController().signal)).status).toBe("ready");
});
it("enforces one active import per user and a bounded deadline", async () => {
  const run = createQuizImportRunner({ deadlineMs: 1 });
  const first = run(file(), 20, "user", new AbortController().signal);
  await expect(run(file(), 20, "user", new AbortController().signal)).rejects.toThrow("đang được xử lý");
  await expect(first).rejects.toThrow("thời gian");
});
it("limits concurrent work globally while independent users can finish", async () => {
  const run = createQuizImportRunner();
  const first = run(file(), 20, "one", new AbortController().signal), second = run(file(), 20, "two", new AbortController().signal);
  await expect(run(file(), 20, "three", new AbortController().signal)).rejects.toThrow("nhiều tài liệu");
  expect((await Promise.all([first, second])).every(r => r.status === "ready")).toBe(true);
});
it("refuses recursive cleanup of arbitrary paths", async () => {
  await expect(removeImportDirectory(process.cwd())).rejects.toThrow("Refusing cleanup");
});
it("reports a missing DOC converter as a controlled service error", async () => {
  const original = process.env.QUIZ_IMPORT_OFFICE_PATH;
  process.env.QUIZ_IMPORT_OFFICE_PATH = "/quiz-import-test/nonexistent-office-executable";
  try {
    const run = createQuizImportRunner();
    const doc = new File([Buffer.from("d0cf11e0a1b11ae1", "hex")], "quiz.doc");
    await expect(run(doc, 20, "doc-user", new AbortController().signal)).rejects.toMatchObject({ status: 503, code: "SERVICE_UNAVAILABLE" });
  } finally { if (original === undefined) delete process.env.QUIZ_IMPORT_OFFICE_PATH; else process.env.QUIZ_IMPORT_OFFICE_PATH = original; }
});
