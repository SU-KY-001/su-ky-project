import { extractText, getDocumentProxy } from "unpdf";
import { env } from "../../../core/env";

export async function extractPdfPages(bytes: Uint8Array, dropLines = new Set<string>()): Promise<string[]> {
  const document = await getDocumentProxy(bytes);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const result = await Promise.race([
      extractText(document, { mergePages: false }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("PDF extraction timed out")), env.SOURCE_PDF_TIMEOUT_MS);
      }),
    ]);
    return result.text.map((raw) => raw.normalize("NFC").split("\n")
      .filter((line) => !dropLines.has(line.trim())).join("\n").trim());
  } finally {
    clearTimeout(timer);
    await document.loadingTask.destroy();
  }
}
