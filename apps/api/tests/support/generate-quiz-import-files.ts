import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { docxFixture, MIXED_QUIZ } from "./quiz-import-fixtures";
const root = join(import.meta.dir, "../fixtures/quiz-import/real");
await mkdir(root, { recursive: true });
const executable = process.env.QUIZ_IMPORT_OFFICE_PATH ?? "libreoffice";
const samples = { mixed: MIXED_QUIZ, single: MIXED_QUIZ.split("\n\n")[0], multiple: MIXED_QUIZ.split("\n\n")[1], text: MIXED_QUIZ.split("\n\n")[2] };
for (const [name, text] of Object.entries(samples)) {
  await Bun.write(join(root, `${name}.docx`), docxFixture(text));
  await Bun.write(join(root, `${name}.txt`), text); await Bun.write(join(root, `${name}.md`), text);
  for (const format of ["doc:MS Word 97", "pdf:writer_pdf_Export"]) {
    const child = Bun.spawn([executable, `-env:UserInstallation=${pathToFileURL(join(root, `profile-${name}-${format.slice(0, 3)}`)).href}`, "--headless", "--convert-to", format, "--outdir", root, join(root, `${name}.docx`)], { stdout: "inherit", stderr: "inherit" });
    if (await child.exited !== 0) throw new Error(`Could not generate ${name} ${format}`);
  }
}
await Bun.write(join(root, "locked.docx"), docxFixture());
const encrypted = Bun.spawn([executable, `-env:UserInstallation=${pathToFileURL(join(root, "profile-locked")).href}`, "--headless", "--convert-to", 'pdf:writer_pdf_Export:{"EncryptFile":{"type":"boolean","value":"true"},"DocumentOpenPassword":{"type":"string","value":"quiz-test"}}', "--outdir", root, join(root, "locked.docx")], { stdout: "inherit", stderr: "inherit" });
if (await encrypted.exited !== 0) throw new Error("Could not generate encrypted PDF");
console.log("Real DOC/DOCX/PDF/TXT/MD fixtures generated for individual and mixed types.");
