import { describe, expect, it } from "bun:test";
import { parseQuizDocument, toReadyQuizQuestions } from "@repo/shared";
import { readQuizDocument } from "../src/modules/gamification/quiz-import/document-reader";
import { MIXED_QUIZ } from "./support/quiz-import-fixtures";
import { join } from "node:path";
import { readdir, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { createQuizImportRunner } from "../src/modules/gamification/quiz-import/runner";

describe.skipIf(process.env.RUN_OFFICE_IMPORT !== "1")("real Office/PDF import acceptance (requires converter)", () => {
  it.each(["doc", "docx", "pdf", "txt", "md"].flatMap(extension => ["mixed", "single", "multiple", "text"].map(name => [extension, name] as const)))("extracts complete %s %s questions from real bytes", async (extension, name) => {
    const file = Bun.file(join(import.meta.dir, `fixtures/quiz-import/real/${name}.${extension}`));
    expect(await file.exists()).toBe(true);
    const document = await readQuizDocument(new File([await file.arrayBuffer()], `${name}.${extension}`), new AbortController().signal);
    const result = parseQuizDocument(document, 30);
    expect(result.diagnostics.filter(d => d.severity === "error").map(d => d.message)).toEqual([]);
    const questions = toReadyQuizQuestions(result);
    const sample = name === "mixed" ? MIXED_QUIZ : MIXED_QUIZ.split("\n\n")[["single", "multiple", "text"].indexOf(name)];
    const expected = parseQuizDocument({ fileName: `${name}.txt`, format: "txt", blocks: sample.split("\n").map((text, i) => ({ text, line: i + 1, page: null })) }, 30);
    expect(questions.map(({ id, ...q }) => q)).toEqual(toReadyQuizQuestions(expected).map(({ id, ...q }) => q));
    if (extension === "pdf") expect(result.questions[0].source.pageStart).toBe(1);
  });
  it("rejects an actual encrypted PDF with a useful explanation", async () => {
    const bytes = await Bun.file(join(import.meta.dir, "fixtures/quiz-import/real/locked.pdf")).arrayBuffer();
    await expect(readQuizDocument(new File([bytes], "locked.pdf"), new AbortController().signal)).rejects.toThrow("khóa");
  });
  it("aborts a running real DOC conversion without orphan Office processes or temporary files", async () => {
    const before = new Set(await readdir(tmpdir()));
    const bytes = await Bun.file(join(import.meta.dir, "fixtures/quiz-import/real/mixed.doc")).arrayBuffer();
    const controller = new AbortController(), run = createQuizImportRunner();
    const pending = run(new File([bytes], "mixed.doc"), 30, "office-abort", controller.signal);
    await Bun.sleep(300); controller.abort(); await expect(pending).rejects.toThrow("dừng");
    await Bun.sleep(50);
    expect((await readdir(tmpdir())).filter(name => name.startsWith("quiz-import-") && !before.has(name))).toEqual([]);
    const commandLines = await Promise.all((await readdir("/proc")).filter(name => /^\d+$/.test(name)).map(async pid => {
      try { return await readFile(`/proc/${pid}/cmdline`, "utf8"); } catch { return ""; }
    }));
    expect(commandLines.filter(command => command.includes("--headless") && command.includes("quiz-import-") && command.includes("UserInstallation"))).toEqual([]);
  });
});
