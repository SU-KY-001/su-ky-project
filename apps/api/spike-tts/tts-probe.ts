/**
 * One-shot Gemini TTS probe. ONE run = ONE API request (the free tier allows ~10 a day), no retries.
 *   bun apps/api/spike-tts/tts-probe.ts <model> [voice] [textFile]
 * Run from the repo root so Bun loads GEMINI_API_KEY from .env. Output: apps/api/spike-tts/out/<model>.wav
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const TIMEOUT_MS = 120_000;
const WAV_HEADER_BYTES = 44;
const PCM_BYTES_PER_SECOND = 24_000 * 2; // 24 kHz, mono, 16-bit
const DEFAULT_VOICE = "Kore";
const SAMPLE_TEXT =
  "Năm 938, Ngô Quyền đem quân đánh trận trên sông Bạch Đằng. Ông cho đóng cọc nhọn ngầm dưới lòng sông, chờ nước triều xuống. Quân Nam Hán tiến vào, thuyền mắc kẹt, và trận đánh kết thúc bằng một chiến thắng lớn.";

const [model, voice = DEFAULT_VOICE, textFile] = process.argv.slice(2);
const apiKey = process.env.GEMINI_API_KEY;
if (!model) throw new Error("usage: bun tts-probe.ts <model> [voice] [textFile]");
if (!apiKey) throw new Error("GEMINI_API_KEY is not set");

const text = textFile ? readFileSync(textFile, "utf8").trim() : SAMPLE_TEXT;
const body = {
  model,
  input: [{ type: "user_input", content: [{ type: "text", text, annotations: [{ type: "speech_metadata", style: process.env.TTS_STYLE ?? "Podcast - Calm, measured delivery" }] }] }],
  response_format: { type: "audio" },
  generation_config: { speech_config: [{ voice }] },
};

const started = performance.now();
const response = await fetch(ENDPOINT, {
  method: "POST",
  headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
  body: JSON.stringify(body),
  signal: AbortSignal.timeout(TIMEOUT_MS),
});
const elapsedMs = Math.round(performance.now() - started);
const raw = await response.text();
if (!response.ok) {
  console.error(`HTTP ${response.status} after ${elapsedMs} ms\n${raw.slice(0, 800)}`);
  process.exit(1);
}

const json = JSON.parse(raw) as { steps?: { type: string; content?: { type: string; data?: string }[] }[]; usage?: unknown };
const audio = (json.steps ?? []).filter((step) => step.type === "model_output").flatMap((step) => step.content ?? []).filter((part) => part.type === "audio").at(-1);
if (!audio?.data) {
  console.error(`No audio block in response (${elapsedMs} ms). Top-level keys: ${Object.keys(json).join(", ")}\n${raw.slice(0, 600)}`);
  process.exit(1);
}

const wav = Buffer.from(audio.data, "base64");
const outDir = join(import.meta.dir, "out");
mkdirSync(outDir, { recursive: true });
const file = join(outDir, `${model}.wav`);
writeFileSync(file, wav);

const audioSeconds = (wav.length - WAV_HEADER_BYTES) / PCM_BYTES_PER_SECOND;
console.log(JSON.stringify({
  model, voice, chars: text.length, httpStatus: response.status, latencyMs: elapsedMs,
  wavBytes: wav.length, audioSeconds: Number(audioSeconds.toFixed(1)),
  realtimeFactor: Number((audioSeconds / (elapsedMs / 1000)).toFixed(1)),
  riff: wav.subarray(0, 4).toString("ascii"), usage: json.usage ?? null, file,
}, null, 2));
