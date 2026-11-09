# Hồ sơ người dùng Mobile — Đặc tả và kế hoạch triển khai

**Trạng thái:** Bước 1–2 đã nghiệm thu; API và code UI/sync Bước 3–7 đã hoàn thiện local, PostgreSQL integration đã chạy đạt. Chờ người dùng deploy backend và nghiệm thu Android end-to-end; agent không deploy production  
**Phạm vi:** UI chỉ trên Expo apps/mobile; API hồ sơ dùng chung cho user/moderator/admin, chỉ thao tác tài khoản của mình  
**Ngày:** 2026-11-09

## 1. Mục tiêu

Mở rộng màn Tôi / Hồ sơ cá nhân để user quản lý hồ sơ, xem hoạt động nghe và quiz của mình, khám phá podcast được nghe nhiều trên hệ thống, và tạo playlist cá nhân. Triển khai từng luồng hoàn chỉnh; sau mỗi bước sẽ báo cáo kết quả và chờ bạn duyệt rồi mới sang bước kế tiếp.

**Điều chỉnh thứ tự đã duyệt:** ưu tiên hoàn thiện API/model/migration local cho Task4–7 để người dùng deploy, rồi mới tiếp tục nối UI theo task. Chia ba review gate: A ghi nhận phiên nghe → B ranking cá nhân/toàn hệ thống → C playlist. Giữ tương thích client cũ, không tự deploy. Chi tiết ở `API-FIRST-IMPLEMENTATION-PLAN.md`.

**Trạng thái API-first:** A đã duyệt; B/C đã hoàn tất local. Sau đợt API-first, người dùng đã yêu cầu nối mobile và chạy DB thật: UI/sync Task4–7 đã nối, migration đã được kiểm chứng trên database test riêng. Lịch sử nghiệm thu Task1–2 giữ nguyên; production do người dùng cập nhật.

**Cập nhật sau tích hợp local:** đã apply toàn bộ27 migration trên PostgreSQL test riêng (không phải dev/prod),61 API tests với integration bật đều đạt, không skip. Đã nối code mobile sync phiên và UI ranking/playlist. Người dùng tự deploy production; app vẫn giữ API URL hiện có nên luồng thành công trên Android cần kiểm tra sau khi backend được người dùng cập nhật. Chi tiết mới nhất: `LOCAL-PROFILE-INTEGRATION-HANDOFF.md`.

## 2. Hiện trạng đã rà soát

- `apps/mobile/src/features/heritage-app/screens/ProfileScreen.tsx` là màn Tôi, dùng Tamagui và component/token chung. Header hiển thị avatar/tên/email và mũi tên mở route `/profile`; đã bỏ nút chỉnh sửa rời, hai ô Tổng XP/Nhiệm vụ hoàn thành và toàn bộ mục Nhiệm vụ tuần theo yêu cầu. Nghe gần đây nằm ngay sau header; màn này không còn gọi API nhiệm vụ tuần.
- HeritageApp.tsx đã có màn profile và điều hướng bottom tab tới đó. Theo yêu cầu bổ sung, header hồ sơ không còn biểu tượng mở lịch phát sóng; lịch ở các vị trí khác của ứng dụng được giữ.
- Bước 2 đã thay wrapper podcastApi.listeningHistory cũ bằng service/hook trong `features/listening-history`: preview limit=4, màn Xem tất cả phân trang 5 mục, bộ lọc all/in_progress/completed, giữ metadata từ API hiện có.
- Backend lưu một bản ghi tiến độ thay đổi dần cho mỗi user/narration. Không có lịch sử từng lượt nghe nên chưa thể xếp hạng tuần/tháng chính xác.
- Backend lưu từng lần nộp quiz trong QuizAttempt; có thể dùng dữ liệu này để tính quiz user làm nhiều nhất.
- Player mobile phát được danh sách tập truyền vào, nhưng playlist của user chưa được lưu trên backend.
- Bước 1 đã hoàn tất: GET/PATCH/DELETE `/api/me`, POST `/api/me/avatar`; API dùng chung cho ba role và chỉ thao tác tài khoản của mình. UI chỉnh sửa ở `features/profile`, route `src/app/profile.tsx`. API xóa tài khoản được giữ, nhưng UI xóa tài khoản đã bỏ theo yêu cầu người dùng.

**Tiến độ:** Bước 1–2 đã nghiệm thu. Bước 3 đã triển khai code và kiểm tra local; production chưa có `GET /api/me/top-quizzes`, nên app đang báo lỗi tải top quiz. Chưa thể xác minh ranking/submit trên dữ liệu thật cho tới khi endpoint được deploy. Bước 4–8 vẫn chờ duyệt sau review gate. Danh sách API lệch nhau nằm trong `PROFILE-IMPLEMENTATION-PLAN.md`.

## 2.1. Chuẩn UI mobile được chọn

- Dùng Tamagui cho layout và style của toàn bộ các màn trong phạm vi này.
- Ưu tiên component dùng chung trong `apps/mobile/src/shared/ui/` và token trong `tamagui.config.ts`; tra tên token/shorthand trong `tamagui-prompt.md`.
- Không thêm Tailwind/NativeWind `className`, `StyleSheet.create`, hoặc mã màu viết trực tiếp vào các màn profile.
- Có thể dùng React Native primitive cho hành vi native đặc thù như chọn ảnh/bàn phím; phần layout và màu vẫn phải theo Tamagui/token.
- Không sửa Tailwind của `apps/web`; không thêm dependency hoặc token mới nếu token/component hiện tại đáp ứng được.

## 3. Hướng giải quyết được chọn

### Ghi nhận từng phiên nghe đủ điều kiện

Thêm dữ liệu phiên nghe gọn nhẹ để tính top podcast theo tuần/tháng cho cá nhân và toàn hệ thống. Tái sử dụng QuizAttempt cho top quiz, API lịch sử nghe hiện tại cho Nghe gần đây, và thêm dữ liệu playlist riêng. Không dựng hệ thống analytics tổng quát.

Không chọn tính top tuần/tháng trực tiếp từ ListeningProgress, vì bản ghi hiện tại bị cập nhật đè và không lưu lịch sử theo kỳ. Cũng không cần nền tảng analytics tổng quát cho phạm vi hiện tại.

## 4. Phạm vi sản phẩm

### Bao gồm

1. Hồ sơ/tài khoản và avatar: API quản lý tài khoản của mình cho cả ba role; UI mobile xem/sửa hồ sơ và avatar đã nghiệm thu. UI xóa tài khoản đã bỏ theo yêu cầu; API xóa vẫn được giữ.
2. Danh sách nghe gần đây.
3. Top quiz user đã làm/ôn tập nhiều nhất.
4. Top podcast cá nhân theo tuần/tháng.
5. Top podcast toàn hệ thống theo tuần/tháng.
6. Tạo và quản lý playlist cá nhân gồm các tập podcast.
7. Mỗi mục xem trước tối đa 4 dòng; Xem tất cả mở danh sách có phân trang.

### Chưa bao gồm

- Hồ sơ công khai, theo dõi user khác, chia sẻ playlist, thích/bình luận hoặc đề xuất nội dung.
- Thay player hoặc thay cơ chế chấm điểm/soạn quiz.
- Thay đổi quyền moderator/admin.
- Bộ lọc tuần/tháng cho top quiz trong đợt đầu; mặc định top quiz tính mọi lần nộp từ trước đến nay.

## 5. Quy tắc chung đề xuất

- Track là một tập đã xuất bản và có audio phát được. Playlist chứa tập riêng lẻ, không chứa cả series.
- Một lượt nghe được tính khi phiên nghe đạt ít nhất 30 giây đã nghe duy nhất; với tập ngắn hơn 37,5 giây, cần nghe ít nhất 80% thời lượng. Mỗi sessionId chỉ được tính một lần dù có nhiều lần đồng bộ tiến độ.
- Vòng đời phiên nghe: tạo ID mới khi user bắt đầu phát một tập trong player mới hoặc chuyển sang tập khác. Tạm dừng, tiếp tục, app chuyển nền và retry mạng giữ cùng ID. Đóng player/chủ động dừng rồi phát lại tạo ID mới. Nếu tiến trình app bị tắt hẳn rồi mở lại và khôi phục tập, coi là phiên mới.
- Kỳ thời gian: tuần bắt đầu thứ Hai; tháng theo lịch dương; cả hai tính theo giờ Việt Nam. Lọc theo thời điểm bắt đầu phiên nghe.
- Xếp hạng theo số phiên đủ điều kiện giảm dần; nếu bằng nhau, sắp theo tên track rồi ID ổn định.
- Mỗi mục overview trả tối đa 4 kết quả. Xem tất cả dùng phân trang, không tải toàn bộ danh sách một lần.
- Profile, lịch sử, thống kê cá nhân và playlist đều cần đăng nhập. API lấy user ID từ session, không nhận user ID tin cậy từ client. Bảng top hệ thống chỉ trả metadata track và tổng lượt, không trả tên/email/ID người nghe.
- Khi xóa tài khoản, đề xuất xóa dữ liệu gắn với tài khoản: profile, session, tiến độ/lịch sử nghe, quiz attempts, XP/nhiệm vụ, playlist và sự kiện nghe. Lượt nghe của tài khoản đã xóa cũng bị loại khỏi top hệ thống. Yêu cầu xác nhận rõ trước khi xóa.

## 6. Đặc tả theo từng luồng tính năng

### Luồng 1 — Hồ sơ/tài khoản và avatar — Đã nghiệm thu

**Luồng user**

1. User mở tab Tôi.
2. Nếu chưa đăng nhập, thấy lối vào đăng nhập/đăng ký hiện có. Nếu đã đăng nhập, nhấn vùng avatar/tên hoặc mũi tên trong header để mở trang chỉnh sửa `/profile`.
3. Trang chỉnh sửa hiển thị avatar có nút bút để chọn ảnh; tên và email hiện tại nằm ngay bên dưới. Giữ gỡ ảnh khi đã có avatar. Không hiển thị chữ chọn ảnh và mô tả định dạng.
4. Form nhập tên hiển thị và Lưu hồ sơ; lưu thành công cập nhật dữ liệu và cache, dữ liệu không hợp lệ hiển thị lỗi tại trường. Không lặp email trong card nhập.
5. Không có khu vực xóa tài khoản trên UI mobile theo yêu cầu cuối cùng đã nghiệm thu. API xóa tài khoản vẫn tồn tại; không tự bổ sung lại UI này ở các bước sau.

**API/dữ liệu đã triển khai**

- GET /api/me xem hồ sơ; PATCH /api/me cập nhật tên hoặc gỡ avatar; POST /api/me/avatar upload/thay ảnh JPEG/PNG/WebP tối đa 5 MiB, kiểm tra MIME và chữ ký file.
- Dùng Better Auth cho đăng ký, đổi email/mật khẩu và xác minh theo các flow đang hỗ trợ; tuyệt đối không cho user sửa role/trạng thái khóa.
- DELETE /api/me yêu cầu mật khẩu hiện tại và confirm=true. Giao diện xóa đã bỏ, không xóa API/backend. Create tiếp tục dùng đăng ký Better Auth.

**Tiêu chí nghiệm thu**

- User chỉ xem/sửa/xóa được tài khoản của mình.
- Lưu thành công cập nhật ngay profile và cache; dữ liệu không hợp lệ dùng chuẩn lỗi validation hiện tại.
- Xóa tài khoản cần xác nhận tường minh, thu hồi phiên đăng nhập và xóa dữ liệu cá nhân theo chính sách đã duyệt.
- UI dùng Tamagui/token/shared UI; giữ safe area và bàn phím, loading/error/retry, validation/disabled. Không có className, StyleSheet hoặc màu hex trong các component hồ sơ đã chuyển. Android đã được kiểm tra/chụp ảnh; người dùng đã xác nhận Bước 1 hoàn tất.

**Phạm vi Bước 1 đã nghiệm thu:** cập nhật tên hiển thị và avatar qua UI mobile Tamagui; email/mật khẩu đi qua luồng auth riêng. API dùng chung cho user/moderator/admin. UI xóa tài khoản đã bỏ; API DELETE vẫn yêu cầu mật khẩu hiện tại và confirm=true. Nội dung/media dùng chung và phân công được giữ nguyên: còn liên kết trả 409 để bàn giao trước; không cho xóa admin hoạt động cuối cùng. Chi tiết kiểm chứng và giới hạn dọn Cloudinary ở PROFILE-IMPLEMENTATION-PLAN.md.

### Luồng 2 — Nghe gần đây — Đã nghiệm thu

**Quyết định bổ sung đã duyệt:** chỉ đưa bản kể vào lịch sử khi có ít nhất5 giây playedSeconds được backend chấp nhận. Sync khởi tạo rỗng vẫn lưu progress/session nhưng không đưa tập mới0% vào danh sách. Lọc ngưỡng trước grouping theo episode và pagination; các bản kể chưa đủ5 giây không đè vị trí/bản kể gần nhất đã đủ ngưỡng.

1. Profile hiển thị tối đa 4 mục lịch sử nghe mới cập nhật nhất.
2. Chọn một mục sẽ mở và tiếp tục phát từ vị trí đã lưu bằng player hiện tại.
3. Xem tất cả mở lịch sử đầy đủ, có bộ lọc tất cả/đang nghe/đã nghe và phân trang 5 tập/trang. Đổi bộ lọc về trang 1; quay lại từ player giữ trang/bộ lọc đã chọn.
4. Có trạng thái rỗng, đang tải, lỗi và thử lại; guest được dẫn tới đăng nhập.

**Tái sử dụng/API:** dùng GET /api/me/listening-history; preview gửi limit=4, màn đầy đủ giữ phân trang hiện tại. Mục này là Nghe gần đây, không đồng nghĩa với top lượt nghe.

**Đã triển khai và nghiệm thu:** service/hook `features/listening-history` giữ metadata phân trang, preview limit=4, màn lịch sử Tamagui và status all/in_progress/completed. Khi chọn tập, kiểm tra bản kể còn khả dụng, dùng lastNarrationId và yêu cầu resume riêng cho player; refresh cache sau sync. Không sửa backend, schema DB hay thêm dữ liệu phiên nghe trong Bước 2. Test mobile cũ gắn với NativeWind đã được xử lý; trạng thái hiện tại được ghi trong `PROFILE-IMPLEMENTATION-PLAN.md`.

**Tiêu chí nghiệm thu:** tối đa 4 dòng trên profile; thứ tự mới nhất trước; Xem tất cả tới được trang cũ; resume khôi phục vị trí nghe.

### Luồng 3 — Top quiz cá nhân — Đã triển khai code, chờ nghiệm thu tích hợp

1. Profile hiển thị tối đa 4 quiz theo số lần user nộp bài.
2. Mỗi dòng hiển thị tên quiz/tập và số lần đã làm.
3. Chọn quiz mở quiz tương ứng; Xem tất cả mở danh sách có phân trang.
4. Nếu chưa từng làm quiz, hiển thị trạng thái rỗng và đường dẫn tới thư viện quiz.

**Tái sử dụng/API:** group `QuizAttempt` theo quiz và user hiện tại. Đếm mọi lần nộp hợp lệ, gồm cả lần đạt và chưa đạt; không cần bảng lịch sử quiz mới. Trả số lượt và thời gian nộp gần nhất. Tạo endpoint owner-scoped `GET /api/me/top-quizzes` với pagination; user ID luôn lấy từ session. Trả metadata quiz/tập và trạng thái quiz còn khả dụng để mobile chỉ điều hướng vào quiz đang công khai.

**Mobile:** thêm khu vực xem trước tối đa 4 quiz vào ProfileScreen, nút “Xem tất cả”, và màn danh sách có phân trang trong feature user/quiz phù hợp với cấu trúc hiện tại. Tái sử dụng UI Tamagui/shared UI và luồng mở quiz hiện có. Sau khi nộp quiz thành công, invalidate cache top quiz.

**Tiêu chí nghiệm thu:** số lượt chỉ tính dữ liệu của user hiện tại; mọi lần nộp hợp lệ đều được tính; thứ tự khi bằng lượt ổn định; màn mở rộng có phân trang.

**Thứ tự đề xuất:** số lần nộp giảm dần; hòa thì lần nộp gần nhất trước; cuối cùng dùng quiz ID ổn định. API chỉ trả tối đa `limit` kết quả, mặc định 4 cho preview; màn “Xem tất cả” dùng phân trang 5 kết quả/trang để đồng nhất với lịch sử nghe.

**Review gate:** dừng sau khi API/OpenAPI/schema, UI preview/danh sách, điều hướng quiz và trạng thái loading/error/empty đã hoàn tất. Báo rõ kiểm tra đã chạy và giới hạn dữ liệu; chưa bắt đầu Bước 4 khi chưa được duyệt tiếp.

**Trạng thái thực tế:** đã bổ sung schema chung, route/service aggregate `GET /api/me/top-quizzes`, OpenAPI và UI Tamagui feature `top-quizzes`. Quiz chỉ mở sau preflight qua API quiz hiện có; cache được invalidate bởi `QuizScreens` sau nộp bài qua prefix `["me"]`. `available=false` cũng áp dụng quiz không có câu hỏi hoặc có loại câu hỏi chưa tương thích luồng SINGLE hiện tại. Không thay luồng chấm điểm. Production OpenAPI hiện chưa công bố route mới; mobile đang trỏ production nên việc fetch thất bại là do backend chưa được deploy cùng revision. Loading/error/retry và điều hướng đã được kiểm tra; ranking thành công/submit cập nhật lượt trên Android chưa được xác nhận. Test PostgreSQL opt-in chưa chạy vì DB local không sẵn sàng. Chi tiết trong PROFILE-IMPLEMENTATION-PLAN.md và artifacts/top-quizzes/CHECKS.md.

### Luồng 4 — Nền tảng ghi nhận phiên nghe

**Mobile đã nối local:** sessionId/bitmap riêng; sync đầu rỗng trước khi bắt đầu phát; pause/resume/background/retry giữ ID. Replay, chọn tập mới, hoặc Dừng rồi phát lại tạo ID mới. Thu nhỏ player không đóng phiên. Local position phân vùng user/narration; request lifetime tuần tự theo audio và retry session cũ không ghi đè vị trí replay. Có trạng thái báo lỗi nếu server chưa có hợp đồng mới; cần deploy backend trước khi phát hành client mới.

Đây là phần phụ thuộc bắt buộc trước hai bảng top podcast.

**Hợp đồng backend nhóm A:** mở rộng PUT hiện có bằng cặp tùy chọn sessionId/sessionPlayedBitmap (phải cùng có). Bitmap riêng mỗi phiên, không phải bitmap tiến độ cộng dồn. Không gửi cặp này thì chỉ lưu tiến độ như cũ và không ghi phiên. Backend tạo startedAt từ sync đầu, client mới phải sync ngay khi bắt đầu với bitmap rỗng; không nhận timestamp client để quyết định kỳ. Thời điểm startedAt server bất biến là mốc lọc ranking. Response mới có listeningSession với bitmap đã chấp nhận/playedMs/qualifiedAt. Ngân sách phiên cộng dồn từ startedAt theo max_playback_rate, không nhân tolerance qua retry; ngưỡng tính duration thực, kể cả phần giây cuối. UI/mobile sync không đổi trong đợt API-first; đã được nối ở đợt tích hợp local tiếp theo.

1. Mobile tạo/giữ sessionId theo vòng đời đã nêu ở Quy tắc chung.
2. Progress sync tiếp tục xác thực audio asset, vị trí phát, tốc độ và played bitmap như hiện tại.
3. Backend ghi nhận một phiên khi qua ngưỡng; các sync tiếp theo cập nhật cùng phiên, không cộng thêm lượt.
4. Phát lại trong player mới có ID mới và được tính riêng nếu đạt ngưỡng.
5. Lưu tối thiểu user, narration/tập, thời điểm bắt đầu và dữ liệu cần để xác nhận ngưỡng; không lưu thông tin xác thực vào dữ liệu thống kê.

**Dữ liệu/API đề xuất:** thêm bảng phiên nghe có ID duy nhất và index theo thời gian, user, track; truyền ID qua endpoint đồng bộ tiến độ hiện tại hoặc endpoint tương đương gọn nhất. ListeningProgress tiếp tục giữ vị trí resume/completion; bảng mới chỉ phục vụ xếp hạng.

**Tiêu chí nghiệm thu:** retry/nhiều sync chỉ tính một lượt; tua hoặc nghe lại cùng đoạn trong phiên không làm giả tăng thời lượng duy nhất; phiên mới có thể tính riêng; quy tắc chống tua nhanh hiện tại vẫn áp dụng; kiểm tra biên kỳ, track ngắn và phiên bỏ dở.

### Luồng 5 — Top podcast cá nhân

**UI đã nối local:** Profile preview4, Xem tất cả5/trang, Tuần/Tháng dùng cùng lựa chọn với top hệ thống; state loading/error/empty, mở tập qua player hiện có. Nằm trong `features/personal-library`.

**Backend đã có local:** `GET /api/me/top-podcasts?scope=personal&period=week|month&page=1&limit=4`; owner từ session. Trả rank/episode/title/series/listenCount, window start/end/timezone và metadata phân trang. Chỉ đếm session qualified, lọc startedAt trong kỳ hiện tại ở giờ Việt Nam; không suy ra lượt từ progress cũ. UI local đã nối như mô tả trên.

1. Profile hiển thị top 4 tập user nghe nhiều nhất trong Tuần hoặc Tháng.
2. Đổi kỳ đồng bộ cả hai mục top podcast.
3. Xem tất cả mở ranking cá nhân có phân trang.
4. Chọn track mở trang tập hoặc phát bằng player.

**API đề xuất:** truy vấn phiên nghe theo user từ session và kỳ giờ Việt Nam; trả track metadata, số lượt, kỳ, trang và tổng số.

**Tiêu chí nghiệm thu:** dữ liệu lấy theo thời điểm bắt đầu phiên; không lẫn user khác; preview tối đa 4 và danh sách mở rộng có phân trang.

### Luồng 6 — Top podcast toàn hệ thống

**UI đã nối local:** scope system, chia sẻ lựa chọn Tuần/Tháng với personal. Preview4, danh sách5/trang, không thông tin người nghe.

**Backend đã có local:** dùng chung `GET /api/me/top-podcasts?scope=system&period=week|month&page=1&limit=4`. Vẫn yêu cầu đăng nhập mọi role, không trả danh tính người nghe. Chỉ tập/series công khai và có audio READY; gộp theo episode, sort count DESC/tên/ID. UI local đã nối như mô tả trên.

1. User xem top 4 track nhiều lượt nghe nhất trên hệ thống theo kỳ đang chọn.
2. Xem tất cả mở ranking toàn hệ thống có phân trang.
3. Dòng kết quả hiển thị thứ hạng, tập, series và tổng lượt; không có thông tin người nghe.

**API đề xuất:** cùng nguồn phiên nghe, group toàn hệ thống theo tập và kỳ; endpoint vẫn yêu cầu đăng nhập vì chỉ dùng trong profile.

**Tiêu chí nghiệm thu:** thứ tự/số lượt đúng theo phiên hợp lệ; response không lộ danh tính; preview và phân trang đúng quy tắc.

### Luồng 7 — Playlist cá nhân

**UI đã nối local:** list/detail phân trang5, tạo/đổi tên/xóa có xác nhận, thêm từ player (chọn playlist có sẵn hoặc tạo mới), bỏ/sắp xếp tập và phát playlist. Queue có tập trước/tiếp, tự sang tập khi kết thúc, kiểm tra availability và bỏ qua tập không còn phát được; Dừng kết thúc phiên, thu nhỏ tiếp tục phát. Không dùng player khác; source audio/progress vẫn từ hệ thống hiện có. Cần nghiệm thu Android end-to-end sau backend cập nhật; dữ liệu API đã kiểm tra thật trên PostgreSQL test.

**Backend đã có local:** CRUD `/api/me/playlists`, GET/PATCH/DELETE `/{id}`, POST `/{id}/items`, DELETE `/{id}/items/{episodeId}`, PUT `/{id}/items/order`. Model Playlist/PlaylistItem + migration `20261109110000_private_playlists`, đã kiểm chứng trên DB test, chưa apply production. Owner session cho cả ba role, tạo có Idempotency-Key, unique episode/playlist, parent-lock mọi mutation, reorder exact set và bulk update. Pagination tối đa50/trang; playlist tối đa500 tập. Tập unavailable giữ metadata nhưng không có narration phát được; xóa cứng episode cascade item, xóa user cascade playlist/items. API đọc trả narration IDs/duration để dùng playback hiện tại; tái sử dụng player và UI local đã được nối.

1. Từ profile, user tạo playlist và đặt tên.
2. Từ trang tập/player, user thêm tập vào playlist đã có hoặc tạo playlist mới.
3. User đổi tên, xóa playlist, bỏ tập hoặc sắp xếp lại thứ tự.
4. Phát playlist chạy các tập khả dụng theo thứ tự qua player hiện tại và hỗ trợ next/previous.
5. Tập không còn công khai/không có audio được đánh dấu và không phát; không cho trùng tập trong cùng playlist.

**Dữ liệu/API đề xuất:** bảng owner-scoped Playlist và PlaylistItem có thứ tự; API list/create/read/update/delete và add/remove/reorder dưới /api/me/playlists. Lưu episode ID, lấy title/audio mới nhất từ dữ liệu podcast; playlist riêng tư, không chia sẻ.

**Tiêu chí nghiệm thu:** chỉ owner truy cập được; thao tác trùng được chống lặp; thứ tự giữ nguyên sau khi tải lại; xóa playlist xóa các item; playback tiếp tục lưu tiến độ theo cơ chế hiện tại.

### Luồng 8 — Ghép profile và kiểm tra phát hành

- Thứ tự đề xuất trong màn Tôi: hồ sơ/tài khoản; nghe gần đây; top quiz; top podcast cá nhân; top podcast toàn hệ thống; playlist.
- Mỗi khu vực list/top xem trước tối đa 4 dòng và có Xem tất cả.
- Dùng Tamagui và token Sử Ký, safe-area, trạng thái tải/lỗi/rỗng và touch target chuẩn mobile. Không dùng Tailwind/NativeWind trong UI mobile thuộc phạm vi này.
- Làm mới phần liên quan khi nghe/nộp quiz/sửa profile/thay playlist/đăng xuất.
- Rà soát quyền truy cập, offline/slow network, pagination, đổi tuần/tháng, retry, tap lặp, tiếp tục nghe và phiên nghe bị ngắt.

## 7. Thứ tự triển khai đề xuất

Mỗi bước là một vertical slice có UI, API/dữ liệu cần thiết và nghiệm thu riêng. Sau mỗi bước, dừng để bạn xem kết quả; chỉ làm bước tiếp khi bạn duyệt.

| Bước | Luồng | Vì sao xếp ở đây | Điểm duyệt |
|---|---|---|---|
| 1 — Đã nghiệm thu | Hồ sơ, avatar và API tài khoản | Tạo nền quản lý tài khoản và quy tắc quyền sở hữu. | Đã nghiệm thu. UI Tamagui; API đủ thao tác tài khoản của mình cho cả ba role. UI xóa đã bỏ theo yêu cầu; backend xóa được giữ. |
| 2 — Đã nghiệm thu | Nghe gần đây + Xem tất cả | Đã duyệt và triển khai trên API sẵn có. | Đã nghiệm thu. Preview 4, danh sách 5 tập/trang, filter/page và resume; lỗi test NativeWind cũ đã xử lý. |
| 3 — Code local xong, thiếu API production | Top quiz + Xem tất cả | Aggregate từ QuizAttempt sẵn có; code/API/mobile đã được tạo ở local. | Sau khi production có route mới, xác minh ranking/submit trên Android rồi dừng chờ người dùng nghiệm thu. |
| 4 | Ghi nhận phiên nghe | Nền cho hai ranking; kiểm chứng idempotency trước khi thống kê. | Ngưỡng, pause/resume, retry, replay và kỳ thời gian đạt tiêu chí. |
| 5 | Top podcast cá nhân + Xem tất cả | Kiểm tra aggregate với quyền sở hữu cá nhân trước. | Kỳ tuần/tháng, số lượt và phân trang đúng; không lộ chéo user. |
| 6 | Top podcast toàn hệ thống + Xem tất cả | Tái dùng dữ liệu đã kiểm chứng, chỉ thêm aggregate toàn hệ thống. | Thứ tự đúng và không lộ danh tính người nghe. |
| 7 | Tạo/quản lý/phát playlist | Luồng riêng, dựa trên episode/player hiện tại. | CRUD, owner, thứ tự, chống trùng và phát playlist đúng. |
| 8 | Ghép profile, chính sách lưu/xóa và hồi quy | Kiểm tra các phần cùng hoạt động, dữ liệu được dọn đúng. | Tất cả tiêu chí nghiệm thu của yêu cầu được đáp ứng. |

## 8. API và thay đổi dữ liệu dự kiến

Tên route cụ thể có thể điều chỉnh theo quy ước backend ở bước triển khai.

- Đã có GET/PATCH/DELETE /api/me và POST /api/me/avatar (Bước 1). UI xóa tài khoản đã bỏ; không đưa lại vào UI các bước sau nếu chưa có yêu cầu mới.
- Tái sử dụng GET /api/me/listening-history cho preview và danh sách đầy đủ.
- Endpoint top quiz cá nhân aggregate từ QuizAttempt.
- Endpoint top podcast có scope personal|system, period week|month, page và limit; yêu cầu đăng nhập.
- Bảng phiên nghe mới gắn vào progress sync hiện tại.
- API playlist riêng tư dưới /api/me/playlists.
- Schema Zod đặt tại packages/shared; cập nhật OpenAPI và Prisma migration cho phần API/dữ liệu mới.

## 9. Mặc định đề xuất để duyệt

1. **Xóa tài khoản:** API Bước 1 đã có xác thực lại bằng mật khẩu và confirm=true; chặn nội dung/media/phân công cần bàn giao và admin hoạt động cuối cùng. UI xóa tài khoản đã bỏ theo yêu cầu. Khi bổ sung playlist/phiên nghe ở các bước sau, phải bổ sung chính sách dọn dữ liệu tương ứng; chưa coi các dữ liệu chưa triển khai là đã được xử lý.
2. **Trường profile sửa được (đã duyệt cập nhật):** tên hiển thị và avatar (chọn/upload/thay/gỡ). Email/mật khẩu dùng flow Better Auth riêng. Áp dụng API cho cả ba role; UI chỉ làm mobile.
3. **Lượt nghe hợp lệ:** 30 giây nghe duy nhất; track dưới 37,5 giây cần đạt 80% thời lượng.
4. **Top quiz:** tính mọi lần nộp hợp lệ, đạt hay chưa đạt; xếp hạng all-time trong đợt đầu.
5. **Playlist:** chứa từng tập podcast, không chứa nguyên series.
6. **Lưu phiên nghe:** giữ dữ liệu raw 13 tháng, sau đó dọn phiên cũ; xóa tài khoản sẽ dọn ngay phiên thuộc user đó.

## 10. Quy tắc duyệt và thực hiện

- Bước 1–2 đã được người dùng nghiệm thu. Không mở lại UI/tính năng đã chốt nếu chưa có yêu cầu mới.
- Bước 3 đã triển khai local, còn nghiệm thu dữ liệu thật sau deploy. API-first Task4–7: A đã duyệt, B/C đã hoàn thiện code local theo yêu cầu tiếp tục phần còn lại. Người dùng tự deploy/migrate; API tests không có DB đạt, PostgreSQL integration còn opt-in/chưa chạy. Nghiệm thu sau deploy trước khi tiếp tục UI từng task.
- Sau mỗi bước, mình báo các phần đã đổi, kết quả kiểm tra và việc còn lại; dừng chờ bạn duyệt rồi mới đi tiếp.
- Nếu triển khai phát hiện cần đổi hành vi, cập nhật spec trước bước bị ảnh hưởng.
- UI mobile các bước tiếp theo phải theo chuẩn Tamagui ở mục 2.1; lấy các màn hồ sơ đã chuyển và shared/ui làm mẫu, không sao chép NativeWind/StyleSheet từ các phần cũ.
