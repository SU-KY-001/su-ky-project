# Phase 7: Tình trạng tập và màn kiểm duyệt hai cột

Phụ thuộc: phase 2 (đọc `AiCheck` cho phần AI; có thể làm trước với `aiSummary = null`). Mockup 05. **Danh mục mục kiểm, quy tắc, hợp đồng, test: `spec-episode-readiness.md` (đọc trước).**
## Trạng thái hiện tại (2026-10-23)

- Readiness hiện có single-source `computeEpisodeReadiness`, legacy checklist compatibility, configurable `readiness.min_script_words`, AI summary input và review-content routes cho Admin/Moderator. Evidence: `apps/api/src/modules/content/application/episode-readiness.ts`, `content.mappers.ts`, `apps/api/src/modules/releases/application/release.service.ts`, `releases/presentation/release.routes.ts`.
- APPROVE hiện kiểm readiness/assessment và ghi `readinessSnapshot`; publication gate kiểm AI disclosure, warning acceptance, rights expiry. Đây là implementation evidence, chưa phải full acceptance.
- Chưa claim nghiệm thu live mod reviewer flow, concurrent reviewer behavior, worker durability/Gemini live; cần browser/E2E và DB-backed checks cuối. Assigned-producer self-review restriction vẫn là acceptance cần chứng minh bằng test/smoke, không suy ra từ route code.


## Việc cần làm

**API**
1. `content/application/episode-readiness.ts`: `computeEpisodeReadiness` (hàm thuần, bảng mục kiểm ở spec mục 3). `episodeChecklist` gọi lại hàm mới, giữ `ready` và hình dạng `publishChecklist` hiện có; thêm khóa `readiness` vào DTO `EpisodeWorkspace` (`content.mappers.ts:313`, `shared/.../studio.ts:75,167`). Tách file theo nhóm nếu vượt 200 dòng.
2. `SystemConfig "readiness.min_script_words"` (150) + nhãn admin.
3. `ai-assist` xuất `getEpisodeAiSummary(episodeId)` (đọc, một truy vấn): check mới nhất + đếm `AiCheckItem` theo `status`/`severity` + số mục có `appliedAt` (`applied`). `releases` gọi một chiều.
4. `release.service.ts`: `reviewEpisode` APPROVE kiểm `readiness.ready` → 422 `CHECKLIST_INCOMPLETE`; `submitReview` cùng kiểm (**cả hai chờ xác nhận**, spec mục 8.1). Giữ nguyên mọi kiểm tra hiện có (vai, tự duyệt, `IN_REVIEW`, `STALE_WRITE`).
5. Route `GET /:scheduleId/review-content` cho `admin` và `studio` (spec mục 6): trả `EpisodeWorkspaceDto + readiness + aiSummary`; mod được phân công → 403 `SELF_REVIEW_FORBIDDEN`; không có review `IN_REVIEW` → 404. OpenAPI cập nhật.
6. (Tùy chọn, spec mục 5.4) cột `EpisodeReview.readinessSnapshot Json?` + migration chỉ-thêm; `decideReview` ghi.

**Web**
7. `features/release-review/ReleaseReviewPanel.tsx` (hai cột: trái toàn văn + player; phải "Tình trạng tập", ghi chú, hai nút) **dùng chung** cho `ReleaseReviewDialog` (admin) và `ModeratorReviewQueue` (mod): thay phần tải nội dung của cả hai bằng route mới; không nhân bản component. `readinessLabels.ts` (ánh xạ `key/state/params` → chữ; kiểu `Record<ReadinessKey, …>`). Nhóm hiển thị: **Cần có** (REQUIRED) / **Cần xem** (WARNING) / **Thông tin** (INFO) / dòng **AI** (nếu có), mỗi dòng trạng thái rõ.
8. Duyệt khóa khi `ready = false`, hiện mục thiếu đầu tiên; cảnh báo không chặn. Yêu cầu chỉnh sửa khóa khi ghi chú rỗng (logic có sẵn). Ghi chú nói rõ nơi hiển thị cho người phụ trách ("Người sản xuất thấy nhận xét này ở trang Công việc của họ"; không có thông báo đẩy).
9. Sửa `ReleaseReviewDialog.test.tsx` cho bố cục mới; thêm test mục 7 của spec.

## Done khi

Mọi `ReadinessKey` có nhãn; `ready` cũ và mới trùng trên bộ ca; Duyệt thiếu mục bắt buộc bị server từ chối (nếu được xác nhận); mod người duyệt xem được nội dung tập mình duyệt và không xem được tập mình được phân công; không còn "duyệt mù"; test đạt; `check-types` api/web/shared sạch; smoke: admin và mod đều duyệt/yêu cầu chỉnh sửa một tập có cảnh báo và một tập thiếu mục.
