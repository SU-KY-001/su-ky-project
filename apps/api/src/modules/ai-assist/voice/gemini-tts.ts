import type { DialogueSpeaker, DialogueTurn } from "@repo/shared";
import { DomainError } from "../../../core/errors/domain-error";
import { env } from "../../../core/env";
import { createApiKeyRotation } from "../../ai-engine/api-key-rotation";

const API_BASE = "https://generativelanguage.googleapis.com/v1beta";
const INTERACTIONS_ENDPOINT = `${API_BASE}/interactions`;
const HTTP_RATE_LIMITED = 429;
const ERROR_BODY_LOG_CHARS = 300;
const withApiKeyRotation = createApiKeyRotation();

interface InteractionResponse {
  steps?: { type: string; content?: { type: string; data?: string }[] }[];
}

interface GenerateContentResponse {
  candidates?: { content?: { parts?: { inlineData?: { data?: string } }[] } }[];
}

const singleAudio = (json: unknown): string | undefined =>
  ((json as InteractionResponse).steps ?? []).filter((step) => step.type === "model_output").flatMap((step) => step.content ?? []).filter((part) => part.type === "audio").at(-1)?.data;

const dialogueAudio = (json: unknown): string | undefined =>
  (json as GenerateContentResponse).candidates?.[0]?.content?.parts?.find((part) => part.inlineData?.data)?.inlineData?.data;

export function buildSingleBody(text: string, voice: string): string {
  return JSON.stringify({
    model: env.TTS_MODEL,
    input: [{ type: "user_input", content: [{ type: "text", text, annotations: [{ type: "speech_metadata", style: env.TTS_STYLE }] }] }],
    response_format: { type: "audio" },
    generation_config: { speech_config: [{ voice }] },
  });
}

/**
 * Multi-speaker TTS uses `generateContent` (documented at ai.google.dev speech-generation): one part per turn with
 * `speech_metadata`, and two prebuilt voices in `multiSpeakerVoiceConfig`. Unary responses are complete WAV files.
 * `style` is omitted when empty so the model is not given a blank direction.
 */
export function buildDialogueBody(turns: readonly Pick<DialogueTurn, "speaker" | "text" | "style">[], speakers: readonly Pick<DialogueSpeaker, "key" | "voice">[]): string {
  return JSON.stringify({
    contents: [
      {
        role: "user",
        parts: turns.map((turn) => ({
          text: turn.text,
          speech_metadata: { speaker: turn.speaker, ...(turn.style?.trim() ? { style: turn.style.trim() } : {}) },
        })),
      },
    ],
    generationConfig: {
      responseModalities: ["AUDIO"],
      speechConfig: {
        multiSpeakerVoiceConfig: {
          speakerVoiceConfigs: speakers.map((speaker) => ({ speaker: speaker.key, voiceConfig: { prebuiltVoiceConfig: { voiceName: speaker.voice } } })),
        },
      },
    },
  });
}

export const synthesizeWav = (text: string, voice: string, signal: AbortSignal): Promise<Buffer> => requestWav(INTERACTIONS_ENDPOINT, buildSingleBody(text, voice), singleAudio, signal);

export const synthesizeDialogueWav = (
  turns: readonly Pick<DialogueTurn, "speaker" | "text" | "style">[],
  speakers: readonly Pick<DialogueSpeaker, "key" | "voice">[],
  signal: AbortSignal,
): Promise<Buffer> => requestWav(`${API_BASE}/models/${env.TTS_DIALOGUE_MODEL}:generateContent`, buildDialogueBody(turns, speakers), dialogueAudio, signal);

/** Each request tries each distinct key at most once, only moving on after a 429. */
async function requestWav(url: string, body: string, pickAudio: (json: unknown) => string | undefined, signal: AbortSignal): Promise<Buffer> {
  const apiKeys = [...new Set(env.GEMINI_API_KEY?.split(",").map((key) => key.trim()).filter(Boolean) ?? [])];
  if (!apiKeys.length) throw new DomainError(503, "AI_UNAVAILABLE", "Chưa cấu hình khóa Gemini cho giọng đọc AI");
  // One deadline for the whole chunk, including fallback requests.
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(env.TTS_REQUEST_TIMEOUT_MS)]);
  const response = await withApiKeyRotation(apiKeys, async (apiKey) => {
    try {
      requestSignal.throwIfAborted();
      return await fetch(url, {
        method: "POST",
        headers: { "x-goog-api-key": apiKey, "Content-Type": "application/json" },
        body,
        signal: requestSignal,
      });
    } catch (error) {
      if (signal.aborted) throw error;
      throw new DomainError(503, "AI_UNAVAILABLE", "Không gọi được dịch vụ giọng đọc (hết thời gian hoặc mất kết nối)");
    }
  });
  if (!response.ok) {
    let errorBody = await response.text();
    if (response.status === HTTP_RATE_LIMITED) {
      throw new DomainError(429, "RATE_LIMITED", "Tất cả khóa giọng đọc AI đều bị giới hạn lượt gọi. Thử lại sau.");
    }
    for (const key of apiKeys) errorBody = errorBody.replaceAll(key, "[REDACTED]");
    throw new DomainError(503, "AI_UNAVAILABLE", `Dịch vụ giọng đọc báo lỗi ${response.status}: ${errorBody.slice(0, ERROR_BODY_LOG_CHARS)}`);
  }
  const audio = pickAudio(await response.json());
  if (!audio) throw new DomainError(503, "AI_UNAVAILABLE", "Dịch vụ giọng đọc không trả về âm thanh");
  return Buffer.from(audio, "base64");
}
