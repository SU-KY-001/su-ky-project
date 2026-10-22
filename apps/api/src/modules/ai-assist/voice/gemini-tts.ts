import { DomainError } from "../../../core/errors/domain-error";
import { env } from "../../../core/env";

const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/interactions";
const HTTP_RATE_LIMITED = 429;
const ERROR_BODY_LOG_CHARS = 300;

interface InteractionResponse {
  steps?: { type: string; content?: { type: string; data?: string }[] }[];
}

/** One TTS request -> WAV bytes (24 kHz, mono, 16-bit, RIFF header). No retry: a retry costs quota and a 429 will not clear in seconds. */
export async function synthesizeWav(text: string, voice: string, signal: AbortSignal): Promise<Buffer> {
  if (!env.GEMINI_API_KEY) throw new DomainError(503, "AI_UNAVAILABLE", "Chưa cấu hình khóa Gemini cho giọng đọc AI");
  let response: Response;
  try {
    response = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "x-goog-api-key": env.GEMINI_API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: env.TTS_MODEL,
        input: [{ type: "user_input", content: [{ type: "text", text, annotations: [{ type: "speech_metadata", style: env.TTS_STYLE }] }] }],
        response_format: { type: "audio" },
        generation_config: { speech_config: [{ voice }] },
      }),
      signal: AbortSignal.any([signal, AbortSignal.timeout(env.TTS_REQUEST_TIMEOUT_MS)]),
    });
  } catch (error) {
    if (signal.aborted) throw error;
    throw new DomainError(503, "AI_UNAVAILABLE", "Không gọi được dịch vụ giọng đọc (hết thời gian hoặc mất kết nối)");
  }
  if (!response.ok) {
    const body = (await response.text()).slice(0, ERROR_BODY_LOG_CHARS);
    if (response.status === HTTP_RATE_LIMITED) throw new DomainError(429, "RATE_LIMITED", "Đã hết lượt gọi giọng đọc AI. Thử lại sau.");
    throw new DomainError(503, "AI_UNAVAILABLE", `Dịch vụ giọng đọc báo lỗi ${response.status}: ${body}`);
  }
  const json = (await response.json()) as InteractionResponse;
  const audio = (json.steps ?? []).filter((step) => step.type === "model_output").flatMap((step) => step.content ?? []).filter((part) => part.type === "audio").at(-1);
  if (!audio?.data) throw new DomainError(503, "AI_UNAVAILABLE", "Dịch vụ giọng đọc không trả về âm thanh");
  return Buffer.from(audio.data, "base64");
}
