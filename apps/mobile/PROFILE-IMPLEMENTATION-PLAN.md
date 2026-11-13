# Hồ sơ Mobile — Theo dõi triển khai theo từng bước

**Trạng thái hiện tại:** Bước 1–2 đã nghiệm thu. Code/UI/sync Task3–7 đã hoàn thiện local; PostgreSQL test riêng đã chạy 27 migrations và 61 API integration tests đạt. OpenAPI production hiện công bố APIs mới; `/health` báo DB connected và queue running. Migration state và authenticated end-to-end trên Android chưa xác nhận.
**Spec:** `USER-PROFILE-FEATURES-SPEC-PLAN.md`.
**Tích hợp local mới nhất:** xem `LOCAL-PROFILE-INTEGRATION-HANDOFF.md`: sync phiên, UI ranking/playlist đã nối; lịch sử chỉ hiện sau5 giây;27 migrations và61 API tests (không skip) đã chạy trên PostgreSQL test riêng. Image API local đã build; người dùng tự deploy production.
**Bằng chứng tích hợp local:** `LOCAL-PROFILE-INTEGRATION-HANDOFF.md` ghi rõ migration, DB test, kiểm tra API, build mobile, ảnh và giới hạn end-to-end.
**Bước tiếp theo:** xác nhận migrations session/playlist đã áp dụng trên production; sau đó kiểm tra API bằng session đăng nhập và chạy end-to-end Android cho Task3–7. Dừng chờ người dùng review; agent không tự deploy.

## Phạm vi đã hoàn tất

- [x] API hồ sơ dùng chung cho `user`, `moderator`, `admin`; mọi thao tác lấy danh tính từ session và chỉ áp dụng cho tài khoản của mình.
- [x] Tái sử dụng đăng ký Better Auth cho Create; `GET /api/me` xem hồ sơ; `PATCH /api/me` sửa tên/gỡ avatar.
- [x] `POST /api/me/avatar` upload JPEG/PNG/WebP tối đa 5 MiB, kiểm tra MIME/chữ ký file, cập nhật avatar và dọn ảnh cũ.
- [x] `DELETE /api/me` yêu cầu mật khẩu hiện tại và `confirm=true`; xóa dữ liệu cá nhân theo transaction, giữ nội dung/media dùng chung và chặn admin hoạt động cuối cùng. API được giữ, **giao diện xóa tài khoản đã bỏ theo yêu cầu**.
- [x] Đồng bộ hồ sơ với Zustand, dữ liệu phiên lưu trên máy và TanStack Query sau khi cập nhật.
- [x] UI mobile dùng Tamagui, token và component trong `shared/ui`; không còn className, StyleSheet, mã màu hex hay style prop trong các component hồ sơ đã chuyển.
- [x] Giữ safe area, xử lý bàn phím, loading/error/retry, validation và disabled khi đang thao tác.
- [x] Cập nhật shared schema/OpenAPI, kiểm tra quyền và review code.
- [x] Kiểm tra trực tiếp Android, chụp và tự xem ảnh; người dùng đã nghiệm thu giao diện cuối cùng.

## Giao diện cuối cùng đã nghiệm thu

- Tab Tôi: nhấn vùng avatar/tên hoặc mũi tên trong header để mở route `/profile`. Không có nút chỉnh sửa rời, không có hai ô Tổng XP/Nhiệm vụ hoàn thành dưới header.
- Trang chỉnh sửa: avatar có nút bút để chọn ảnh, bên dưới là tên và email hiện tại; giữ gỡ ảnh khi có avatar.
- Form chỉ có tên hiển thị, validation/lỗi và nút Lưu hồ sơ. Không lặp email trong card nhập, không có chữ chọn ảnh/mô tả định dạng hoặc khối xóa tài khoản.
- Giữ luồng đăng xuất, đăng nhập/đăng ký, chọn/upload/thay/gỡ avatar và điều hướng. Email/mật khẩu vẫn dùng flow Better Auth riêng.
- Không thay giao diện web. Không thêm dependency/token trong đợt chuẩn hóa Tamagui.

## Kiểm chứng đã ghi nhận

- Shared/API/mobile TypeScript đã đạt trong đợt triển khai API; TypeScript mobile đạt sau lần sửa UI cuối cùng.
- Bộ kiểm tra API liên quan: 33 pass, 0 fail trong đợt triển khai API. Đây là bằng chứng của đợt API, không phải tuyên bố chạy lại sau mỗi chỉnh sửa giao diện.
- Android bundle đã xuất thành công trong đợt triển khai; đợt Tamagui kiểm tra trực tiếp trên Expo Go, emulator Android API 35.
- Đã kiểm tra nền giấy, phân cấp chữ/nút, avatar, safe area, cuộn, input focus, validation, loading, lỗi mất mạng và thử lại. Đã kiểm tra nút bút mở thư viện ảnh và hủy chọn.
- Khu vực xác nhận xóa đã được kiểm tra trước khi người dùng yêu cầu bỏ khỏi giao diện. Không thực hiện xóa tài khoản thật.
- Không thêm test trong đợt chuẩn hóa Tamagui. Không chạy Git hoặc migration trên dữ liệu thật.
- Ảnh và ghi chú: `artifacts/profile-tamagui/CHECKS.md`; `main.png` và `editor.png` mô tả giao diện cuối. Ảnh validation/xác nhận xóa cũ được ghi rõ là lịch sử trong CHECKS.md.

## Giới hạn vận hành đã biết

- Dọn ảnh Cloudinary sau thay/gỡ/xóa là best effort; lỗi ghi log để xử lý, chưa có worker retry tự động.
- Các kiểm tra service dùng database/storage được thay thế trong test; không coi chúng là bằng chứng đã thử xóa thật, cascade và thu hồi session trên database thật.
- Việc bỏ giao diện xóa tài khoản là quyết định sản phẩm đã duyệt, không phải hạng mục còn thiếu của Bước 1. Chỉ đưa UI này trở lại khi có yêu cầu mới.

## Bước 2 — Nghe gần đây + Xem tất cả (đã nghiệm thu)

1. Mở rộng service lịch sử nghe để nhận `page`, `limit`, `status` và giữ metadata phân trang; hiện wrapper chỉ lấy page=1, limit=10 rồi trả mảng items.
2. Profile gọi `GET /api/me/listening-history?page=1&limit=4&status=all`, tối đa 4 dòng mới nhất; thêm Xem tất cả.
3. Tạo màn lịch sử đầy đủ bằng Tamagui/shared UI, mỗi trang 5 mục, có phân trang và bộ lọc Tất cả/Đang nghe/Đã nghe (`all`/`in_progress`/`completed`). Preview trên profile vẫn là tối đa 4 mục.
4. Nối điều hướng từ profile và kiểm tra nghe tiếp đúng bản kể (`lastNarrationId`) và vị trí đã lưu, tái sử dụng player hiện tại.
5. Kiểm tra guest, loading/error/retry/empty, đổi bộ lọc và trang, cache sau nghe/đăng xuất, tập không còn phát được; kiểm tra/chụp Android.
6. Báo kết quả; người dùng đã nghiệm thu Bước 2 và mở Bước 3 — Top quiz.

API lịch sử đã có phân trang và ba trạng thái trên. Ưu tiên tái sử dụng; chỉ sửa backend nếu rà soát triển khai phát hiện thiếu hợp đồng hoặc hành vi cần thiết.

### Phân chia triển khai Bước 2

- `features/listening-history`: service/schema dùng chung hiện có; hook TanStack Query; dòng lịch sử dùng chung; màn danh sách đầy đủ, không tạo hệ thống player mới.
- `heritage-app/screens/ProfileScreen.tsx`: preview limit=4, Xem tất cả và dòng dùng chung.
- `heritage-app/HeritageApp.tsx`, `types.ts`, `appLogic.ts`: màn listeningHistory dưới tab Tôi; giữ bộ lọc/trang khi quay lại từ player; nạp đúng bản kể, chống tap lặp và báo lỗi nếu bản kể/tập không còn khả dụng.
- `heritage-app/usePlayback.ts`: nhận yêu cầu resume cụ thể từ lịch sử (kể cả cùng bản kể đang chọn), tiếp tục dùng audio và đồng bộ progress hiện có; invalidate cache lịch sử sau sync thành công.
- `heritage-app/podcastApi.ts`: bỏ wrapper lịch sử cũ sau khi chuyển các caller sang service lịch sử có phân trang.
- UI Tamagui/token/shared UI; không thêm dependency, không thay backend hoặc schema DB khi API hiện tại đã đáp ứng. Không thêm test mới theo yêu cầu UI mobile hiện hành; kiểm tra TypeScript, kiểm tra có sẵn phù hợp và thao tác Android/screenshot.

### Kết quả triển khai và kiểm chứng Bước 2

- Preview gọi limit=4; màn đầy đủ gọi limit=5, page/status. Giữ episode.available và thời điểm nghe, không tải toàn bộ lịch sử vào mobile.
- Tái sử dụng API/schema có sẵn; không đổi backend, migration, dependency hoặc web UI.
- Hàng lịch sử chung hiển thị tập/series/progress/trạng thái, ngày ở màn đầy đủ; tập unavailable bị vô hiệu hóa. Có guest/loading/error/retry/empty và phân trang biên.
- Chọn tập kiểm tra lastNarrationId còn trong tập, khóa tap lặp và bỏ kết quả khi đã rời màn/đổi user. Player nhận yêu cầu resume một lần, await seek rồi mới phát; giữ replay về đầu với vị trí sát cuối theo cơ chế player hiện có. Quay lại danh sách giữ trang/bộ lọc; Android Back được xử lý.
- Sync progress thành công invalidate query lịch sử theo user. Đăng xuất từ profile hủy/xóa cache lịch sử; cache phân trang có userId/status/page/limit.
- TypeScript mobile đạt. Các test điều hướng/auth hiện có: 5 pass, 0 fail. Không thêm test.
- Lỗi test NativeWind cũ đã được xử lý theo yêu cầu review: bỏ `tests/nativewind.test.ts` vì nó yêu cầu các utility `.gap-6`/`.flex-1`/`.min-h-12` không còn là hợp đồng UI sau khi chuyển sang Tamagui. Script test dùng `bun test` để tự tìm toàn bộ test mobile, không giới hạn vào feature cũ hay thư mục test rỗng. Không thêm utility giả, không skip test, không thay cấu hình runtime. Kết quả chạy lại được ghi bên dưới.
- Android emulator kiểm tra/chụp và tự xem: Xem tất cả, 8 tập lịch sử, lọc 2 đang nghe/6 đã nghe tại thời điểm kiểm tra, trang 2 của bộ lọc hoàn thành, đổi bộ lọc về trang 1, mở player và quay lại, ảnh lỗi mất mạng. Thao tác phát thật có thể cập nhật progress/history của tài khoản đang đăng nhập như sử dụng app bình thường.
- Đã khôi phục mạng emulator sau kiểm tra. Các trường hợp guest, tài khoản chưa có lịch sử, tập unavailable và tập có nhiều bản kể chưa có đủ dữ liệu emulator để xác nhận trực quan; được xử lý trong code, không tuyên bố đã kiểm chứng đầy đủ trên thiết bị.
- Không xác minh trực tiếp DB vị trí chính xác: DB local cấu hình port 5433 không kết nối được; không đổi cấu hình hay tạo dữ liệu để vượt qua. Luồng resume dùng vị trí trả từ history và đã mở/phát lại trên Android; cần người dùng nghiệm thu thêm bản kể/vị trí thực tế với dữ liệu của mình.
- Ảnh/ghi chú ở `artifacts/listening-history/`. Bước 2 đã nghiệm thu; tiếp tục Bước 3 theo task brief bên dưới.

### Sửa lỗi P1 bộ test mobile — 2026-11-09

- Đã tái hiện lỗi trước khi sửa: test NativeWind yêu cầu các class đã bỏ khỏi source Tamagui.
- Bỏ kiểm tra cũ theo yêu cầu review; giữ nguyên các test điều hướng và validation/auth có ý nghĩa với hành vi hiện tại.
- Không thêm test hoặc dependency; không sửa UI/API/auth/player trong lần bảo trì test này.
- Chạy lại trong `apps/mobile`: `bun run test` đạt **5 pass, 0 fail** (13 assertions, 2 file); `bun run check-types` đạt, exit code 0.

## Bước 3 — Top quiz cá nhân + Xem tất cả (local hoàn tất, route đã có trên production; E2E chờ xác minh)

### Mục tiêu

Hiển thị các quiz user đã làm nhiều nhất, dựa trên số lần nộp hợp lệ đã lưu trong `QuizAttempt`. Preview trên profile tối đa 4 quiz; màn “Xem tất cả” phân trang 5 quiz/trang.

### Quy tắc dữ liệu

- Đếm mọi lần nộp hợp lệ, dù đạt hay chưa đạt; không tạo bảng lịch sử mới.
- Chỉ dùng user ID từ session hiện tại. Không nhận user ID từ query/body để chọn chủ sở hữu.
- Xếp số lần nộp giảm dần; hòa thì lần nộp gần nhất trước, sau đó quiz ID ổn định.
- Trả metadata quiz/tập cần để hiển thị và mở quiz. Đánh dấu quiz còn công khai/khả dụng; nếu đã ẩn hoặc không còn mở được thì vẫn hiển thị hoạt động lịch sử nhưng vô hiệu hóa hành động mở.
- Summary dùng limit=4; danh sách mở rộng phân trang, không tải toàn bộ danh sách một lần.

### Phạm vi code dự kiến

- Backend: `apps/api/src/modules/gamification/gamification.service.ts`, `gamification.routes.ts`; thêm schema request/response ở `packages/shared/src/schemas/` theo feature; cập nhật OpenAPI `apps/api/src/routes/docs/paths/gamification.ts` và các test API tương ứng.
- Mobile: bổ sung service/hook cho top quiz; tích hợp preview vào `apps/mobile/src/features/heritage-app/screens/ProfileScreen.tsx`; tạo màn “Xem tất cả” trong feature-based structure hiện tại; nối item khả dụng vào luồng quiz hiện có trong `QuizScreens.tsx`/`HeritageApp.tsx`.
- Sau khi nộp quiz thành công, invalidate query top quiz để lượt mới xuất hiện.
- Dùng Tamagui, `tamagui.config.ts`, `shared/ui` và API/schema dùng chung. Không dùng NativeWind/Tailwind trong UI mobile, không thêm dependency, không đổi web hoặc DB schema trừ khi codebase chứng minh cần thiết.

### Trạng thái giao diện

- Loading, lỗi và retry, empty state có CTA tới thư viện quiz, danh sách kết quả, phân trang, quiz khả dụng và không khả dụng.
- Profile overview hiển thị không quá 4 item và “Xem tất cả”. Mỗi item ghi tên quiz/tập và số lần đã làm.
- Chọn item chỉ mở quiz nếu endpoint quiz hiện tại xác nhận nó còn khả dụng; không tạo luồng chấm điểm mới.

### Review gate Bước 3 — trạng thái cập nhật

- Endpoint chỉ trả thống kê của user hiện tại và đã được ghi trong OpenAPI.
- Counts, thứ tự tie-break, pagination, trường hợp quiz không còn công khai và empty state đúng quy tắc.
- UI profile/màn mở rộng dùng Tamagui/token và điều hướng đúng quiz hiện có.
- Cập nhật top quiz sau khi submit thành công.
- Code/API/UI và PostgreSQL integration local đã hoàn tất theo `LOCAL-PROFILE-INTEGRATION-HANDOFF.md`; OpenAPI production hiện có endpoint. Android end-to-end với session đăng nhập và dữ liệu thật còn chờ.
- Sau khi người dùng deploy, kiểm tra Top quiz tải được và ranking/attempt count cập nhật sau submit; báo pass/fail và dừng chờ người dùng nghiệm thu.
- Task 4–7 đã có code local; câu chỉ dẫn ban đầu “dừng trước Bước 4” đã được thay bằng quy trình production/end-to-end hiện tại.

### Code và quyết định triển khai

- `packages/shared/src/schemas/top-quizzes.ts`: request strict page/limit, response item/count/lastSubmittedAt/available; export từ shared.
- `apps/api/src/modules/gamification/top-quizzes.service.ts`: aggregate trực tiếp PostgreSQL từ QuizAttempt theo user ID truyền từ session; count mọi lần nộp, sort count DESC/MAX submitted DESC/quiz ID ASC; LIMIT/OFFSET ngay DB, total và trang dùng RepeatableRead transaction. Không tải toàn bộ attempt vào JS.
- `top-quizzes.routes.ts` mount trong meMissionRoute, requireAuth cho cả ba role, no-store và response parse. OpenAPI đã cập nhật trong paths/gamification.ts; không migration.
- Availability yêu cầu tập/series published, không deletedAt, còn câu hỏi, toàn bộ SINGLE để phù hợp API/luồng mobile hiện có. Quiz ẩn hoặc không tương thích vẫn hiện lượt lịch sử nhưng disabled.
- Mobile feature `top-quizzes` có service/hook/row/screen. Profile preview4 và Xem tất cả, danh sách5/trang; empty CTA thư viện quiz; state loading/error/retry/guest/unavailable.
- HeritageApp preflight endpoint quiz, kiểm tra quiz ID/câu hỏi, khóa tap lặp và chặn kết quả sau đổi màn/user. Dùng QuizEpisodeSummary và EpisodeQuizScreen hiện có. Quay lại đúng profile/danh sách và giữ trang; Android Back hỗ trợ.
- Query key `["me", "top-quizzes", userId, {page,limit}]`; submit quiz hiện có invalidate `["me"]`, nên không cần thay logic chấm điểm/submit. Logout profile hủy/xóa cache top quiz.
- Tamagui/shared UI/token; không thêm dependency, không thay web, không đưa lại nhiệm vụ/lịch/bảng vinh danh đã bỏ.

### Kiểm chứng và giới hạn Bước 3

- TypeScript shared/API/mobile: đạt. Bộ test mobile hiện có: 5 pass, 0 fail.
- **Ảnh chụp kiểm tra API-only ban đầu (đã được cập nhật bởi local integration bên dưới):** API top-quizzes + OpenAPI 11 pass, 0 fail; PostgreSQL integration 1 skip. Đây là kết quả trước khi tạo PostgreSQL test riêng.
- **Tình trạng mới nhất:** xem `LOCAL-PROFILE-INTEGRATION-HANDOFF.md`; 61 API integration tests chạy với DB test riêng, 0 skip. Các test top quiz cũng được chạy với integration bật.
- Đã mở Android Expo Go emulator API35: khu vực top quiz, Xem tất cả, màn loading rồi lỗi và retry có giao diện đúng token. Đã chụp và tự xem ảnh trong artifacts/top-quizzes.
- Snapshot lỗi tải ban đầu được chụp trước khi route production xuất hiện. OpenAPI/health hiện đã cập nhật, nhưng chưa xác nhận ranking/pagination/submit với session đăng nhập trên Android hoặc migration state của production.
- Review độc lập ở snapshot Bước 3 ban đầu: không phát hiện lỗi correctness/security quan trọng; các giới hạn live-data khi đó được cập nhật bởi phần tích hợp local mới nhất bên dưới. Task 4–7 hiện đã có code local theo handoff; production end-to-end vẫn chờ deploy.
- Android export cuối cùng: đạt, 2468 modules; output trong thư mục OS temp `suky-top-quizzes-verify-20261109`.
- Finding P1 trước đây về production thiếu APIs đã được giải quyết ở mức route publication: OpenAPI mới nhất liệt kê top quiz, top podcast, playlist và session fields trong progress PUT.
- `/health` hiện trả `status=ok`, `database=connected`, `queue=running`, `releaseWorker=running`. Health/OpenAPI không chứng minh migrations session/playlist đã áp dụng hoặc truy vấn DB thành công.
- Các endpoint riêng tư chưa được gọi bằng session đăng nhập. Chưa xác nhận ranking, session sync, playlist CRUD hoặc playback queue end-to-end trên Android production.
