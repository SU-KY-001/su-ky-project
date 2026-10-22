/**
 * Reads apps/api/spike-tts/out/script.txt, splits it at section headings (a paragraph with no final period),
 * sends ONE request per section (no retries; the free tier is ~10 requests a day), then joins the WAVs into an MP3.
 *   bun apps/api/spike-tts/tts-script.ts [model] [voice]     (run from the repo root so .env is loaded)
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const TIMEOUT_MS = 240_000;
const WAV_HEADER_BYTES = 44;
const PCM_BYTES_PER_SECOND = 24_000 * 2;
const MP3_QUALITY = "4";
const outDir = join(import.meta.dir, "out");

const [model = "gemini-3.8-flash-lite-tts", voice = "Kore"] = process.argv.slice(2);
const apiKey = process.env.GEMINI_API_KEY;
if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

const paragraphs = readFileSync(join(outDir, "script.txt"), "utf8").split(/\n\s*\n/).map((p) => p.trim()).filter(Boolean);
const isHeading = (p: string): boolean => !/[.!?…]$/.test(p);
const chunks: string[][] = [];
for (const p of paragraphs) {
  if (isHeading(p) || chunks.length === 0) chunks.push([p]);
  else chunks.at(-1)!.push(p);
}
console.log(`${paragraphs.length} paragraphs -> ${chunks.length} requests (${chunks.map((c) => c.join(" ").length).join(", ")} chars)`);

mkdirSync(outDir, { recursive: true });
const files: string[] = [];
for (const [index, chunk] of chunks.entries()) {
  const text = chunk.join("\n\n");
  const started = performance.now();
  const response = await fetch(ENDPOINT, {
    method: "POST",
    headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      model,
      input: [{ type: "user_input", content: [{ type: "text", text }] }],
      response_format: { type: "audio" },
      generation_config: { speech_config: [{ voice }] },
    }),
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });
  const ms = Math.round(performance.now() - started);
  const raw = await response.text();
  if (!response.ok) throw new Error(`part ${index + 1}: HTTP ${response.status} after ${ms} ms: ${raw.slice(0, 500)}`);
  const json = JSON.parse(raw) as { steps?: { type: string; content?: { type: string; data?: string }[] }[]; usage?: { total_output_tokens?: number } };
  const audio = (json.steps ?? []).filter((s) => s.type === "model_output").flatMap((s) => s.content ?? []).filter((c) => c.type === "audio").at(-1);
  if (!audio?.data) throw new Error(`part ${index + 1}: no audio block (${ms} ms): ${raw.slice(0, 300)}`);
  const wav = Buffer.from(audio.data, "base64");
  const file = join(outDir, `script-part${index + 1}.wav`);
  writeFileSync(file, wav);
  files.push(file);
  console.log(`part ${index + 1}: ${text.length} chars -> ${((wav.length - WAV_HEADER_BYTES) / PCM_BYTES_PER_SECOND).toFixed(1)} s audio in ${(ms / 1000).toFixed(1)} s, ${json.usage?.total_output_tokens ?? "?"} output tokens`);
}

const listFile = join(outDir, "parts.txt");
writeFileSync(listFile, files.map((f) => `file '${f.replaceAll("\\", "/")}'`).join("\n"));
const mp3 = join(outDir, "script.mp3");
const ffmpeg = Bun.spawnSync(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", listFile, "-codec:a", "libmp3lame", "-q:a", MP3_QUALITY, mp3]);
if (ffmpeg.exitCode !== 0) throw new Error(`ffmpeg failed: ${ffmpeg.stderr.toString()}`);
console.log(`done: ${mp3}`);
