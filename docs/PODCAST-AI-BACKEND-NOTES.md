# Podcast AI Backend Notes

> **Phần AI Assistant (script-analysis / script-suggestions) đã bị thay thế** bởi `plans/reports/brainstorm-261015-podcast-ai-script-assistant.md` (bộ route `ai-checks`, bảng `AiCheck`/`AiCheckItem`). Khi hai tài liệu mâu thuẫn về AI Assistant thì báo cáo đó là nguồn đúng. Phần ElevenLabs/giọng AI vẫn có hiệu lực ở đây. Notes sẽ được viết lại ở phase 5 của `plans/261015-1640-podcast-ai-source-check-p1/`.

Tài liệu này ghi lại hướng mở rộng backend cho AI Assistant và ElevenLabs sau khi wizard sản xuất podcast truyền thống đã ổn định. Các mục dưới đây không thuộc phạm vi triển khai hiện tại.

## Nguyên tắc

- Backend sở hữu API key, tính chi phí, rate limit, retry và kiểm tra đầu ra.
- Frontend không gọi ElevenLabs hoặc model provider trực tiếp.
- Âm thanh AI được tạo theo từng đoạn, không gửi cả kịch bản dài trong một request.
- Mỗi đoạn có thể nghe thử, tạo lại và theo dõi tiến độ độc lập.
- Định danh đoạn phải ổn định qua những chỉnh sửa không làm thay đổi nội dung đoạn đó.
- Mọi nội dung AI phải giữ liên kết tới nguồn lịch sử đã được moderator chọn.

## Cấu hình môi trường dự kiến

- `ELEVENLABS_API_KEY`.
- `ELEVENLABS_BASE_URL`, mặc định dùng endpoint chính thức.
- `ELEVENLABS_MODEL_ID`.
- Timeout cho request danh sách giọng, preview và tạo audio.
- Giới hạn ký tự theo request và theo moderator trong một khoảng thời gian.
- Giá hoặc hệ số credit theo ký tự để trả ước lượng trước khi tạo.

Không đưa API key hoặc provider secret vào response, log hay client bundle.

## Gateway ElevenLabs

Tạo interface provider độc lập với application service, tối thiểu gồm:

- Liệt kê giọng được phép sử dụng.
- Lấy hoặc tạo preview ngắn.
- Tạo audio cho một đoạn với voice, model, speed và stability.
- Đọc metadata request khi provider hỗ trợ.

Implementation ElevenLabs nằm ở infrastructure. Application layer không phụ thuộc trực tiếp SDK hoặc response shape của provider.

## Mô hình đoạn giọng đọc

Đề xuất thêm `NarrationSegment`:

- `id`.
- `narrationId`.
- `position`.
- `sourceNodeId` lấy từ block Tiptap.
- `text`.
- `textHash`.
- `characterCount`.
- `voiceId`.
- `modelId`.
- `speed`.
- `stability`.
- `status`: `PENDING`, `PROCESSING`, `READY`, `FAILED`, `STALE`.
- `audioAssetId`.
- `providerRequestId` nếu provider trả về.
- `errorCode` và thông báo lỗi nội bộ đã lọc secret.
- `createdAt`, `updatedAt`.

Khi nội dung một block thay đổi, chỉ segment có `textHash` khác bị đánh dấu `STALE`. Audio của các đoạn không đổi tiếp tục được sử dụng.

Một narration có cấu hình giọng mặc định. Segment có thể override cấu hình khi cần sửa riêng một đoạn.

## Chia đoạn

Nguồn chia đoạn là block của `scriptDocument`, ưu tiên heading và paragraph. Backend áp dụng giới hạn ký tự của provider và chỉ tách tiếp ở ranh giới câu khi một block quá dài.

Không dựa vào vị trí ký tự tuyệt đối vì chỉnh sửa ở đầu tài liệu sẽ làm thay đổi mọi offset. `sourceNodeId` và `textHash` giúp đối chiếu đoạn ổn định hơn.

## Job tạo giọng

Dùng hàng đợi nền hiện có thay vì giữ HTTP request mở trong suốt thời gian provider xử lý.

Luồng dự kiến:

1. Frontend yêu cầu tạo một segment hoặc các segment còn thiếu.
2. Backend kiểm tra quyền, phiên bản kịch bản, voice và credit estimate.
3. Backend tạo job idempotent theo narration, segment, text hash và voice settings.
4. Worker gọi provider, tải kết quả vào media storage và xác minh media asset.
5. Transaction gắn asset vào segment nếu text hash vẫn khớp.
6. Frontend poll trạng thái hoặc dùng cơ chế realtime nếu dự án bổ sung sau này.

Retry chỉ áp dụng cho lỗi mạng, rate limit và lỗi provider tạm thời. Thay đổi text hoặc voice tạo idempotency fingerprint mới.

## Ghép audio hoàn chỉnh

Sau khi mọi segment sẵn sàng, backend cần tạo một audio hoàn chỉnh để tương thích với playback hiện tại. Có hai hướng:

- Ghép server-side bằng worker và FFmpeg, sau đó gắn asset kết quả vào narration.
- Nâng playback để phát playlist segment.

Khuyến nghị ghép server-side trong giai đoạn đầu vì giữ nguyên API playback, listening progress và logic publish đang dùng một `audioAssetId`.

Khi một segment được tạo lại, narration audio tổng bị đánh dấu stale và chỉ job ghép cần chạy lại; các segment còn lại không gọi ElevenLabs lần nữa.

## API dự kiến cho giọng AI

- `GET /api/studio/tts/voices`.
- `POST /api/studio/tts/preview`.
- `POST /api/studio/episodes/:id/narrations/:type/segments/sync` để đồng bộ segment từ tài liệu hiện tại.
- `POST /api/studio/narration-segments/:id/generate`.
- `POST /api/studio/episodes/:id/narrations/:type/generate-missing`.
- `GET /api/studio/episodes/:id/narrations/:type/segments`.
- `POST /api/studio/episodes/:id/narrations/:type/assemble`.

Response ước lượng cần trả số ký tự, số đoạn và chi phí hoặc credit dự kiến trước khi moderator xác nhận tạo.

## AI Assistant cho kịch bản

AI Assistant nên dùng `ai-engine` hiện có qua một application service riêng. Input gồm:

- Plain text và cấu trúc block của kịch bản.
- Danh sách citation đang gắn.
- Nguồn của series cùng locator và excerpt.
- Loại yêu cầu: phân tích, gợi ý tách câu, phát hiện câu thiếu nguồn hoặc đề xuất sửa.

Output phải dùng schema có kiểm tra, chứa danh sách finding với block/node id, severity, message và suggestion. AI không tự động sửa tài liệu; moderator chọn áp dụng từng gợi ý.

Các khẳng định lịch sử do AI đề xuất phải trỏ tới source/citation ID hiện có. Finding không có nguồn được đánh dấu rõ, không tự tạo citation giả.

## API dự kiến cho AI Assistant

- `POST /api/studio/episodes/:id/script-analysis`.
- `POST /api/studio/episodes/:id/script-suggestions`.
- `GET /api/studio/episodes/:id/script-analysis/:runId` nếu chuyển sang job nền.

Response không trả chain-of-thought. Chỉ trả finding, lý do ngắn, citation liên quan và nội dung thay thế có cấu trúc.

## Chi phí và giới hạn

- Tính số ký tự bằng cùng quy tắc backend dùng khi gửi provider.
- Trả estimate trước khi moderator tạo giọng.
- Lưu usage theo provider request, user, episode và segment.
- Giới hạn số job đồng thời cho mỗi moderator.
- Không tự động tạo lại đoạn khi moderator đang gõ.
- Cần hành động rõ ràng để tạo tất cả đoạn còn thiếu.

## Bảo mật và quan sát

- Chỉ moderator sở hữu series hoặc admin được dùng các endpoint studio.
- Không log toàn bộ kịch bản, audio binary hoặc provider secret.
- Log correlation ID, provider request ID, segment ID, duration, character count và error code.
- Theo dõi latency, failure rate, retry count, ký tự đã dùng và media orphan.
- Media do AI tạo phải đi qua cùng xác minh và cleanup lifecycle như media upload.

## Điều kiện trước khi triển khai AI thật

- Wizard truyền thống đã lưu ổn định `scriptDocument` và `scriptContent`.
- Block trong Tiptap có định danh ổn định.
- Upload và playback audio hoàn chỉnh hoạt động ở bước 3 và bước 4.
- Checklist publish phân biệt audio hoàn chỉnh với segment rời.
- Đã thống nhất tài khoản ElevenLabs, model, voice allowlist, quota và cách tính chi phí.
- Có môi trường test provider hoặc adapter giả để kiểm thử mà không tiêu tốn credit.

