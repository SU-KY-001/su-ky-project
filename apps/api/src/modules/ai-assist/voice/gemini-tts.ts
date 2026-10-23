import { DomainError } from "../../../core/errors/domain-error";
import { env } from "../../../core/env";
import { createApiKeyRotation } from "../../ai-engine/api-key-rotation";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const HTTP_RATE_LIMITED = 429;
const ERROR_BODY_LOG_CHARS = 300;
const withApiKeyRotation = createApiKeyRotation();

interface InteractionResponse {
  steps?: { type: string; content?: { type: string; data?: string }[] }[];
}

/** Each chunk tries each distinct key at most once, only moving on after a 429. */
export async function synthesizeWav(text: string, voice: string, signal: AbortSignal): Promise<Buffer> {
  const apiKeys = [...new Set(env.GEMINI_API_KEY?.split(",").map((key) => key.trim()).filter(Boolean) ?? [])];
  if (!apiKeys.length) throw new DomainError(503, "AI_UNAVAILABLE", "Chưa cấu hình khóa Gemini cho giọng đọc AI");
  // One deadline for the whole chunk, including fallback requests.
  const requestSignal = AbortSignal.any([signal, AbortSignal.timeout(env.TTS_REQUEST_TIMEOUT_MS)]);
  const body = JSON.stringify({
    model: env.TTS_MODEL,
    input: [{ type: "user_input", content: [{ type: "text", text, annotations: [{ type: "speech_metadata", style: env.TTS_STYLE }] }] }],
    response_format: { type: "audio" },
    generation_config: { speech_config: [{ voice }] },
  });
  const response = await withApiKeyRotation(apiKeys, async (apiKey) => {
    try {
      requestSignal.throwIfAborted();
      return await fetch(ENDPOINT, {
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
  const json = (await response.json()) as InteractionResponse;
  const audio = (json.steps ?? []).filter((step) => step.type === "model_output").flatMap((step) => step.content ?? []).filter((part) => part.type === "audio").at(-1);
  if (!audio?.data) throw new DomainError(503, "AI_UNAVAILABLE", "Dịch vụ giọng đọc không trả về âm thanh");
  return Buffer.from(audio.data, "base64");
}
