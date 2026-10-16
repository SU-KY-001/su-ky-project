# Thiết kế điều phối và phát hành podcast

**Ngày:** 2026-10-15

**Trạng thái:** Đã được người dùng duyệt, với thuật ngữ giao diện “Theo dõi phát hành”.

## Mục tiêu

Xây dựng luồng production để Admin lập lịch, phân công moderator, theo dõi kiểm duyệt và để hệ thống tự động phát hành podcast đúng thời điểm. Admin không phải canh giờ để bấm phát hành và không trực tiếp sửa nội dung podcast.

Thiết kế phải bảo đảm lịch không bị mất khi deploy hoặc restart, không phát hành trùng, có thể phục hồi sau lỗi và ghi lại đầy đủ tiến trình dưới dạng giao diện nghiệp vụ dễ hiểu.

## Phạm vi

Bao gồm:

- Admin tạo, đổi, hủy lịch phát hành và phân công đúng một moderator đang phụ trách tại một thời điểm.
- Moderator có thể gửi ticket báo không thể tiếp tục; chỉ khi Admin duyệt và chọn người thay thế thì nhiệm vụ mới được chuyển giao.
- Moderator trực tiếp tham gia toàn bộ quá trình sản xuất nội dung được giao.
- Luồng gửi duyệt, yêu cầu chỉnh sửa và phê duyệt nội dung.
- Tự động phát hành podcast tại thời điểm đã lên lịch.
- Phát hành thủ công như một thao tác xử lý ngoại lệ, không phải chế độ cấu hình.
- Delayed job, worker riêng, retry, reconciliation và transactional outbox.
- Audit bất biến được trình bày thành Theo dõi phát hành, Tiến độ phát hành và Lịch sử phát hành.
- Dashboard Admin tái sử dụng bộ component dashboard chung với Moderator.
- RBAC, quan sát vận hành và chiến lược rollout production.

Không bao gồm:

- Livestream hoặc phát sóng trực tiếp.
- Chia moderator bắt buộc theo từng công đoạn sản xuất nhỏ.
- Trường brief sản xuất riêng.
- Cho Admin lựa chọn chế độ phát hành thủ công hoặc tự động cho từng lịch.
- Thêm Redis hoặc BullMQ.
- Cho Admin sửa kịch bản hoặc file nội dung thay moderator.

## Vai trò và quyền hạn

### Admin

- Tạo, cập nhật, đổi giờ và hủy lịch.
- Phân công một moderator cho lịch và xử lý yêu cầu chuyển giao.
- Theo dõi tiến độ sản xuất, kiểm duyệt và phát hành.
- Xử lý ngoại lệ bằng Phát hành ngay, Thử lại, Đổi lịch hoặc Hủy lịch.
- Quản lý người dùng, vai trò, quyền truy cập và cấu hình hệ thống.
- Xem lịch sử phát hành và dữ liệu vận hành liên quan.
- Không trực tiếp chỉnh sửa nội dung podcast.

### Moderator sản xuất

- Xem nhiệm vụ được phân công.
- Tạo hoặc liên kết tập podcast với lịch.
- Chỉnh sửa toàn bộ nội dung của lịch đang được giao.
- Tạo, cập nhật hoặc tự hủy ticket khi ticket còn chờ duyệt.
- Gửi phiên bản hoàn chỉnh để kiểm duyệt.
- Sửa nội dung theo yêu cầu và gửi lại.
- Không thay đổi lịch, tự duyệt hoặc tự phát hành.

### Moderator kiểm duyệt

- Có quyền `content.review`.
- Phê duyệt hoặc yêu cầu chỉnh sửa, kèm nhận xét bắt buộc khi trả lại.
- Mặc định không được tự duyệt nội dung mà mình đang được phân công sản xuất.

## Luồng nghiệp vụ

### 1. Lập lịch và phân công

Admin tạo lịch với các thông tin:

- Tên kế hoạch hoặc podcast dự kiến.
- Thời gian phát hành.
- Hạn hoàn thành sản xuất.
- Một moderator phụ trách.

Lịch có thể được tạo trước podcast. `episodeId` vì vậy được phép để trống và được liên kết khi moderator tạo hoặc chọn tập podcast.

Sau khi lịch được kích hoạt, hệ thống gửi nhiệm vụ cho moderator. Mọi thay đổi về thời gian hoặc người phụ trách đều tạo audit và thông báo mới.

### 2. Sản xuất và kiểm duyệt

Luồng kiểm duyệt:

```text
DRAFT
  -> IN_REVIEW
       -> CHANGES_REQUESTED -> DRAFT
       -> APPROVED
```

Quy tắc:

- `DRAFT`: moderator được chỉnh sửa.
- `IN_REVIEW`: phiên bản gửi duyệt được đóng dấu version và không thay đổi âm thầm.
- `CHANGES_REQUESTED`: reviewer phải ghi nhận xét; moderator chỉnh sửa trên một revision mới.
- `APPROVED`: chỉ revision đã duyệt mới đủ điều kiện phát hành.
- Sửa nội dung ảnh hưởng checklist sau phê duyệt làm trạng thái quay lại `DRAFT`.

### 3. Phát hành tự động

Khi podcast được phê duyệt và vượt qua checklist phát hành, lịch chuyển sang `READY_TO_PUBLISH`.

```text
APPROVED
  -> READY_TO_PUBLISH
  -> PUBLISHING tại scheduledAt
       -> RELEASED
       -> FAILED -> RETRY
```

Nếu đến thời gian phát hành nhưng podcast chưa được duyệt, thiếu audio hoặc không vượt checklist, lịch chuyển `BLOCKED`. Sau khi bị chặn, hệ thống không tự động phát hành muộn. Admin phải quyết định phát hành ngay, đặt lịch mới hoặc hủy.

### 4. Xử lý ngoại lệ thủ công

Không có trường `releaseMode`. Tất cả lịch hợp lệ đều được hệ thống tự động phát hành.

Các thao tác thủ công chỉ xuất hiện khi cần vận hành:

- **Phát hành ngay:** gọi cùng publication use case với worker.
- **Thử lại:** tạo job mới cho lịch đang `FAILED`.
- **Đổi lịch:** tăng version và tạo job theo thời gian mới.
- **Hủy lịch:** vô hiệu hóa các job cũ bằng version/status guard.

## Mô hình trạng thái

### Trạng thái hiển thị nội dung

Giữ `Episode.status` hiện tại:

- `DRAFT`
- `PUBLISHED`
- `HIDDEN`

Trạng thái này tiếp tục điều khiển khả năng xuất hiện trong public catalog.

### Trạng thái kiểm duyệt

- `DRAFT`
- `IN_REVIEW`
- `CHANGES_REQUESTED`
- `APPROVED`

### Trạng thái lịch phát hành

- `SCHEDULED`
- `READY_TO_PUBLISH`
- `PUBLISHING`
- `RELEASED`
- `BLOCKED`
- `FAILED`
- `CANCELLED`

`AT_RISK` và `OVERDUE` là trạng thái trình bày được tính theo thời gian hiện tại, không lưu cố định trong database.

## Mô hình dữ liệu

### ReleaseSchedule

- `id`
- `episodeId`, nullable
- `title`
- `productionDeadline`
- `scheduledAt`
- `status`
- `version`
- `createdById`
- `publishedAt`
- `cancelledAt`
- `failureCode`
- `failureMessage`
- `createdAt`
- `updatedAt`

Thời gian được lưu dưới UTC bằng `TIMESTAMPTZ` và hiển thị theo `Asia/Ho_Chi_Minh`.

### ProductionAssignment

- `scheduleId`
- `moderatorId`
- `assignedById`
- `assignedAt`
- `removedAt`

Mỗi lịch chỉ có một `ProductionAssignment` đang hoạt động. Các assignment cũ được giữ lại với `removedAt` để lưu lịch sử chuyển giao. Database có unique index có điều kiện trên `scheduleId WHERE removedAt IS NULL` để ngăn hai assignment hoạt động do race condition.

### ReleaseReassignmentTicket

- `id`
- `scheduleId`
- `requestedById`
- `reason`
- `status`: `PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`
- `replacementModeratorId`, nullable
- `resolvedById`, nullable
- `decisionReason`, nullable và bắt buộc khi từ chối
- `resolvedAt`, nullable
- `cancelledAt`, nullable
- `createdAt`
- `updatedAt`

Quy tắc:

- Chỉ moderator đang được phân công mới được tạo ticket.
- Một lịch chỉ có tối đa một ticket `PENDING`.
- Moderator được sửa lý do hoặc tự hủy ticket `PENDING` của mình.
- Khi ticket đang chờ hoặc bị từ chối, assignment và quyền chỉnh sửa hiện tại không thay đổi.
- Admin duyệt phải chọn một moderator khác đang hoạt động.
- Duyệt ticket, đóng assignment cũ, tạo assignment mới và ghi audit trong cùng transaction.
- Podcast nháp vẫn thuộc chủ sở hữu ban đầu; moderator thay thế được thao tác qua assignment đang hoạt động thay vì chuyển quyền sở hữu.

### EpisodeReview

- `id`
- `episodeId`
- `revision`
- `status`
- `submittedById`
- `submittedAt`
- `reviewedById`
- `reviewedAt`
- `reviewNote`

Review phải tham chiếu đúng revision để ngăn phát hành một phiên bản khác với phiên bản đã được duyệt.

### TransactionalOutbox

- `id`
- `eventType`
- `aggregateType`
- `aggregateId`
- `payload`
- `createdAt`
- `dispatchedAt`
- `attempts`
- `lastError`

Lịch, audit và outbox event được ghi trong cùng transaction.

### AuditLog

Tái sử dụng bảng audit hiện tại và bổ sung các trường truy vết cần thiết:

- `actorType`: `ADMIN`, `MODERATOR` hoặc `SYSTEM`
- `correlationId`
- `jobId`
- `fromStatus`
- `toStatus`
- `changes`/`metadata`

Audit là append-only và không được sửa hoặc xóa từ giao diện.

## Kiến trúc ứng dụng

```text
Admin/Moderator Web
        |
        v
Bun + Hono API
        |
        +-- Scheduling Service
        +-- Assignment Service
        +-- Review Service
        +-- Publication Service
        +-- Audit Service
        |
        v
PostgreSQL + Prisma
        |
        +-- Business tables
        +-- Audit logs
        +-- Transactional outbox
        +-- pg-boss tables
        |
        v
Dedicated Release Worker
        |
        +-- Delayed release jobs
        +-- Reminder jobs
        +-- Retry jobs
        +-- Reconciliation cron
```

Luồng thủ công và worker đều gọi một `PublishEpisodeUseCase`. Use case này kiểm tra checklist, revision đã duyệt, trạng thái media, concurrency guard, cập nhật publication evidence và ghi audit trong transaction.

## Queue và worker

### Lựa chọn công nghệ

Tiếp tục dùng PostgreSQL và `pg-boss` đã có trong dự án. Không thêm Redis/BullMQ vì tần suất phát hành podcast thấp, trong khi chi phí vận hành một datastore mới không mang lại lợi ích tương xứng.

API đóng vai trò producer. Release worker chạy thành process/container riêng và đóng vai trò consumer để công việc nền không ảnh hưởng latency của API.

### Delayed job

```text
queueName: podcast.release
singletonKey: release:<scheduleId>:<version>
startAfter: scheduledAt
```

Payload chỉ chứa `scheduleId`, `scheduleVersion` và `correlationId`. Worker luôn đọc lại trạng thái mới nhất từ database.

### Đổi hoặc hủy lịch

Mỗi lần đổi lịch làm tăng `version`. Job cũ nếu chạy sẽ thấy version không còn khớp và kết thúc an toàn với audit `release.stale_job_ignored`.

### Concurrency và idempotency

Worker chỉ tiếp tục nếu atomic update chuyển được lịch từ `READY_TO_PUBLISH` sang `PUBLISHING` với đúng version. Các worker còn lại dừng mà không phát hành lại.

Publication dùng mô hình at-least-once kết hợp idempotency ở database. Không dựa vào giả định queue chỉ giao job đúng một lần.

### Retry

- Lần 1 sau 1 phút.
- Lần 2 sau 5 phút.
- Lần 3 sau 15 phút.
- Hết retry chuyển `FAILED` và cảnh báo Admin.

Chỉ retry lỗi kỹ thuật tạm thời. Lỗi nghiệp vụ như thiếu audio hoặc chưa duyệt chuyển `BLOCKED`.

### Reconciliation

Cron đối soát chạy mỗi 1-5 phút để:

- Tìm lịch đến hạn nhưng thiếu job.
- Khôi phục outbox event chưa dispatch.
- Phát hiện lịch kẹt ở `PUBLISHING`.
- Chuyển lịch không đủ điều kiện sang `BLOCKED`.
- Cảnh báo lịch `FAILED`.

Delayed job là cơ chế chính; reconciliation chỉ là lớp phục hồi.

## Audit và giao diện nghiệp vụ

Các sự kiện chính:

- `release_schedule.created`
- `release_schedule.updated`
- `release_schedule.rescheduled`
- `release_schedule.assignee_changed`
- `episode.review_submitted`
- `episode.changes_requested`
- `episode.approved`
- `release.auto_ready`
- `release.started`
- `release.blocked`
- `release.failed`
- `release.retry_scheduled`
- `release.published`
- `release.cancelled`
- `release.stale_job_ignored`

Thuật ngữ “Audit log” không xuất hiện trong giao diện nghiệp vụ chính. Dữ liệu audit được trình bày theo ba cấp:

- **Theo dõi phát hành:** khu vực tổng hợp trên Dashboard Admin.
- **Tiến độ phát hành:** timeline của một lịch cụ thể.
- **Lịch sử phát hành:** danh sách các lần phát hành đã qua, có bộ lọc và chi tiết.

Audit kỹ thuật như stack trace hoặc định danh nội bộ không hiển thị trực tiếp. Giao diện chuyển sự kiện thành câu mô tả dễ hiểu, nhưng vẫn giữ `jobId` và `correlationId` trong dữ liệu để đội vận hành truy vết.

## Thông báo

- Ticket `PENDING` xuất hiện trong trung tâm Thông báo Admin với bộ lọc riêng.
- Admin duyệt ticket phải chọn moderator thay thế; từ chối ticket phải nhập lý do.
- Trước hạn sản xuất 24 giờ: nhắc moderator nếu chưa gửi duyệt.
- Trước thời gian phát hành 2 giờ: cảnh báo nếu chưa `APPROVED`.
- Khi đạt `READY_TO_PUBLISH`: thông báo Admin.
- Khi `BLOCKED` hoặc `FAILED`: thông báo Admin và moderator liên quan.
- Khi phát hành thành công: thông báo hoàn tất.

Giai đoạn đầu dùng notification trong ứng dụng. Email hoặc push là tích hợp riêng vì backend hiện chưa có mail sender production.

## Giao diện Admin

### Điều hướng

- Tổng quan
- Lịch phát hành
- Điều phối sản xuất
- Hàng chờ kiểm duyệt
- Người dùng
- Vai trò và quyền
- Cấu hình hệ thống
- Lịch sử phát hành

### Dashboard

Tái sử dụng component dashboard chung với Moderator và customize bằng dữ liệu Admin.

Metric:

- Sắp phát hành.
- Sẵn sàng phát hành.
- Có nguy cơ trễ.
- Cần xử lý.

Khu vực:

- **Theo dõi phát hành:** tổng hợp lịch đang chờ, sẵn sàng, đang phát hành, bị chặn hoặc thất bại.
- **Cần xử lý ngay:** lịch bị chặn, quá hạn, retry thất bại hoặc worker ngừng hoạt động.
- **Sắp phát hành:** timeline 24 giờ hoặc 7 ngày tới.
- **Tải công việc moderator:** nhiệm vụ đang mở, gần hạn và quá hạn.
- **Sức khỏe hệ thống:** worker, queue lag, job chờ và retry.
- **Tiến độ gần đây:** các sự kiện nghiệp vụ gần nhất.

### Lịch phát hành

Hỗ trợ Calendar, danh sách và timeline. Drawer chi tiết hiển thị trạng thái sản xuất, kiểm duyệt, checklist, moderator được giao và Tiến độ phát hành.

Các hành động xử lý ngoại lệ gồm Phát hành ngay, Thử lại, Đổi lịch và Hủy lịch.

### Component dùng chung

Thay cấu trúc phụ thuộc moderator bằng các component shared:

- `WorkspaceShell`
- `WorkspaceSidebar`
- `DashboardOverview`
- `MetricCard`
- `AreaChartPanel`
- `StatusList`
- `QuickActions`
- `ReleaseProgressTimeline`

Admin và Moderator chỉ truyền navigation, identity, dữ liệu và quyền thao tác. Shared component không import ngược từ `features/moderator`.

## Giao diện Moderator

Thêm khu vực Nhiệm vụ của tôi với các nhóm Được phân công, Đang sản xuất, Cần chỉnh sửa, Chờ duyệt, Đã hoàn thành và Quá hạn.

Chi tiết nhiệm vụ hiển thị deadline sản xuất, thời gian phát hành, các moderator cùng tham gia, nhận xét kiểm duyệt, checklist và thao tác gửi duyệt.

Thêm khu vực Ticket gồm bảng các ticket đã gửi và dialog tạo/chỉnh sửa. Mỗi dòng hiển thị nhiệm vụ, podcast nháp nếu đã liên kết, hạn sản xuất, thời gian phát hành, lý do và trạng thái. Ticket `PENDING` có thao tác sửa và tự hủy.

## RBAC

- `schedule.read`
- `schedule.create`
- `schedule.update`
- `schedule.assign`
- `schedule.cancel`
- `content.edit_assigned`
- `content.submit_review`
- `content.review`
- `content.publish`
- `audit.read_operational`
- `audit.read_all`
- `user.manage`
- `role.manage`
- `permission.manage`
- `system_config.manage`

Admin mặc định có quyền điều phối, publish, audit và cấu hình nhưng không có quyền sửa nội dung podcast.

## Observability và SLO

Theo dõi queue depth, queue lag, chênh lệch `publishedAt - scheduledAt`, tỷ lệ đúng giờ, số lịch `BLOCKED`, retry, failure và worker heartbeat.

Mục tiêu ban đầu:

- 99% lịch hợp lệ được phát hành trong vòng 60 giây từ `scheduledAt`.
- Lịch thiếu job được phát hiện và phục hồi trong vòng 5 phút.
- Không phát hành trùng.
- Mọi chuyển trạng thái đều có audit.
- Restart hoặc deploy không làm mất lịch.

## Trade-off

### pg-boss trên PostgreSQL

Giảm dependency và chi phí vận hành vì dự án đã dùng PostgreSQL và pg-boss. Đổi lại, queue và dữ liệu nghiệp vụ cùng phụ thuộc database, và giải pháp không nhắm tới khối lượng hàng triệu job.

### Worker riêng

Bảo vệ latency API và cho phép scale độc lập. Đổi lại, production cần thêm process/container, health check, log và alert riêng.

### Outbox và reconciliation

Tăng khả năng phục hồi và truy vết nhưng thêm bảng, dispatcher và logic đối soát. Đây là chi phí cần chấp nhận cho mục tiêu production.

### Phát hành tự động mặc định

Loại bỏ việc Admin canh giờ nhưng yêu cầu checklist, revision lock, idempotency, audit và thao tác cứu hộ phải chính xác. Khi đã quá giờ mà nội dung chưa sẵn sàng, hệ thống ưu tiên an toàn và yêu cầu Admin quyết định thay vì tự phát hành muộn.

## Kiểm thử

- Unit test toàn bộ state transition và permission.
- Integration test transaction tạo lịch, outbox và audit.
- Integration test publish checklist và approved revision.
- Worker test delayed job, retry, stale version và idempotency.
- Concurrency test nhiều worker nhận cùng lịch.
- Recovery test restart worker đúng thời điểm phát hành.
- End-to-end test luồng tạo lịch, phân công, duyệt và tự động phát hành.
- End-to-end test blocked, retry, reschedule, cancel và phát hành ngay.
- Kiểm tra timezone và dữ liệu UTC.

## Rollout

1. Hoàn thiện schema, RBAC, audit và luồng phát hành thủ công dùng chung service.
2. Triển khai worker ở shadow mode: ghi nhận “đáng lẽ đã phát hành” nhưng chưa thay đổi nội dung.
3. So sánh kết quả shadow với lịch thực tế và đo queue lag.
4. Bật auto-release cho một nhóm lịch thử nghiệm.
5. Theo dõi SLO, blocked, retry và duplicate guard.
6. Bật tự động phát hành cho toàn bộ lịch sau khi đạt tiêu chí vận hành.

## Tiêu chí hoàn thành

- Admin tạo lịch và phân công được moderator.
- Mỗi lịch có đúng một moderator đang phụ trách và form Admin dùng select dropdown.
- Moderator gửi, sửa và tự hủy được ticket đang chờ.
- Admin duyệt kèm người thay thế hoặc từ chối kèm lý do; chỉ nhánh duyệt mới chuyển assignment.
- Moderator hoàn thành luồng sản xuất và kiểm duyệt theo đúng revision.
- Podcast hợp lệ tự động phát hành đúng thời gian mà không cần Admin mở ứng dụng.
- Lỗi tạm thời được retry; lỗi nghiệp vụ chuyển `BLOCKED`.
- Admin xử lý được mọi ngoại lệ từ giao diện.
- Dashboard dùng thuật ngữ Theo dõi phát hành, Tiến độ phát hành và Lịch sử phát hành.
- Audit đủ để xác định ai hoặc hệ thống đã làm gì, lúc nào và kết quả ra sao.
- API restart, worker restart hoặc nhiều worker không làm mất hay phát hành trùng podcast.
