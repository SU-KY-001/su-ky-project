# Đặc tả "Tình trạng tập" (checklist kiểm duyệt cấp prod)

> Cập nhật 2026-10-23: các mô tả “hiện tại”, “cần xác nhận” dưới đây là lịch sử thiết kế phase 7. [Phase 8](phase-08-publication-gates.md) là hợp đồng mới đã triển khai: snapshot khi quyết định, hồ sơ kết luận khi APPROVE, lý do chấp nhận cảnh báo và ngoại lệ Admin có lý do/audit. Ba mục REQUIRED vẫn giữ nguyên; publication transaction còn kiểm bằng chứng lịch sử và approval hiện hành. `readiness.ready` không phải toàn bộ điều kiện xuất bản.

Ngày 2026-10-22. Thay thế bảng 5 dòng trong `plans/reports/review-criteria-261022-podcast-episode.md` (đó chỉ đủ cho mockup). Mockup: `mockups/05-review-dialog.html`. Tinh thần giữ nguyên: **hệ thống tự tính, người duyệt chỉ đọc/nghe rồi quyết; không tick tay; chỉ ghi điều hệ thống thấy được; AI chỉ là một dòng "nghi ngờ, chưa xác minh"**.

## 1. Hiện trạng đã đọc (căn cứ)

- `episodeChecklist` (`content.mappers.ts:170-188`): 3 mục bắt buộc (`BASIC_INFO`, `THIRD_PERSON_SCRIPT`, `THIRD_PERSON_AUDIO`) + 2 cảnh báo (`SERIES_NOT_PUBLISHED`, `ENTITY_TAGS_UNCONFIRMED`). `ready` = ba mục bắt buộc. Ra DTO tại `publishChecklist` (`content.mappers.ts:313`), dùng bởi: `publishEpisode` (422 `EPISODE_NOT_PUBLISHABLE`), `ReleasePublisher.checklistReady` (tự chuyển `READY_TO_PUBLISH` sau Duyệt; `evaluateReleaseReadiness` → `CHECKLIST_INCOMPLETE`).
- `mapNarration` (`content.mappers.ts:91-148`) đã tính sẵn `warnings` theo narration: `SCRIPT_CHANGED_AFTER_AUDIO` (`scriptUpdatedAt > audioAttachedAt`) và `DURATION_MISMATCH` (lệch > `narration.duration_mismatch_ratio`, mặc định 0,3); `audioAnalysis` có `formatStatus`/`durationStatus`/`noiseStatus` (`PASS|WARNING|UNKNOWN`), `noiseLevelDb`.
- `reviewEpisode` (`release.service.ts:272-334`): chỉ kiểm vai trò, tự duyệt, review `IN_REVIEW`, `contentRevision` khớp (`STALE_WRITE`). **Không kiểm checklist khi Duyệt**; checklist chỉ quyết việc tự chuyển `READY_TO_PUBLISH`. `submitReview` (`:231-270`) cũng **không kiểm checklist** (chỉ phân công, liên kết tập, revision, trạng thái lịch).
- `ReleaseReviewDialog.tsx` (admin) hiện **không hiển thị checklist**; chỉ có nội dung + ghi chú + hai nút. Nút Duyệt chỉ khóa theo `canDecide` (revision hợp lệ, dữ liệu tải xong).
- **Phát hiện quan trọng:** `ModeratorReviewQueue.tsx` (mod làm người duyệt) **không có nội dung nào để xem** (chỉ tiêu đề, hạn, phiên bản, ô nhận xét, hai nút). Route đọc tập `GET /api/studio/episodes/:id` giới hạn theo chủ series (404 nếu không phải chủ), nên mod người duyệt **không thể mở kịch bản/âm thanh của tập mình duyệt**. Mock 05 mới chỉ khớp với dialog admin. → xem mục 6.

## 2. Hợp đồng dữ liệu

Hàm thuần `computeEpisodeReadiness(episode, mappedNarrations, config)` trong `content/application/episode-readiness.ts` (< 200 dòng; tách nhóm ra file con nếu dài). `episodeChecklist` hiện có **giữ nguyên hành vi** (`ready` không đổi) và được viết lại làm lớp mỏng gọi hàm mới để không có hai nguồn sự thật; `publishChecklist` giữ nguyên hình dạng (client cũ không vỡ), thêm khóa mới `readiness`.

```ts
type ReadinessLevel = "REQUIRED" | "WARNING" | "INFO";
type ReadinessState = "OK" | "MISSING" | "WARN" | "INFO";
interface ReadinessItem {
  key: ReadinessKey;            // hằng số, mục 3
  level: ReadinessLevel;
  state: ReadinessState;        // REQUIRED: OK|MISSING; WARNING: OK|WARN; INFO: INFO|OK
  narration?: "THIRD_PERSON" | "FIRST_PERSON";
  params?: Record<string, number | string>;   // count, ratio, db, … (không văn bản dịch)
}
interface EpisodeReadiness {
  ready: boolean;               // = mọi mục REQUIRED có state OK
  contentRevision: number;
  computedAt: string;           // ISO
  items: ReadinessItem[];       // thứ tự cố định theo mục 3
}
```
Chữ tiếng Việt do **web** ánh xạ từ `key + state + params` (một bảng ở `features/release-review/readinessLabels.ts`), giống cách app hiện dùng khóa. Server không trả câu chữ.

Quy tắc chung:
- `REQUIRED` chặn Duyệt và chặn `ready`. **Chỉ ba mục hiện có là REQUIRED.** Thêm REQUIRED mới = đổi hành vi phát hành (publish, tự `READY_TO_PUBLISH`), cần chủ sản phẩm quyết riêng; plan này không thêm.
- `WARNING` hiện cho người duyệt, **không chặn**. `INFO` chỉ thông tin. Mục `OK` của WARNING/INFO vẫn trả về (UI quyết gộp "đủ" hay ẩn) để người duyệt thấy "đã kiểm".
- Mọi số ngưỡng là `SystemConfig` có mặc định (mục 4).
- Không có mục nào dựa vào điều hệ thống không quan sát được (ví dụ "đã nghe hết").

## 3. Danh mục mục kiểm (thứ tự hiển thị)

Nhóm A: **Nội dung** (cần có, chặn)

| key | level | Điều kiện OK | Nguồn dữ liệu | params khi không OK |
|---|---|---|---|---|
| `BASIC_INFO` | REQUIRED | `episode.title.trim() !== ""` | `episode.title` | — |
| `THIRD_PERSON_SCRIPT` | REQUIRED | narration `THIRD_PERSON` có `scriptContent.trim() !== ""` | `EpisodeNarration` | — |
| `THIRD_PERSON_AUDIO` | REQUIRED | narration `THIRD_PERSON` có `audioAsset.status === "READY"` | `MediaAsset.status` | — |

Nhóm B: **Âm thanh và kịch bản khớp nhau** (cảnh báo; áp dụng cho từng narration có âm thanh, `narration` ghi rõ)

| key | level | WARN khi | Nguồn | params |
|---|---|---|---|---|
| `SCRIPT_CHANGED_AFTER_AUDIO` | WARNING | `scriptUpdatedAt > audioAttachedAt` | `mapNarration.warnings` | — |
| `DURATION_MISMATCH` | WARNING | `|audio.durationMs − estimatedDurationMs| / estimatedDurationMs > narration.duration_mismatch_ratio` | `mapNarration.warnings` | `ratio` (phần trăm), `audioMs`, `estimatedMs` |
| `AUDIO_QUALITY` | WARNING | `audioAnalysis.formatStatus` hoặc `noiseStatus` = `WARNING` | `audioAnalysis` | `noiseDb`, `format` |
| `AUDIO_UNANALYZED` | INFO | `audioAnalysis` null hoặc có trạng thái `UNKNOWN` | `audioAnalysis` | — |
| `AUDIO_DURATION_UNKNOWN` | INFO | asset `READY` nhưng `durationMs` null | `MediaAsset.durationMs` | — |
| `SCRIPT_TOO_SHORT` | WARNING | số từ `< readiness.min_script_words` (mặc định 150 = 1 phút ở 150 từ/phút) khi đã có script | cùng hàm đếm từ `mapNarration` | `words`, `min` |

Nhóm C: **Người kể ngôi thứ nhất** (chỉ khi tập có narration `FIRST_PERSON`)

| key | level | WARN khi | params |
|---|---|---|---|
| `FIRST_PERSON_INCOMPLETE` | WARNING | narration `FIRST_PERSON` thiếu `narratorEntityId`, hoặc thiếu script, hoặc thiếu âm thanh `READY` | `missing: "NARRATOR"|"SCRIPT"|"AUDIO"` (một mục cho mỗi thiếu) |

(Checklist hiện chỉ xét `THIRD_PERSON`; ngôi thứ nhất chưa bao giờ bị kiểm. Giữ không chặn.)

Nhóm D: **Thẻ nhân vật/sự kiện**

| key | level | WARN/INFO khi | params |
|---|---|---|---|
| `ENTITY_TAGS_UNCONFIRMED` | WARNING | có thẻ `status = SUGGESTED` | `count` |
| `ENTITY_TAGS_NONE` | INFO | không có thẻ `CONFIRMED` nào | — |

(`REJECTED` không tính là chưa xác nhận.)

Nhóm E: **Hồ sơ tập và series**

| key | level | Khi | Ghi chú |
|---|---|---|---|
| `SERIES_NOT_PUBLISHED` | WARNING | `series.status !== "PUBLISHED"` | có sẵn; giữ |
| `EPISODE_DESCRIPTION` | INFO | `description` rỗng | |
| `EPISODE_POSTER` | INFO | chưa có `poster` | |
| `EPISODE_LOCKED` | INFO | `adminLockedAt` khác null | người duyệt biết tập đang bị khóa |

Nhóm F: **AI** (chỉ hiện khi `ai_assist.enabled`; nguồn `AiCheck`/`AiCheckItem`, **không** tính vào `ready`)

| key | level | Khi | params |
|---|---|---|---|
| `AI_REVIEW_NOT_RUN` | INFO | chưa có check `SCRIPT_REVIEW` nào cho tập | — |
| `AI_REVIEW_SUMMARY` | WARNING nếu `openHigh > 0`, ngược lại INFO | có check mới nhất (xem dưới) | `total`, `reviewed`, `open`, `openHigh`, `applied` (số mục có `appliedAt`), `failedBlocks` (phase 2 bỏ `skippedBlocks`) |
| `AI_REVIEW_STALE` | INFO | check mới nhất có `createdAt < narration.scriptUpdatedAt` (script đổi sau lần rà) | — |
| `AI_REVIEW_INCOMPLETE` | INFO | check mới nhất `FAILED`/`CANCELLED`, hoặc `failedBlocks > 0` | `errorCode` |
| `AI_VOICE` | INFO (WARNING nếu có đoạn chưa tạo lại) | audio của tập có nguồn `TTS` | chờ T1 (`audioOrigin`, trạng thái đoạn); **chưa làm ở plan này**. Khi làm: nhãn phải nói rõ đây là giọng AI **tái dựng**, không phải bản ghi thật của nhân vật; tập có lời nhân vật lịch sử do AI đọc thì hiện thêm dòng "giọng AI, không phải ghi âm lịch sử" (xem `research-261022-dual-narrator-design.md`) |

"Check mới nhất" = `AiCheck` `kind = SCRIPT_REVIEW` mới nhất theo `createdAt` của tập, bất kể trạng thái. Wording web: luôn "AI nghi ngờ, chưa xác minh"; `AI_REVIEW_SUMMARY` với `total = 0` và không lỗi hiện "AI không thấy gì đáng chú ý ở các đoạn đã xét (không phải xác nhận)". Dòng "AI hỗ trợ" ở trang duyệt **chỉ đếm điều hệ thống thấy**: đã rà (`total`, `reviewed`) và `applied` đề xuất. Soạn thảo (dàn ý, viết phần, viết lại) không ghi DB nên **không** đưa vào, và không suy diễn từ chữ trong kịch bản.

### Mẫu chữ (web, `readinessLabels.ts`; ví dụ, văn bản cuối do chủ sản phẩm duyệt)

| key | OK | Không OK |
|---|---|---|
| `BASIC_INFO` | Có tên tập | Thiếu tên tập |
| `THIRD_PERSON_SCRIPT` | Có kịch bản ngôi thứ ba | Chưa có kịch bản |
| `THIRD_PERSON_AUDIO` | Âm thanh sẵn sàng | Chưa có âm thanh sẵn sàng |
| `SCRIPT_CHANGED_AFTER_AUDIO` | (ẩn khi đủ) | Kịch bản sửa sau khi gắn âm thanh: âm thanh có thể không còn khớp |
| `DURATION_MISMATCH` | | Âm thanh dài {audio} nhưng kịch bản ước tính {est} (lệch {ratio}%) |
| `AUDIO_QUALITY` | | Phân tích âm thanh báo cần xem: tiếng ồn {noiseDb} dB / định dạng |
| `ENTITY_TAGS_UNCONFIRMED` | Thẻ nhân vật, sự kiện đã xác nhận | {count} thẻ chưa xác nhận |
| `AI_REVIEW_SUMMARY` | | AI nghi ngờ {total} chỗ, {reviewed} đã xem, {applied} đã áp dụng đề xuất (chưa xác minh) |

## 4. Cấu hình (SystemConfig, thêm vào `system-config.ts`, nhãn admin trong `admin.service.ts`)

`readiness.min_script_words` (int, mặc định 150). Tái dùng `narration.duration_mismatch_ratio`, `script.words_per_minute`. Không thêm ngưỡng nào khác. (`readiness.ai_stale_*` không cần: chỉ so thời điểm.)

## 5. Quy tắc áp dụng (server)

1. **Duyệt (`APPROVE`)**: trong `reviewEpisode`, sau kiểm `contentRevision`, tính `readiness` **trên chính tập tại revision đó**; `ready = false` → 422 `CHECKLIST_INCOMPLETE` (mã đã có trong `release-policy.ts`). Hiện tại server cho Duyệt khi thiếu rồi chỉ không tự `READY_TO_PUBLISH`; đổi này là **thay đổi hành vi** (UI mock đã khóa nút, server phải khớp, nếu không kiểm qua API vẫn lọt). **Cần xác nhận** của chủ sản phẩm.
2. **Gửi duyệt (`submitReview`)**: đề xuất cùng quy tắc (`ready = false` → 422 `CHECKLIST_INCOMPLETE`): không bắt người duyệt mở tập chắc chắn thiếu. **Cần xác nhận.**
3. **Yêu cầu chỉnh sửa**: không kiểm readiness. Bắt buộc `reviewNote` **đã có ở server** (`ReviewEpisodeSchema`, `release.ts:89`: `trim().min(1)`); không cần thêm gì, chỉ giữ nguyên.
4. **Chốt ảnh chụp lúc quyết định (đề xuất, cột nhỏ):** `EpisodeReview.readinessSnapshot Json?` ghi `{ items[], computedAt }` tại thời điểm `decideReview`; trả ra trong chi tiết review. Để khi tranh chấp "lúc duyệt hệ thống báo gì" có bằng chứng (đúng nguyên tắc "ghi điều hệ thống thấy"). Chi phí: một cột, không logic. Nếu chưa muốn đổi schema thì bỏ, không ảnh hưởng phần còn lại.
5. `readiness` tính khi đọc (không cache, không bảng): rẻ (vài truy vấn đã có trong `getEpisodeWorkspace`) và luôn khớp với `contentRevision`. Phần AI = một truy vấn đếm `AiCheckItem` theo `status`/`severity` của check mới nhất (index `(checkId, status)` đã có).

## 6. Màn duyệt: nguồn dữ liệu (sửa khoảng trống phát hiện được)

| Người duyệt | Hiện trạng | Cần làm |
|---|---|---|
| Admin (`ReleaseReviewDialog`) | đọc được tập qua `service.content(episodeId)` (`GET /api/studio/episodes/:id`, admin xem mọi tập); không có checklist | thêm `readiness` (cùng DTO) + `aiSummary`; hai cột theo mockup 05 |
| Mod khác (`ModeratorReviewQueue`) | **không có nội dung**, duyệt mù | thêm route đọc cho người duyệt (dưới) + dùng **cùng component** hai cột (một `ReleaseReviewPanel` dùng chung, không nhân bản) |

Route mới (`releases` module, mount cạnh `/api/studio/releases` cho mod và `/api/admin/releases` cho admin, cùng handler): `GET /:scheduleId/review-content`. Điều kiện: lịch có review `IN_REVIEW`; người gọi là admin, hoặc mod **không được phân công** vào lịch (đúng luật `SELF_REVIEW_FORBIDDEN`, kiểm bằng `isModeratorAssigned` hiện có); trả `EpisodeWorkspaceDto + readiness + aiSummary` (chỉ-đọc, URL xem trước âm thanh như hiện có). Mod được phân công → 403 `SELF_REVIEW_FORBIDDEN`. Lịch không có review đang chờ → 404.
`aiSummary` lấy từ hàm đọc xuất khẩu của `ai-assist` (`getEpisodeAiSummary(episodeId)`); `releases` phụ thuộc `ai-assist` theo một chiều, không ngược lại.

## 7. Test

- `episode-readiness.test.ts` (hàm thuần, bảng ca): mỗi `key` ở trạng thái OK và không OK; `ready` chỉ phụ thuộc ba mục REQUIRED (WARNING/INFO không ảnh hưởng, kể cả khi toàn bộ WARNING); thiếu script nhưng có audio; audio `PENDING`; `scriptUpdatedAt` đúng bằng `audioAttachedAt` (không cảnh báo); `DURATION_MISMATCH` đúng ngưỡng (bằng ngưỡng không cảnh báo); `estimatedDurationMs = 0` không chia 0; narration `FIRST_PERSON` thiếu từng thành phần; tag `REJECTED` không tính; `SCRIPT_TOO_SHORT` ở biên 149/150 từ; tương thích: `episodeChecklist(...).ready` cũ == `computeEpisodeReadiness(...).ready` trên cùng bộ ca.
- Phần AI: không check → `AI_REVIEW_NOT_RUN`; check có `openHigh` → WARNING; script đổi sau check → `AI_REVIEW_STALE`; `ai_assist.enabled = false` → không có mục AI.
- Tích hợp `releases` (DB thật, mẫu `quiz-integration.test.ts`): Duyệt khi thiếu audio → 422 `CHECKLIST_INCOMPLETE`; Duyệt khi chỉ có WARNING → 200 và tự `READY_TO_PUBLISH` (nếu đủ điều kiện hiện có); mod được phân công gọi `review-content` → 403; mod người duyệt không phân công → 200; không có review `IN_REVIEW` → 404; tập đổi revision sau khi mở → Duyệt `STALE_WRITE` (không đổi).
- Web: `readinessLabels` phủ mọi `ReadinessKey` (test kiểu `Record<ReadinessKey, …>` ép compiler, không test text); nút Duyệt khóa khi `ready = false` và hiện lý do (mục thiếu đầu tiên); Yêu cầu chỉnh sửa khóa khi ghi chú rỗng.

## 8. Việc chưa chốt (cần người quyết, không tự làm)

1. Duyệt/Gửi duyệt có bị chặn ở **server** khi thiếu mục REQUIRED không (mục 5.1, 5.2).
2. Có thêm mục REQUIRED nào ngoài ba mục hiện có (ví dụ mô tả tập, ảnh bìa)? Mặc định: không.
3. `readinessSnapshot` có làm không (mục 5.4).
4. Mod người duyệt có xem được toàn văn kịch bản/âm thanh không (mục 6): quyền riêng tư giữa các mod; mặc định đề xuất: có, chỉ khi đang là người duyệt hợp lệ.
5. Nhãn pháp lý khi âm thanh do AI tạo (T1): chưa kiểm, `AI_VOICE` chờ.
