# API-first: phiên nghe, ranking và playlist

Đã chốt: agent chỉ code/kiểm tra local, người dùng tự deploy production; giữ tương thích client cũ. Nhóm A/B/C và mobile integration đã hoàn thiện local, PostgreSQL test riêng đã đạt; trạng thái ở `LOCAL-PROFILE-INTEGRATION-HANDOFF.md`. OpenAPI production hiện công bố routes mới và /health báo DB/queue chạy; migration state và luồng authenticated end-to-end vẫn cần xác nhận.

## Nhóm A — Ghi nhận phiên nghe (đã triển khai local, đã duyệt)

- Bổ sung `sessionId` và `sessionPlayedBitmap` tùy chọn, phải gửi cùng nhau, vào PUT /api/me/listening-progress/{narrationId}. Không có cặp này: hành vi cũ, không ghi phiên/ranking.
- Bitmap phiên là dữ liệu nghe duy nhất của phiên, không dùng lại bitmap tiến độ cộng dồn. Nghe lại đoạn trong cùng phiên không cộng thêm; phiên khác được tính riêng.
- Backend xác định startedAt tại sync đầu tiên. Client mới cần sync ngay khi bắt đầu phát, bitmap ban đầu rỗng; không nhận timestamp bắt đầu tin cậy từ client. Pause/resume/background/retry giữ UUID. Backend không thể tự suy ra đóng player từ request.
- Session ID duy nhất toàn hệ thống; transaction giữ thứ tự khóa progress row rồi session row. Từ chối dùng ID cho user/narration/episode/asset khác. Ghi phiên và progress trong cùng transaction. Audio thay đổi phải tạo phiên mới.
- Ngân sách phiên cộng dồn theo thời gian từ sync đầu và max_playback_rate, không cấp lại tolerance mỗi retry. Chỉ nhận giây unique trong ngân sách. Bitmap có độ phân giải một giây; bit cuối được tính phần duration thực còn lại.
- Đủ điều kiện khi >=min(30 giây,80% duration). qualifiedAt chỉ đặt một lần. Session startedAt không đổi, là mốc lọc kỳ tương lai; chưa làm API ranking ở nhóm A.
- Lưu user/narration/episode/asset/start/update/bitmap/playedMs/qualifiedAt; FK user/narration cascade, episode/asset restrict. Account deletion xóa phiên cùng user. Worker bảo trì dọn phiên hơn13 tháng lịch theo UTC; các bước ranking sẽ áp dụng tuần/tháng Việt Nam.
- Files: shared schemas/listening; Prisma schema+migration mới; listening domain/repository/application policy và service; OpenAPI; maintenance jobs; API tests và tài liệu này. Không sửa migration đã chạy, không deploy/apply migration lên DB thật.
- Kiểm tra: schema legacy/new; ngưỡng30s/track ngắn/bit cuối; retry, overlap, replay, ngân sách; ownership/asset conflict; transaction, migration và OpenAPI; DB test opt-in nếu môi trường sẵn sàng. Dừng review trước nhóm B.

## Nhóm B — Ranking cá nhân/toàn hệ thống (đã triển khai local, chờ nghiệm thu)

`GET /api/me/top-podcasts?scope=personal|system&period=week|month&page=1&limit=4`.

- Mọi role đăng nhập, kể cả scope system; scope personal lấy user từ session, query userId không hợp lệ.
- Kỳ hiện tại: tuần bắt đầu thứ Hai00:00 hoặc tháng lịch theo Asia/Ho_Chi_Minh, khoảng [start,end). Response có window.start/end/timezone để client đồng bộ kỳ.
- Chỉ đếm session qualified; lọc startedAt, không lọc theo thời điểm qualify để chuyển sai kỳ. Hai narration của cùng episode được gộp. Tổng session trả listenCount, không trả user/email/session ID.
- Chỉ xếp hạng tập/series công khai, không xóa mềm, có ít nhất một audio READY hợp lệ; không backfill ListeningProgress cũ. Số lượt DESC, tên ASC, episode ID ASC.
- Count/page trong RepeatableRead transaction; LIMIT/OFFSET tại DB, rank tính toàn danh sách. Default preview4, tối đa50/trang, client tương lai dùng5 ở màn đầy đủ.
- Shared schemas/podcast-ranking.ts; listening/application/podcast-ranking-window.ts/service.ts, presentation/podcast-ranking.routes.ts; mount qua meListeningRoute; OpenAPI paths/listening.ts. Không migration mới cho ranking.

## Nhóm C — Playlist (đã triển khai local, chờ nghiệm thu)

Model owner-scoped Playlist/PlaylistItem, unique episode trong playlist, thứ tự persist; chỉ episode, không series; mọi role quản lý của mình.

| Method | Route | Chức năng |
|---|---|---|
| GET | /api/me/playlists | List metadata, phân trang |
| POST | /api/me/playlists | Tạo tên1–100 ký tự, Idempotency-Key bắt buộc |
| GET | /api/me/playlists/{id} | Metadata và items phân trang theo thứ tự |
| PATCH | /api/me/playlists/{id} | Đổi tên |
| DELETE | /api/me/playlists/{id} | Xóa playlist và items, không xóa episode/progress |
| POST | /api/me/playlists/{id}/items | Thêm episodeId vào cuối, duplicate không nhân đôi |
| DELETE | /api/me/playlists/{id}/items/{episodeId} | Bỏ tập; retry bỏ tập đã bỏ vẫn thành công |
| PUT | /api/me/playlists/{id}/items/order | Gửi toàn bộ episodeIds theo thứ tự mới |

- Owner luôn lấy từ session. Không tồn tại/khác owner đều404. Strict body/query; write rate-limit hiện có.
- Thêm tập phải published cả episode/series và có audio READY; lỗi422 VALIDATION_ERROR. Metadata unavailable vẫn được giữ khi ẩn/xóa mềm/hết audio; narrations=[] để client bỏ qua. Xóa cứng episode cascade item; thứ tự có thể có khoảng trống sau remove.
- Giới hạn500 tập/playlist và reorder tối đa500; quyết định giới hạn tài nguyên của triển khai, không thêm cấu hình tổng quát. Client phải đọc đủ trang trước reorder.
- Mọi mutation khóa parent row theo cả id/owner trước khi đọc/ghi. Reorder kiểm tra exact set, thiếu/thừa/trùng trả409 hoặc400 validation, cập nhật position bằng một câu SQL parameterized để tránh500 lượt DB và timeout.
- Tạo playlist dùng middleware idempotency hiện có. Thêm/bỏ/reorder có tính lặp an toàn theo trạng thái; không tạo hệ thống idempotency mới.
- User deletion cascade Playlist/items cùng ListeningSession; không sửa nội dung chung. Khi lấy danh sách/chi tiết chỉ trả metadata và narration IDs/duration, dùng API playback hiện có để lấy audio URL và lưu tiến độ sau này.
- Shared schemas/playlists.ts; module playlists/service+routes; docs paths/playlists.ts và tag Playlists. Migration mới `20261109110000_private_playlists`; chưa apply DB. Không thêm UI trong đợt này.

## Hướng dẫn deploy A/B/C và kiểm tra sau deploy

1. Deploy source và generate Prisma Client: từ root chạy `bun run --cwd packages/db db:generate`.
2. Người dùng trỏ DATABASE_URL đúng môi trường rồi chạy migration theo pipeline hiện có (`bun run --cwd packages/db db:deploy`). Migration mới: `20261109100000_listening_sessions` và `20261109110000_private_playlists`; chỉ tạo bảng/index/FK/check, không backfill hoặc đổi dữ liệu tiến độ cũ. Áp dụng migration trước khi khởi động API/worker bản mới.
3. Khởi động lại API và worker theo quy trình deploy của người dùng; worker bảo trì hiện có sẽ đăng ký lịch dọn session.
4. Client cũ tiếp tục PUT như cũ. Khi triển khai client mới sau này: gửi cặp sessionId/sessionPlayedBitmap; sync đầu rỗng ngay lúc bắt đầu để định mốc thời gian server, giữ UUID theo vòng đời player. Chưa có client gửi cặp này trong đợt API-first nên deploy backend một mình chưa phát sinh phiên từ mobile cũ.
5. Kiểm tra PUT legacy và PUT mới trong OpenAPI, xác nhận response listeningSession/qualifiedAt và một row duy nhất qua retry trước khi nối API ranking.

Agent không chạy migrate/seed trên DB dev hoặc production và không deploy server. Đã chạy migrate deploy trên DB test mới, riêng biệt localhost55439 để kiểm chứng. Test PostgreSQL cần DB test đã migrate, tên DB chứa `test`, `RUN_INTEGRATION=1`; không dùng DB production cho integration test.

## Kết quả kiểm tra nhóm A

- Generated Prisma Client local thành công; Prisma validate đạt (URL kiểm tra placeholder trong process, không kết nối hay sửa env).
- TypeScript packages/shared, packages/db, apps/api và apps/mobile đạt; test mobile có sẵn5 pass.
- API suites session policy/contract/repository/integration, history contract, podcast-core và OpenAPI:19 pass,1 skip,0 fail. Test integration PostgreSQL là opt-in, chưa chạy; chưa tuyên bố đã kiểm chứng migration/cascade/concurrent locking trên DB thật.
- Policy tests: unique overlap/retry, ngưỡng30 giây, track ngắn và biên37.5 giây, bit cuối fraction, ngân sách tuyệt đối, replay phiên mới, retention13 tháng lịch.
- Repository tests dùng adapter giả: legacy không ghi phiên, start/qualifiedAt không đổi, session ID dùng lại sai user/narration/asset bị409 trước khi ghi progress. Integration opt-in thêm kiểm tra SQL row, retry không tạo trùng, rollback progress khi conflict và cascade xóa user trên DB test.
- Review độc lập không phát hiện lỗi correctness/security/compatibility quan trọng. Đã thống nhất tài liệu theo thứ tự khóa progress→session của code.
- Migration đã tạo trong source, **chưa áp dụng vào database**; không deploy, không đổi UI hay sync mobile. Nhóm B/C chưa triển khai, chờ review nhóm A.

Ghi chú trạng thái: dòng trên là kết quả tại lúc bàn giao A; sau khi A được duyệt, B/C đã được triển khai như các mục bên trên.

## Kết quả kiểm tra B/C

- Prisma Client generate và schema validate đạt; TypeScript shared/db/API/mobile đạt; mobile5 test có sẵn đạt. Không thêm dependency, không đổi web/UI mobile/env/server.
- Kiểm tra tổng hợp API:57 pass,3 skip,0 fail (16 files,261 assertions), gồm ranking windows/route/service, playlist contracts/routes/service, session A, top quiz, profile và OpenAPI.
- Test ranking kiểm tra biên thứ Hai/UTC, tháng/năm nhuận/year rollover, scope binding và không trả listener ID, auth ba role, unknown owner/invalid period/page/limit; query count/page đúng schema.
- Test playlist kiểm tra owner mọi endpoint/ba role, guest401, owner/series injection, exact set reorder, duplicate-safe append, thao tác foreignowner404. SQL reorder mới được review lại, không có lỗi quan trọng.
- Test PostgreSQL opt-in mới kiểm tra dữ liệu ranking qualified/window/hidden/group/scope và playlist CRUD/duplicate/reorder/unavailable/cascade. Chưa chạy do Docker daemon/DB test chưa sẵn sàng; không tuyên bố đã xác minh migration/concurrency/FK trên database thật. Ba test skip gồm session, ranking-playlists và top-quiz integration.
- Chưa deploy/apply migration. Ranking sẽ rỗng cho tới khi có client mới gửi session fields và đủ ngưỡng; không tạo dữ liệu thống kê giả từ progress cũ.
- Sau khi người dùng deploy API/migrations: kiểm tra các endpoint ở /docs, chạy integration trên DB test đã migrate và nghiệm thu với dữ liệu thật trước khi nối UI Task4–7.

## Cập nhật tích hợp local sau review API

- Đã nối code sync mobile phiên nghe và UI Task5–7 bằng Tamagui; không đổi .env hoặc deploy production.
- Nghe gần đây đã chốt tối thiểu5 giây được backend chấp nhận, thay cho hiển thị ngay từ sync0%.
- Đã khởi động Docker và tạo PostgreSQL test riêng localhost55439, áp dụng toàn bộ27 migration. Lượt kiểm tra API bật integration:61 pass,0 fail,0 skip;3 integration trước đây skip đã thực thi thật. DB dev/prod không bị tác động.
- Đã build và kiểm tra image API local `suky-api:profile-local-20261109`, có Prisma Client/model và hợp đồng mới; chưa push image.
- Các dòng skip/chưa nối UI ở phần kết quả A/B/C phía trên là lịch sử của đợt API-first, được thay thế bởi bằng chứng trong `LOCAL-PROFILE-INTEGRATION-HANDOFF.md`.
