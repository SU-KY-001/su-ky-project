# Phase 5: Gate 0 (sửa nguồn + chọn trọng tâm kể)

**Phụ thuộc:** phase 4 + hook `useStepDecision` (phase 2). Đây là màn có rủi ro nghiệp vụ cao nhất (UX §10.5). Đặc tả: UX §4.1, §3.4.

## Khối 1: Danh mục nguồn (sửa được)

Dữ liệu `sourcesCatalogue[]` (`SourceItem`: `id`, `name`, `authorOrOrigin`, `tier`, `tierDescription`, `reliabilityScore` 1 đến 10, `crossVerificationNotes`, `isPrimaryAssertionSource`, `url?`, `locationInSource?`).

- Bảng/thẻ có lọc theo tier, sắp theo điểm; mở liên kết `url` ở tab mới (`rel="noopener noreferrer"`).
- **Xoá** nguồn (xác nhận nhẹ, hoàn tác trong phiên bằng toast "Hoàn tác").
- **Sửa** nguồn: drawer/hộp thoại form các trường trên (select tier từ `SOURCE_TIER_LABELS`, số điểm 1 đến 10, `url` phải hợp lệ).
- **Thêm** nguồn: cùng form, `id` **bắt buộc** dạng `custom-src-<n>` (API dùng tiền tố này để đánh dấu nguồn do Moderator thêm, `origin = MODERATOR` khi import; AI dùng `src-<n>`). `<n>` không trùng id hiện có.
- Mọi thay đổi chỉ nằm trong **nháp** (zustand) cho tới khi bấm **Lưu chỉnh sửa**: gọi `DIRECT_EDIT` với **toàn bộ** `editedOutputJson` (giữ nguyên `narrativeMenu`, câu hỏi nghiên cứu, v.v.), `baseVersion = currentVersion`, `note` tuỳ chọn. Thành công: version mới `v(n+1)`, toast "Đã lưu v(n+1). Chưa duyệt.", bước **vẫn** chờ duyệt.
- Chỉ báo "Có thay đổi chưa lưu"; rời trang hoặc **Duyệt & tiếp tục** khi còn nháp chưa lưu thì hỏi xác nhận (hoặc tự lưu trước khi duyệt, chọn một và ghi rõ trong code). Nếu tự lưu: `CONTINUE` dùng `baseVersion = newVersion` lấy từ response `DIRECT_EDIT`, không chờ refetch.

## Khối 2: Menu trọng tâm kể

- Radio dạng thẻ từ `narrativeMenu[]`: nhãn trọng tâm, góc kể, lý do đề xuất, `seriesTitle`, 3 `episodeTitles`. Cuối nhóm có **Tự nhập** (`CUSTOM`).
- Chọn thẻ thì điền sẵn `seriesTitle` và 3 tiêu đề tập (sửa được); chọn **Tự nhập** thì ô trống, bắt buộc điền cả 4.
- Ô `editorialNotes` và `incomingGuidance` (tuỳ chọn).
- **Duyệt & tiếp tục** khoá cho tới khi: có lựa chọn, `seriesTitle` không rỗng, đủ 3 tiêu đề tập không rỗng. Payload: `CONTINUE` kèm `narrativeSelection` (`selectedFocusType` là `focusType` của thẻ hoặc `CUSTOM`), theo `StepDecisionRequestSchema`.
- Khối phụ thu gọn "Câu hỏi nghiên cứu ban đầu".

## Biên

- `narrativeMenu` hoặc `sourcesCatalogue` rỗng: cảnh báo vàng "AI không tìm được đủ dữ liệu", gợi ý **Làm lại** hoặc **Tự nhập** (và thêm nguồn tay).
- Xoá hết nguồn rồi duyệt: cảnh báo "Không còn nguồn nào" và yêu cầu xác nhận.
- `409`: hộp thoại "Kịch bản vừa thay đổi ở nơi khác", **Tải lại**, giữ nháp.
- `400`: hiện `message` của server, giữ nháp; lỗi theo field do client bắt trước bằng schema shared.

## Acceptance

- Trên workflow thật dừng ở Gate 0: thêm 1 nguồn, sửa 1 nguồn, xoá 1 nguồn, Lưu → version mới chứa đúng thay đổi (đối chiếu `GET /:id`).
- Chọn thẻ trọng tâm, sửa 1 tiêu đề tập, **Duyệt & tiếp tục** → bước kế chạy (SSE cập nhật stepper).
- Gây `409` (sửa từ hai tab) hiển thị hộp thoại và không mất nháp.
- Mọi nút khoá khi đang gửi; bấm đúp không tạo hai version.
- Bàn phím: thêm, sửa, xoá nguồn thao tác hết được; hộp thoại bẫy focus, `Esc` đóng, trả focus về nút gọi.
