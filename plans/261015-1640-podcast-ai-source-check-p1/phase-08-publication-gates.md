# Phase 8: Hoàn thiện cổng duyệt và ngoại lệ Admin

Ngày: 2026-10-23. Người dùng duyệt triển khai; code toàn bộ trước, chạy test/check sau. Giữ ngoại lệ Admin publish trực tiếp, bắt buộc lý do rõ và audit. Phạm vi: Sử Ký nội bộ, không RSS/claim register/role mới.

## Hợp đồng triển khai

- Dùng một `PublicationAssessmentSchema` dùng chung cho APPROVE và Admin exception: `editorialNote` (trim 10..5000, ghi kết luận nội dung/nguồn trọng yếu), `rightsNote` (10..5000, căn cứ quyền cho các tài sản dùng/consent nếu có), `audioNote` (10..5000, kết luận bản nghe), `credits` (trim max5000, nullable), `rightsExpiresAt` (ISO date nullable), `aiDisclosure` (trim max2000 nullable), `warningAcceptance` (trim max5000 nullable). Không có checkbox giả nghe xong; notes là xác nhận có trách nhiệm, không chứng minh tự động.
- `Episode.publicationApproval Json?` lưu snapshot `{ contentRevision, assessment, approvedById, approvedAt, exceptionReason: string|null }`. `EpisodeReview.readinessSnapshot Json?` lưu readiness + assessment tại quyết định. APPROVE phải có assessment. REQUEST_CHANGES giữ note bắt buộc, không cần assessment.
- Server yêu cầu disclosure khi audio origin AI_VOICE; warningAcceptance có nội dung khi tồn tại WARNING/WARN. Rights expiry phải còn hạn cả lúc duyệt và publish. Text notes không thay pháp lý; người duyệt chịu trách nhiệm và tham chiếu nguồn chung trong editorialNote.
- Gửi duyệt và quyết định khóa/kiểm revision trong transaction. Quyết định chỉ cập nhật IN_REVIEW một lần. Approve ghi snapshot/approval cùng transaction; các thay đổi contentRevision làm approval cũ không còn hợp lệ. Final publish phải kiểm approval hiện hành; giữ khóa timestamp và historical evidence.
- Admin exception: schema riêng thêm `exceptionReason` trim 20..5000 và assessment cùng `baseUpdatedAt`. Chỉ admin; transaction kiểm actor.role thực tế, timestamp, checklist/evidence, assessment rồi ghi approval exception + audit với reason/assessment/revision. Không miễn asset/source validity. Giao diện có cảnh báo rõ; không tự động dùng note mặc định.
- TTS job lưu hash kịch bản đầu vào và contentRevision. Attach AI mới bắt buộc scriptHash; server so với script hiện tại trong transaction. Dữ liệu AI cũ thiếu hash vẫn đọc được, không backfill hash giả. Đổi script sau attach hiện warning và cần kết luận người duyệt.
- Series: language default `vi`, validate language tag; owner được ghi rõ chịu trách nhiệm nội dung, không thêm editorial owner trùng nghĩa. Description + ít nhất một cover READY là điều kiện xuất bản nội bộ; giữ topic/source/event/version/ordered episodes hiện có.
- Màn duyệt: hiện nguồn audio/model/voice, form assessment, acceptance notes, snapshot lịch sử; người nghe thấy AI disclosure/credits từ approval của bản published. Series UI thêm language, không dùng profile Apple artwork cho nội bộ.

## Phân công và thứ tự

1. Backend gates: DB/shared/contracts, releases/content implementation, series server metadata, OpenAPI, regression test source (không chạy).
2. Voice: job/hash/voice schemas và test source (không chạy); phối hợp attach integration với backend gates.
3. Web: review/admin exception/public disclosure/series metadata, callsite migration và test source (không chạy).
4. Sau khi toàn bộ code xong: generate Prisma/migration, typecheck + regression suite, DB và browser smoke. Không gọi Gemini thật nếu không cần.

## Nghiệm thu

Admin thiếu/lý do ngắn bị từ chối; non-admin bị 403; hợp lệ ghi audit và snapshot. Hai reviewer đồng thời chỉ một quyết định thành công. Gửi duyệt/duyệt không nhận revision cũ. Approval không còn hợp lệ sau sửa script/audio. Audio AI cũ không attach vào script mới. Review ghi đủ kết luận và warning reason khi cần. Publish kiểm rights expiry/disclosure/current approval. Series thiếu metadata không publish; thông báo đúng UI/server. Duyệt/yêu cầu sửa và public disclosure chạy thật cuối cùng.

## Trạng thái và kiểm tra cuối (2026-10-23)

- Implementation: hoàn tất phạm vi phase 8; không commit/push.
- Prisma generate + migration additive `20261023120000_publication_gates`: áp DB development và DB test riêng, không reset dữ liệu.
- Typecheck API/web: pass sau tích hợp cuối.
- API focused regression: 45 pass (publication gate, audio origin, speech text/voice, release HTTP/service).
- PostgreSQL test riêng: 16 pass cho submit/decision/approval/expiry/exception; thêm 1 publication round-trip pass (38 assertions) kiểm evidence, snapshot, public privacy và exception audit.
- Studio middleware: 2 pass; Admin tới được content publish, quiz vẫn chỉ cho Mod.
- Web targeted: assessment, exception dialog, public notice và Admin review tests pass sau sửa đồng bộ query. Không full-suite theo yêu cầu.
- Browser thật: Admin hàng chờ → Xem chi tiết → form duyệt; mở ngoại lệ có cảnh báo, lý do và kết luận bắt buộc, nút submit khóa khi thiếu. Đã chụp ảnh.
- HTTP thật: Admin gọi ngoại lệ thiếu hồ sơ/lý do ngắn trả 400 VALIDATION_ERROR. Không publish dữ liệu thật của người dùng; publish thành công được kiểm trong DB test riêng.
- Sửa từ smoke: nối ngoại lệ vào dialog Admin thay vì chỉ workspace Mod; thu hẹp quiz middleware wildcard vốn chặn Admin trên toàn `/api/studio`, có regression.
- Giới hạn: không full E2E Mod/worker, không Gemini thật, không full-suite; hạ tầng test UI còn cảnh báo act nhưng assertions pass. TTS RAM/temp vẫn mất job chưa gắn qua restart.
- Đồng bộ README, PODCAST-AI-BACKEND-NOTES, spec readiness và plan. Không đánh dấu các kiểm tra phase 4–5 cũ thành hoàn tất.
