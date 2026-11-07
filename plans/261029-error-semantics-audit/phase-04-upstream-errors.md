# Phase 4 — Lỗi upstream và lỗi runtime AI

Có thể song song với phase 2.

## S4 — Phân biệt 502 / 503 / 504

| Nơi | Tình huống | Status | Code |
|---|---|---|---|
| `ai-assist/voice/gemini-tts.ts:73` | chưa cấu hình key | 503 | `AI_UNAVAILABLE` (giữ) |
| `gemini-tts.ts:87` | hết giờ / mất kết nối | 504 | `AI_TIMEOUT` |
| `gemini-tts.ts:96,99` | upstream trả lỗi / không có audio | 502 | `AI_UNAVAILABLE` |
| `gemini-tts.ts:93` | mọi key bị 429 | 429 | `RATE_LIMITED` (giữ) |
| `catalog/infrastructure/source-pdf-pages.ts:25,58` | tải PDF thất bại | 502 (lỗi fetch) / 504 (hết giờ, phân biệt bằng AbortError) | `MEDIA_PROVIDER_UNAVAILABLE` |

**Không đổi** `media.service.ts:26` (`MEDIA_PROVIDER_UNAVAILABLE` 503 cho upload ảnh): `ImageUploadDropzone` hiển thị theo status 503 (phase 1 đã thêm theo code, nhưng giữ 503 cho an toàn).

Ranh giới: 503→502/504 vẫn ≥500, `canReuseIdempotencyKey` không đổi; server vẫn xóa key khi ≥500.

## H4 — Lỗi thường ở runtime AI

`structured-agent-runner.ts:136,141` ném `Error` thường → 500. Đổi thành lớp lỗi có sẵn (`AiUnavailableError` trong `ai-engine/errors.ts`) để `compose.service.ts:247` và `ai-check.service.ts:122` map sang `AI_UNAVAILABLE` 503. `rate-limit.ts:33` và `historical-evidence.ts:217` là bất biến nội bộ: giữ 500.

## Test

- TTS: mock `fetch` trả 500 → 502; abort → 504; thiếu key → 503.
- PDF pages: fetch lỗi → 502; hết giờ → 504.
- Runtime chưa sẵn sàng → `AI_UNAVAILABLE` 503 qua compose và ai-check.

## Chấp nhận

`bun test` không tăng fail; web voice/compose message không đổi (compose đã map 502/503/504).
