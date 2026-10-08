# Phase 9: Nút "Nhập vào Studio" (điền sẵn kịch bản)

**Phụ thuộc:** phase 7. Mục đích: thay cho việc copy từng tập, bấm một nút để Series và 3 tập nháp được tạo sẵn trong Studio với kịch bản đã điền. Đường **Copy** ở phase 7 vẫn giữ nguyên, hai đường song song.

## Quy tắc đã chốt
- **Import không bao giờ tự duyệt.** Chặn ở **cả API và UI** (xem Backend). UI chỉ hiện nút sau khi Moderator đã bấm "Duyệt & xuất bản" ở Gate 2 (workflow `COMPLETED`, có publication).
- Chỉ điền dữ liệu workflow có sẵn: tiêu đề Series, tiêu đề + văn nói từng tập (`ORALIZER`), nguồn tham khảo. **Không có audio** (workflow không sinh audio), ô audio để trống.
- **Không có màn quyết định nguồn.** Mọi nguồn trong danh mục (`sourcesCatalogue` của bản đã duyệt) luôn gửi `CREATE`, không dò trùng, chấp nhận trùng. Nguồn Moderator đã xoá ở Gate 0 thì không còn trong danh mục nên không được tạo. Lý do: người nghe chỉ cần biết thông tin lấy từ đâu; bảng `sources`/`episode_sources` của Studio có sẵn nên không đổi schema.
- **Thực thể (nhân vật/sự kiện):** gửi `entityDecisions: []`, server bỏ qua.
- Series và tập tạo ở trạng thái **nháp**, chủ sở hữu là Moderator bấm nút. Workflow đã gắn `seriesId` thì **thêm tập vào series đó** (cần quyền ghi).
- Mỗi workflow import **một lần**; gọi lại trả kết quả cũ (`created: false`).

## Backend (đổi nhỏ, làm đầu phase)
1. `content-import.service.ts` `basis()`: chỉ dùng `approvedVersion` của `FACT_CHECKER`; bỏ nhánh lấy `currentVersion` khi bước còn `WAITING_FOR_HUMAN`. Chưa duyệt → `409 IMPORT_NOT_AVAILABLE`.
2. `import()`: bỏ nhánh `continueStep` tự duyệt. Yêu cầu đã có `ScriptPublication` của node đó; không có → `409 IMPORT_NOT_AVAILABLE`. Việc duyệt chỉ đến từ `step-decisions` (Gate 2).
3. `preview()` dùng cùng `basis()` nên cũng trả `409` khi chưa duyệt (UI không gọi trước khi duyệt).
4. Sửa test import ở `apps/api/tests/` cho hành vi mới (chưa duyệt → 409, đã duyệt → import không tạo thêm publication); cập nhật mô tả hai route ở `routes/docs/paths/script-workflow.ts` và `docs/api-docs/script-workflow-api.md` (thêm `409 IMPORT_NOT_AVAILABLE` khi chưa duyệt, bỏ chữ "tự duyệt"). Chạy `bun test` (có `openapi.test.ts`).

## Frontend
1. Ở S4, cạnh Copy: nút **Nhập vào Studio**. Chưa duyệt Gate 2 thì không hiện.
2. Bấm nút: `GET /:id/import-preview` (lấy `basis.factCheckerVersionId`, đích `NEW_SERIES`/`EXISTING_SERIES`, `factCheck.passed`) → hộp thoại xác nhận một dòng: "Sẽ tạo Series *<tên>* với 3 tập nháp và N nguồn" (hoặc "thêm 3 tập vào Series *<tên>*"). Không bảng nguồn. `passed = false` thì thêm cảnh báo vàng (không chặn).
3. Xác nhận: `POST /:id/import` (`Idempotency-Key` mới, rate `ai_import`) với `{ basis, sourceDecisions: <CREATE cho mọi itemId trong preview.sources>, entityDecisions: [] }` theo `ImportRequestSchema`. `409 STALE_WRITE` → "Kịch bản đã thay đổi", tải lại preview.
4. Kết quả (`ImportResultSchema`, đọc lại bằng `GET /:id/import`; `404 NOT_IMPORTED` khi chưa nhập): "Đã tạo Series và 3 tập nháp", liên kết sang Studio, số nguồn mới. Sau khi nhập nút đổi thành **Mở trong Studio**.

## Acceptance
- Gọi thẳng `POST /:id/import` khi Gate 2 chưa duyệt: `409 IMPORT_NOT_AVAILABLE`, workflow không đổi trạng thái, không có publication mới.
- Đã duyệt Gate 2: bấm **Nhập vào Studio**, Studio có 3 tập nháp đúng tiêu đề, văn nói, nguồn gắn vào cả 3 tập, chủ sở hữu đúng Moderator.
- Nguồn đã xoá ở Gate 0 không xuất hiện; nguồn thêm tay (`custom-src-*`) xuất hiện với `origin = MODERATOR`.
- Bấm đúp hoặc gọi lại: một Series, kết quả giống nhau.
- Workflow gắn `seriesId` có sẵn: tập thêm vào cuối series đó.
