# Phase 7: Gate 2 (kiểm định) và S4 Xuất bản

**Phụ thuộc:** phase 6. Đặc tả: UX §4.7, §3 S4, §5.2.

## Gate 2 (`FACT_CHECKER`)

- Bố cục hai cột: trái là văn nói 3 tập, phải là báo cáo kiểm định. **Văn nói lấy đúng node `ORALIZER` cùng nhánh** (UX §5.2): từ `GET /:id/tree` đi ngược `parentVersionId` tới `stepType = ORALIZER`, rồi tìm version đó trong `steps[ORALIZER].versions`. Không dùng "version mới nhất của ORALIZER".
- Báo cáo: `overallScore` (0 đến 100, thanh + số), nhãn `passed`; `moderatorSummaryFeedback` nổi bật; danh sách `claimVerification` lọc theo `VERIFIED` (xanh) / `UNSUPPORTED_SPECULATION` (vàng, "Suy đoán chưa có dẫn chứng") / `CONTRADICTION` (đỏ, "Mâu thuẫn với nguồn"), mặc định mở nhóm đỏ và vàng; liên kết thẻ sự kiện (`matchedFactCardId`); khối `oralLinter` 4 cờ + `errorDetails`.
- `passed = false`: dải đỏ đầu panel; **Duyệt & xuất bản** vẫn cho phép nhưng qua hộp thoại xác nhận "Bạn chắc chắn xuất bản dù báo cáo chưa đạt?".
- Hướng khi có câu vàng/đỏ: **Làm lại** (chạy lại kiểm định trên cùng văn nói) và **Làm lại từ dàn ý** (`RERUN` trên `STORY_PLANNER`, cảnh báo hậu quả, feedback gợi ý sẵn từ các câu đỏ).
- **Sửa tay** chỉnh **báo cáo**, không sửa văn nói: tooltip bắt buộc "Chỉnh báo cáo kiểm định, không chỉnh văn bản kịch bản". Dùng trình JSON (phase 6).
- **Duyệt & xuất bản** = `CONTINUE` trên `FACT_CHECKER` với `baseVersion = currentVersion`; thành công chuyển S4.

## S4 `/moderator/script-workflows/:id/publication`

- `GET /:id/publications`; chỉ vào được khi `COMPLETED` có ít nhất 1 publication, nếu không chuyển về S3. Nhiều publication: dropdown, mặc định mới nhất.
- Đầu trang: "Đã xuất bản · tổng từ · ~phút", người duyệt, thời điểm. **Copy toàn bộ** (`finalScript`), tab `Tập 1/2/3`, **Copy tập này** (chỉ `spokenNarration`, không kèm tiêu đề, để dán thẳng vào ElevenLabs). Sau khi chép đổi nhãn "Đã chép" 2 giây (hằng số) và thông báo `aria-live`.
- Chi tiết từng tập (tiêu đề, số từ, thời lượng, ghi chú nhịp đọc) từ `ORALIZER` của node đã duyệt; khối **Nguồn tham khảo** từ `SOURCE_EVALUATOR.evaluatedSources` (tên, tier, độ tin cậy, `url`).
- Clipboard: `navigator.clipboard.writeText` có xử lý lỗi (ngữ cảnh không an toàn / bị từ chối) với nút chọn-sao chép dự phòng.

## Acceptance

- Chạy hết một workflow thật tới Gate 2: thấy báo cáo, lọc theo nhóm, duyệt & xuất bản, đến S4, Copy tập 1 dán ra đúng nội dung.
- Báo cáo `passed = false` (thật hoặc dữ liệu thử) hiện đủ dải đỏ và hộp thoại xác nhận.
- Văn nói ở Gate 2 khớp đúng nhánh sau một lần `RERUN` ở Gate 1 (kiểm tra bằng tree).
- Trình đọc màn hình đọc được thông báo "Đã chép".
