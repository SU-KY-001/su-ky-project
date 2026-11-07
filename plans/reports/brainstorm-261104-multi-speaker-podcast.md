# Brainstorm: podcast nhiều người đọc + UX import kịch bản

Date: 2026-11-04. Status: design approved, chưa plan/code.

## Vấn đề
- Dialogue cứng 2 người (A/B) ở schema, API TTS, FE, bản thu âm. Không có import; nhập tay từng lượt.
- Mục tiêu: N người đọc, import kịch bản theo đoạn, gán người đọc nhanh.

## Sự thật đã xác nhận (docs Gemini API + Cloud TTS, 2026-11-04)
- Multi-speaker 1 request: tối đa 2 người, chỉ voice dựng sẵn. N người: synthesize từng lượt rồi nối PCM (Limitations).
- 30 voice dựng sẵn + Extended Library. Tiếng Việt: hỗ trợ ở `gemini-3.8-flash-tts` và `-lite-tts`.
- Unary trả WAV có header 44 byte; stream trả PCM thô. 3.8 model: input 8.192 token, output 16.384 token.
- `gemini-3.8-*` không có trong Cloud TTS API. Cloud TTS giới hạn 4.000 byte/field, ~655 giây audio (không áp dụng cho Gemini API chưa xác nhận).
- Tag `<...>` dùng tiếng Anh dù transcript tiếng Việt.

## Quyết định (user duyệt)
| # | Quyết định |
|---|---|
| 1 | AI: N=2 giữ đường 1 request (multi-speaker); N>=3 gọi từng lượt single-speaker, nối WAV |
| 2 | Giữ riêng luồng 1 người kể (`scriptDocument`/`scriptContent`), không gộp N=1 |
| 3 | Import: chỉ dán văn bản, tách theo dòng trống. Không `Tên: lời`, không upload file |
| 4 | Mở rộng voice lên 30 dựng sẵn |

## Thiết kế
**Schema (`packages/shared/.../dialogue.ts`)**: `speakers` mảng 2..MAX (hằng đặt tên, đề xuất 8); `key` thành `id` ổn định; `turn.speaker` tham chiếu id; `DialogueVoiceSchema` mở 30 voice; bỏ ép A rồi B; giữ: tên khác nhau, giọng khác nhau, id lượt duy nhất. Dữ liệu cũ (A/B) vẫn hợp lệ.

**API**: `voice.service.ts` đã chia unit -> WAV -> ffmpeg concat -> mp3. N>=3: mỗi lượt là 1 unit gọi `synthesizeWav` (cần thêm `style`). Giữ `TTS_CONCURRENCY`, xoay key, xử lý 429. Thêm khoảng lặng giữa lượt qua env (`TTS_TURN_GAP_MS`, mặc định cần nghe thử, ~250ms).

**FE**: ô dán -> tách theo dòng trống -> bảng lượt; thanh người đọc (thêm/xoá/tên/giọng/màu); chip gán từng lượt + gán hàng loạt; lượt chưa gán chặn lưu/sinh audio; dán lần 2 hỏi nối thêm hay thay thế. `DialogueRecordingSheet`: màu theo thứ tự người đọc, lọc "Tất cả".

## Rủi ro
| Rủi ro | Mức | Giảm |
|---|---|---|
| Chất lượng nối từng lượt tiếng Việt chưa nghe | Cao | Thử mẫu 3 người trước khi code UI |
| Tới 300 request/tập, hạn mức key | TB | Đo trước; concurrency cấu hình |
| Đổi `DialogueSpeakerKey` chạm nhiều nơi | TB | LSP references trước |
| `generateContent` vs `interactions` | Thấp | Docs nói còn dùng được; theo dõi |

## Chưa xác nhận
- Chữ ký `synthesizeWav` (có nhận style chưa).
- `AI_VOICES` có đủ 30 voice chưa.
- Giá/hạn mức per-request; giới hạn byte thật của Gemini API cho 3.8 (chunk size).
- Lặp: có cần giữ `chunkDialogue` 3000 ký tự cho tiếng Việt (nhiều byte/ký tự).

## Thứ tự
1. Thử nghe 3 người nối từng lượt (không code UI).
2. Schema shared + test.
3. API từng lượt + khoảng lặng + test.
4. FE import + gán người đọc + bản đọc theo.

## Cập nhật: bối cảnh đồ án đại học (2026-11-04)
- Tiêu chí là độ đầy đủ tính năng, không phải chất lượng audio. Bỏ bước nghe thử, bỏ các rủi ro chất lượng/hạn mức.
- Hỗ trợ trên giấy: tối đa 30 người nói (mỗi người 1 voice trong 30 voice, vì giọng phải khác nhau), kịch bản mẫu tới 30 lượt.
- Demo thật: 2 người (đường 1 request cũ). Nếu bị hỏi: 3 người (đường từng lượt), nên đường này phải chạy thật, tối thiểu 3 người.
- `DIALOGUE_MAX_SPEAKERS` = số voice dựng sẵn (30), không đặt 8.
- Việc bắt buộc dù là đồ án: test cũ dựa vào A/B phải cập nhật; xác nhận `synthesizeWav` nhận `style` và `AI_VOICES` đủ 30 voice.
- Ưu tiên chạy trơn khi demo: ô dán văn bản, thanh người đọc, gán từng lượt/hàng loạt.
