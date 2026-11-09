# Hồ sơ mobile — tích hợp local và bàn giao deploy

## Quyết định đã chốt

- Agent chỉ thay đổi, build và kiểm tra local. Người dùng tự push/deploy production.
- Nghe gần đây chỉ hiển thị bản kể có ít nhất **5 giây được backend chấp nhận**. Sync0% vẫn tạo phiên/progress nhưng chưa đưa tập mới vào lịch sử.
- UI dùng Tamagui/token/shared UI; không đưa lại nhiệm vụ tuần, lịch hồ sơ, bảng vinh danh hoặc UI xóa tài khoản đã bỏ.

## Code đã nối

1. Backend: đầy đủ API top quiz, sync phiên nghe, ranking personal/system tuần/tháng, playlist. History lọc playedSeconds>=5 trước grouping/pagination.
2. `usePlayback.ts`: UUID/bitmap riêng mỗi phiên, sync khởi tạo rỗng trước phát; pause/resume/background/retry giữ ID. Chọn tập mới, replay hoặc Dừng rồi phát lại tạo ID mới. Thu nhỏ player giữ phiên đang phát. Vị trí local tách theo user/narration.
3. Sync giữ bitmap lifetime riêng bitmap phiên. Writes theo audio được tuần tự hóa; retry phiên cũ dùng vị trí lifetime mới nhất để không ghi đè vị trí replay. Phiên đã đóng được retry trong bộ nhớ khi app còn chạy và cùng user; không cam kết phục hồi các request chưa gửi khi tiến trình bị kill.
4. Replay chờ seek và kiểm tra generation để Stop/source change hủy được thao tác chờ. Queue nhận completion theo session ID đã thực sự chơi, không dùng lại didFinish cũ của Expo khi đổi track.
5. `features/personal-library`: service/hook/UI ranking, playlist list/detail, tạo/đổi tên/xóa có xác nhận, thêm/bỏ/sắp xếp tập. Profile preview4; list5/trang; đổi tuần/tháng đồng bộ cả hai ranking. User ID trong cache key; logout hủy/xóa cache.
6. Player: Thêm vào playlist, Dừng phát, tập trước/tập tiếp và tự sang tập sau khi kết thúc. Queue dùng thứ tự playlist đã tải, bỏ qua tập unavailable và kiểm tra lại metadata trước khi phát. Dữ liệu playlist được tải phân trang, đọc toàn bộ chỉ khi phát/reorder (tối đa500 tập).

## Kiểm tra thật đã chạy

- Docker PostgreSQL18-alpine riêng: `suky-profile-integration-20261109`, localhost55439, DB `suky_profile_test`. Không sử dụng volume/dev DB đang có.
- Đã áp dụng toàn bộ27 migration từ DB trống, bao gồm `20261109100000_listening_sessions` và `20261109110000_private_playlists`.
- Chạy17 file API test với RUN_INTEGRATION=1: **61 pass,0 fail,0 skip,301 assertions**, gồm cả3 test PostgreSQL trước đây bị skip. Log: `artifacts/integration-local/api-tests.log`.
- PostgreSQL xác minh SQL aggregate quiz, phiên trong transaction/ownership/rollback, ranking tuần/tháng/phân trang/ẩn/cross-user, playlist duplicate/reorder/unavailable và cascade khi xóa user. Fixture rollback, sau test users/sessions/playlists đều0.
- TypeScript shared/db/API/mobile đạt; bộ test mobile có sẵn5 pass. Không thêm dependency.
- Bundle Android xuất thành công2475 modules, output OS temp `suky-profile-integrated-mobile-final-20261109`; script kiểm tra integration cũng qua TypeScript của scripts.
- Rerun nhóm kiểm tra: `bun scripts/check-profile-integration.ts` (từ root). Script chỉ chấp nhận database localhost có tên chứa test; mặc định dùng container QA trên. Có thể đặt PROFILE_TEST_DATABASE_URL trong process để chọn DB test local khác. DB cần migrate trước.
- Đã build Docker image local bằng Dockerfile API với --no-cache: `suky-api:profile-local-20261109`, image ID `sha256:203ec915493eebcfa681ffb04e85642707a9023de7881597564f488212f1b9c3`. Đã kiểm tra trong container không mạng: Prisma có ListeningSession/Playlist/PlaylistItem, hợp đồng session và history min5 có trong source image. Chưa push image.
- Review độc lập đã xử lý các lỗi retry position, retry retired queue, Stop/replay race và completion cũ; lượt review cuối không còn lỗi quan trọng tại thời điểm ghi nhận.

## Android và giới hạn nghiệm thu

Đã mở app trên emulator API35 và chụp/xem UI Tamagui: profile các mục mới, ranking tuần/tháng, playlist list/create và validation tên trống. Ảnh trong `artifacts/integration-local/` (`rankings.png`, `playlists.png`, `playlists-validation.png`). App hiện vẫn trỏ server remote từ apps/mobile/.env; môi trường này chưa cùng backend revision. Vì vậy các màn mới có thể hiển thị lỗi tải hoặc chưa đồng bộ được phiên. Không đổi .env, không dùng dữ liệu giả trên product UI để thay bằng chứng.

Chưa xác nhận end-to-end thành công trên Android với backend mới: full playlist CRUD, phát queue>=3 tập, autoplay/skip/stop race, ranking cập nhật sau nghe thật. Các luồng đã nối trong code; cần kiểm tra sau khi người dùng deploy backend (hoặc tự trỏ app về backend local phù hợp). PostgreSQL integration không thay thế kiểm tra native audio lifecycle.

## Trình tự deploy do người dùng thực hiện

1. Xem `docs/docker-build-push-guide.md`, `docs/deploy-log.md`, Makefile.prod và pending migrations trên VPS. Giữ nguyên dữ liệu/volume production; chuẩn bị bản sao lưu theo quy trình của bạn.
2. Build/push image từ source đã kiểm tra; hoặc tự tag image local trên vào registry bạn đang dùng. Agent không push. API và worker phải dùng cùng image/revision; Prisma Client được generate trong Dockerfile.
3. Chạy migrate deploy trước API/worker mới. Makefile.prod target deploy đã theo thứ tự pull → DB healthy → migrate → up API/worker. Không dùng target clean, reset hoặc seed lại DB có dữ liệu.
4. Xác minh OpenAPI có GET /api/me/top-quizzes, GET /api/me/top-podcasts, nhóm /api/me/playlists và cặp sessionId/sessionPlayedBitmap trong PUT tiến độ. Kiểm tra API/worker health.
5. Sau backend mới hoạt động mới phát hành/chạy mobile mới. Client khởi tạo phiên trước khi phát, do đó server cũ không trả listeningSession sẽ báo lỗi và không bắt đầu phát. Ranking rỗng cho tới khi có phiên mới đạt ngưỡng; không backfill progress cũ.
6. Nghiệm thu Android: sync đầu không hiện lịch sử; đủ5 giây bắt đầu hiện; đạt ngưỡng phiên cập nhật ranking; pause/resume/retry không nhân lượt; replay/đổi tập đúng UUID; playlist thứ tự/next/previous/unavailable; đổi user không lẫn dữ liệu.

## Production snapshot — 2026-11-09

- OpenAPI production hiện công bố GET /api/me/top-quizzes, GET /api/me/top-podcasts, nhóm routes /api/me/playlists, cùng sessionId/sessionPlayedBitmap trong PUT progress và listeningSession trong response.
- GET /health trả status=ok, database=connected, queue=running và releaseWorker=running.
- Chưa xác minh migrations production đã áp dụng hoặc các API thành công bằng session đăng nhập. Health/OpenAPI không chứng minh bảng listening_sessions/playlists tồn tại hoặc truy vấn ranking/playlist chạy thành công.
- Còn lại: xác nhận migration state theo deploy pipeline; sau đó kiểm tra Top quiz, session sync, ranking và playlist trên Android production bằng session đăng nhập. Không chạy deploy/migration từ agent.
