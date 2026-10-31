# Podcast AI và cổng xuất bản

Cập nhật: 2026-10-23. Tài liệu mô tả implementation hiện tại; thay ghi chú thiết kế ElevenLabs/segment cũ. Phạm vi phát hành: thư viện Sử Ký, chưa có RSS/distribution.

## AI hỗ trợ nội dung

`apps/api/src/modules/ai-assist` chia theo review, compose, angles và voice. AI rà kịch bản theo nguồn series; câu trích được kiểm với nội dung nguồn đã đọc, nhưng không tự xác minh sự thật. `REVIEWED` nghĩa là đã xem, không có nghĩa đã sửa hoặc kiểm chứng. AI không tự duyệt hoặc publish.

Soạn dàn ý/viết phần/viết lại chạy qua ai-engine và model-gate; không lưu bản nháp vào DB. Góc kể lưu riêng theo người dùng. Nguồn chỉ gắn series; không upload lặp tại tập. Không triển khai claim register.

## Giọng AI Gemini

- `POST /api/studio/episodes/:id/ai/voice`: trả job 202; GET theo job để poll; DELETE hủy; GET `/audio` tải MP3.
- Model mặc định `gemini-3.8-flash-lite-tts`; cấu hình TTS trong `.env.example`, ffmpeg qua `FFMPEG_PATH`. Không gọi provider trực tiếp từ web.
- `GEMINI_API_KEY` nhận một key hoặc danh sách cách nhau bằng dấu phẩy; bỏ khoảng trắng, mục rỗng và key trùng. TTS gặp 429 sẽ thử key kế tiếp, mỗi key tối đa một lần/chunk, giữ key kế tiếp cho các chunk sau. Hết danh sách vẫn trả `RATE_LIMITED`; không retry lỗi khác. Toàn bộ các lượt dùng chung `TTS_REQUEST_TIMEOUT_MS` và tín hiệu hủy. Không log key. AI review/compose dùng key đầu tiên (hoặc `PI_API_KEY`), không áp vòng xoay TTS. Key cùng project có thể chia sẻ quota nên không bảo đảm tăng hạn mức.
- Đọc kịch bản đã lưu, bỏ heading, chia theo đoạn/câu, gọi Gemini rồi ghép MP3. Job chạy nền, có progress/cancel và giới hạn thời gian.
- Job ghi `scriptHash` SHA-256 của các đoạn sẽ đọc và `contentRevision`. Gắn audio qua pipeline upload hiện có, server tính lại hash trong transaction; hash khác trả `HASH_MISMATCH`.
- Thay heading không đổi lời đọc không đổi hash. Đổi nội dung lời đọc phải tạo lại audio hoặc dùng bản thu phù hợp.
- Audio lưu nguồn `UPLOAD` (fileName) hoặc `AI_VOICE` (voice/model/style/chars/scriptHash). Dữ liệu AI cũ thiếu hash vẫn đọc được, nhưng không được attach mới với metadata thiếu hash. Không tạo hash giả cho dữ liệu cũ.
- Job trong RAM, file ở temp; restart làm mất job chưa gắn. Sau khi người dùng upload/gắn, audio nằm trong media lifecycle hiện có. Chưa có segment editor, voice clone, speed control hoặc hàng đợi TTS bền vững.
- MP3 có bước resample; không kết luận 24 kHz là nguyên nhân lỗi playback. Không cần gọi Gemini thật cho regression thông thường.

### Kịch bản hội thoại hai người

- `EpisodeNarration.dialogue` (JSON, nullable, chỉ `THIRD_PERSON`): `{ speakers: [A, B], turns[] }`, mỗi lượt có `id`, `speaker`, `text`, `style?`, `note?`. Lưu qua `PUT /api/studio/episodes/:id/narrations/THIRD_PERSON` với `dialogue`; server đặt `scriptDocument = null` và `scriptContent` = lời đã bỏ tag/`|` (đếm từ, thời lượng, kiểm duyệt dùng được). Gửi `scriptDocument`/`scriptContent` sau đó chuyển tập về một người kể (`dialogue = null`). `dialogue` cùng `scriptDocument` hoặc trên `FIRST_PERSON` trả 422.
- Tag trong lời chỉ nhận danh sách `DIALOGUE_TAGS` (`@repo/shared`); `|…|` là người kia chen vào, phải cân bằng. Hai người nói khác tên và khác giọng; giọng chỉ là giọng dựng sẵn (không `en-us-riko`).
- Voice job: tập hội thoại **không** gửi `voice` (giọng lấy từ `dialogue.speakers`); tập một người kể bắt buộc `voice`. Sai dạng trả 422. `VoiceJob` có `mode: "SINGLE" | "DIALOGUE"`, `voice` null với `DIALOGUE`. Một request Gemini = nhiều lượt nguyên vẹn, gọi `models/{TTS_DIALOGUE_MODEL}:generateContent` (mỗi lượt là một `part` với `speech_metadata.speaker/style`, hai giọng trong `speechConfig.multiSpeakerVoiceConfig`; không có tham số `mode`), chia chunk theo `TTS_CHUNK_CHARS`, không cắt giữa lượt; model mặc định `gemini-3.8-flash-tts`. Tập một người kể vẫn dùng Interactions API.
- `scriptHash` của tập hội thoại = sha256 của `{speakers[key,voice], turns[speaker,text,style]}`; đổi `note` hoặc tên người nói không làm âm thanh cũ mất hiệu lực, đổi lời, giọng điệu, giọng hoặc thứ tự thì `HASH_MISMATCH`.
- Chưa có: AI rà/soạn cho hội thoại, tạo lại riêng một lượt, lịch thu âm, giọng tự thiết kế/nhân bản. Giới hạn độ dài một request hai giọng của Gemini chưa đo; Gemini từ chối thì job `ERROR` kèm mã lỗi thật. Thu âm thủ công là thu ngoài hệ thống rồi upload một file; hệ thống không trộn track.

## Hồ sơ và quyết định kiểm duyệt

APPROVE yêu cầu `PublicationAssessmentSchema`:

| Trường | Nội dung |
|---|---|
| editorialNote | Kết luận biên tập/nguồn trọng yếu, 10..5000 ký tự |
| rightsNote | Căn cứ quyền tài sản, consent nếu áp dụng, 10..5000 |
| audioNote | Kết luận bản nghe, 10..5000 |
| credits | Ghi công công khai, tùy chọn |
| rightsExpiresAt | Ngày ISO hoặc datetime; ngày không giờ có hiệu lực đến hết ngày UTC |
| aiDisclosure | Công khai cho người nghe; bắt buộc khi audio có origin AI_VOICE |
| warningAcceptance | Lý do chấp nhận; bắt buộc khi có WARNING/WARN |

Đây là kết luận có trách nhiệm của người duyệt, không phải bằng chứng hệ thống tự kiểm lịch sử/pháp lý hoặc theo dõi đã nghe hết. REQUEST_CHANGES chỉ cần reviewNote, không bắt điền assessment.

Gửi duyệt/ra quyết định khóa tập và kiểm phiên bản trong transaction. Chỉ một quyết định được chuyển từ IN_REVIEW; yêu cầu đồng thời đến sau bị conflict. Approval nằm ở `Episode.publicationApproval`, gắn contentRevision; snapshot readiness/assessment nằm ở `EpisodeReview.readinessSnapshot`. Thay kịch bản/audio tăng revision, approval cũ không dùng để phát hành bản mới. Lịch sử giữ quyết định cũ thay vì xóa.

Ba điều kiện readiness bắt buộc vẫn là tên, script ngôi thứ ba, audio READY. Cảnh báo cần kết luận chấp nhận, không tự động kết luận tập sai. Lượt AI mới có thể sinh cảnh báo sau duyệt; gate publish tính lại tình trạng, có thể yêu cầu kết luận mới. Nguồn/sự kiện/phiên bản được kiểm riêng tại publication transaction.

## Ngoại lệ Admin

`POST /api/studio/episodes/:id/publish` dùng `PublishEpisodeExceptionSchema`: baseUpdatedAt + exceptionReason 20..5000 ký tự + assessment. Không dùng body publish series thay cho endpoint này.

- Bỏ qua hàng chờ/người duyệt độc lập, không bỏ qua script/audio, bằng chứng nguồn, hạn quyền, công khai AI hoặc timestamp lock.
- Vai trò và banned flag của Admin được đọc lại từ DB trong transaction.
- Ghi approval ngoại lệ theo revision và audit `episode.published_exception`, gồm actor, reason, assessment và revision. Nếu kiểm bằng chứng thất bại, transaction không để lại approval/publish/audit một phần.
- Màn Admin hàng chờ kiểm duyệt → Xem chi tiết → Xuất bản ngoại lệ… mở form cảnh báo và bắt lý do. Không cần cho Admin vào workspace moderator. API vẫn hỗ trợ ngoại lệ không phụ thuộc lịch.
- Quiz middleware chỉ bảo vệ đường quiz, không được áp role moderator-only lên toàn bộ `/api/studio`.

## Series và dữ liệu công khai

Series có `language` default `vi`, owner là người chịu trách nhiệm nội dung. Publish yêu cầu description và ít nhất một cover READY, bên cạnh topic/giai đoạn/năm, nguồn hợp lệ và ít nhất một tập đã xuất bản. Không cần mọi tập hoàn thành hoặc ảnh bìa riêng cho từng tập.

Nguồn đã có trạng thái xác minh và ghim source revision; publication snapshot giữ thông tin nguồn/locator. Đó là kiểm chứng danh mục, không tự chứng minh từng khẳng định trong podcast.

Public episode DTO chỉ có `publicationInfo.aiDisclosure` và `credits`; không trả editorialNote, rightsNote, audioNote, warningAcceptance hoặc danh tính người duyệt. Web hiển thị thông báo/ghi công tại trang nghe và tập được chọn trong series. Nội dung đã public trước migration vẫn đọc được; lần publish tiếp theo cần approval mới hoặc ngoại lệ Admin.

## Triển khai và kiểm tra

Chạy `bun run db:generate` và `bun run db:deploy` để áp migration `20261023120000_publication_gates` (thêm language, publication_approval, readiness_snapshot; không xóa dữ liệu). Snapshot cũ NULL, không backfill xác nhận giả.

Regression DB chỉ chạy với `RUN_INTEGRATION=1` và DATABASE_URL trỏ DB có tên chứa test; không reset DB development. Kiểm tra trọng tâm tại `tests/publication-gate.test.ts`, `release-review-gates.test.ts`, `podcast-historical-evidence.test.ts` và `studio-route-scope.test.ts`.

Chi tiết phạm vi/kiểm tra thực tế: `plans/261015-1640-podcast-ai-source-check-p1/phase-08-publication-gates.md`.
