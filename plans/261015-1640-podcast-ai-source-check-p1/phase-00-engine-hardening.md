# Phase 0: ai-engine (Pi) hardening và provider Gemini

Không phụ thuộc phase khác. Là nền cho mọi chức năng AI (P1-P3, và P5 nếu có tóm tắt). Không đổi theo quyết định 2026-10-22 (provider và hardening giữ nguyên); chỉ chỉnh ví dụ cho khớp P1 "AI rà kịch bản".

## Trạng thái hiện tại (2026-10-23)

- **Đã triển khai:** provider error classification/usage/abort/redacted tracing, một tầng retry và runtime credential rotation trong `apps/api/src/modules/ai-engine/` (đặc biệt `structured-agent-runner.ts`, `pi-runtime.ts`, `pi-tracer.ts`, `api-key-rotation.ts`).
- **Bằng chứng đã có (không chạy lại):** 20 test API ở `api-key-rotation.test.ts`, `ai-assist/gemini-tts.test.ts`, `ai-assist/voice.service.test.ts`; API `tsc` pass; smoke HTTP localhost 429 helper fallback/sticky-key pass. Đây không phải Gemini live smoke.
- **Còn mở theo thiết kế:** Gemini live usage/auth/abort/redaction smoke; vì vậy chưa đánh dấu toàn bộ mục Smoke/Done của phase này là nghiệm thu.

## Bằng chứng (đã chạy thật trên dev, 2026-10-22)

- `opencode-go` / `muse-spark-1.3-contributor` và `minimax-m3`: model trả lỗi 403 "An active OpenCode Go subscription is required". Runner **che lỗi**: đọc `stopReason:"error"` thành text rỗng, báo "Agent returned invalid JSON" sau ~32 giây (Pi tự retry 2s, 4s, 8s cả với lỗi 403).
- `google` / `gemini-3.5-flash-lite`: khởi tạo `ready:true`, một call 3 block mất ~7,5 giây, JSON hợp lệ. Gọi nhiều lượt trong phiên có công cụ thì dính chuỗi rỗng bị che thành "invalid JSON" (nghi giới hạn tốc độ, chưa thấy mã lỗi thật). `openai` / `gpt-5.6-luna` (OAuth đã lưu, `low`): không dính trong 24 request đo. Số đo ở `plans/reports/eval-261022-source-check-agent-spike.md`.
- Runner chỉ được `ai-engine/index.ts` export; chưa module nào gọi (đã grep), nên đổi chữ ký là an toàn (clean cutover, không shim). **Đã làm sẵn từ spike (giữ, không làm lại):** tùy chọn `customTools` ở `structured-agent-runner.ts` (tên công cụ thành allowlist; mặc định vẫn không công cụ) và `pi-runtime.ts` dùng credential OAuth đã lưu của đúng provider thay vì key env. Cả hai đã chạy thật với `gpt-5.6-luna`; chưa có test tự động.

## Việc cần làm

Cấu hình:
- `.env` local đã đặt `PI_PROVIDER=google`, `PI_MODEL=gemini-3.5-flash-lite` (file bị gitignore, không commit).
- `.env.example`: `PI_MODEL=gemini-3.5-flash-lite`. `ai-engine.constants.ts`: `DEFAULT_PI_MODEL_BY_PROVIDER.google = "gemini-3.5-flash-lite"`. Dùng id stable, không `-latest` (alias đổi ngầm).

Sửa `apps/api/src/modules/ai-engine/`:
1. **Lỗi provider không bị che.** `getAssistantText` đọc `stopReason`/`errorMessage` của tin nhắn assistant cuối. Hàm thuần `classifyProviderFailure(message)` trả `AgentProviderError { kind: AUTH | QUOTA | RATE_LIMIT | UNAVAILABLE | BLOCKED | TRUNCATED | OTHER, status?, retryable }`. Bảng retry theo hướng dẫn của Google: chỉ 408/429/5xx/lỗi mạng là retryable; 400/402/403 không. `stopReason` giới hạn độ dài (`length`) → `TRUNCATED`; bị chặn an toàn → `BLOCKED`. Thêm vào `errors.ts`.
2. **Trả usage.** Trả `{ data, usage: { input, output, total }, model, durationMs, attempts }`; cộng `usage` của mọi tin nhắn assistant trong phiên (gồm lần sửa schema). Cập nhật `index.ts` và `tests/ai-engine.test.ts`.
3. **Hủy:** `signal?: AbortSignal` trong `StructuredAgentRequest`; khi abort gọi `session.abort()` (có trong Pi: `agent-session.d.ts`) và ném lỗi hủy riêng, không phải `AgentProviderError`. Gỡ listener trong `finally`.
4. **Redact log.** Cờ `redactContent` (mặc định `true`): `agent run started/succeeded/failed` và `agent output invalid` chỉ ghi độ dài, nhãn, số lượt, token, độ trễ; không ghi `userPromptSnippet`, `outputSnippet`, `rawSnippet`, `piLastText`. **`pi-tracer.ts` cũng phải redact:** log mỗi tin nhắn hiện in cả nội dung (đã thấy `message_end ...` kèm văn bản nguồn trong smoke). Plan P1 cấm log nội dung kịch bản/nguồn.
5. **Một tầng retry.** `SettingsManager.inMemory({ retry: { enabled, maxRetries, baseDelayMs, provider: { timeoutMs, maxRetries } } })` từ env (`PI_RETRY_MAX`, `PI_RETRY_BASE_DELAY_MS`, `PI_PROVIDER_TIMEOUT_MS`, mặc định nhỏ). Kiểu `RetrySettings` đã có trong SDK. Không bọc retry lần thứ hai ở runner hay ai-assist (retry chồng lên nhau gây bão retry khi bị 429). **Cần xác minh khi làm:** Pi có bỏ qua retry cho lỗi 403 không; nếu không, lỗi AUTH tốn đúng bằng tổng backoff, và `signal`/timeout chặn tổng thời gian.
6. **Mức suy nghĩ theo lệnh gọi:** `thinking?: ThinkingLevel` ghi đè `env.PI_THINKING_LEVEL`. Gemini 3.x bật thinking mặc định, tăng độ trễ và token. Spike đo rà kịch bản ở `low` (`gpt-5.6-luna`, `PI_THINKING_LEVEL=low`) nên dùng `"low"` làm mặc định cho rà; chưa đo `"minimal"` với phiên có công cụ. Sinh nội dung (phase 6) chưa đo. Xác nhận giá trị hợp lệ bằng smoke.
7. **Sẵn sàng:** hàm `assertAiReady()` ném `AiUnavailableError` (→ 503 `AI_UNAVAILABLE`) khi `!piRuntime.isReady` (thiếu key, hoặc không có model), và `AiDisabledError` (→ 503 `AI_DISABLED`) khi `SystemConfig "ai_assist.enabled" === false` (cờ khẩn cấp, mặc định `true`, nhãn admin "Bật trợ lý AI"). Điều kiện đúng là `isReady`, không phải riêng `GEMINI_API_KEY`, vì provider cấu hình được.
8. **Gợi ý prompt cho Gemini** (ghi vào hướng dẫn viết prompt trong phase 2): không dùng `\uXXXX` trong ví dụ, gửi UTF-8 thật (tránh lỗi lặp `\n` trong đầu ra có cấu trúc); mọi trường schema `required`; không chỉ định thứ tự trường trong prompt.

Chưa làm, có lý do:
- **Schema gốc của Gemini (`responseSchema`):** không thấy Pi SDK chuyển tiếp (chưa xác minh phần provider bên dưới). Giữ prompt-JSON + zod + 1 lần sửa. Làm lại khi Pi hỗ trợ.
- **`maxOutputTokens`:** SDK không có tùy chọn trong định kiểu đã đọc. Bù bằng schema nhỏ và coi `TRUNCATED` là lỗi block.
- Circuit breaker, promptfoo, LISTEN/NOTIFY: hoãn (xem bảng quyết định ở báo cáo nghiên cứu).

## Test

- `classifyProviderFailure`: bảng ca (403→AUTH không retry, 429→RATE_LIMIT retry, 503→UNAVAILABLE retry, `length`→TRUNCATED, lỗi lạ→OTHER). Hàm thuần.
- Redaction: hàm tóm tắt sự kiện của tracer khi `redactContent` không chứa nội dung tin nhắn (thuần hàm).
- Test engine hiện có cập nhật theo chữ ký mới.

## Smoke

- Chạy `runStructuredAgent` thật với `google`: nhận `usage` > 0.
- Đặt key sai: thất bại nhanh với `AgentProviderError` kind `AUTH`, không còn "invalid JSON".
- Abort giữa chừng: kết thúc trong thời gian ngắn, không rò phiên.
- Xác nhận log không chứa văn bản prompt/đầu ra.

## Done khi

Lỗi provider hiện đúng loại và không retry thừa; có `usage`; hủy được; log không chứa nội dung; `assertAiReady` đúng; smoke với Gemini đạt; test engine đạt, `check-types` api sạch.
