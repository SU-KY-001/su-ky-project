# Phase 8: Cây lịch sử (S5) và tab Nhật ký

**Phụ thuộc:** phase 7. Không bắt buộc cho bản đầu (UX §3 S5, §10.8); làm sau cùng.

## Việc làm

1. **Tab Nhật ký:** `GET /:id/events` nối thêm event SSE, hiển thị timeline theo thời gian, nhãn tiếng Việt cho `event.type` thường gặp (bảng ở API doc §6.1). Dùng cho huy hiệu linter văn nói (`step.oralizer.lint_passed`/`lint_failed`) trong `OralizerPanel`.
2. **Tab Cây lịch sử:** `GET /:id/tree`, vẽ cây theo `parentVersionId`; mỗi node là thẻ nhỏ (tên bước, `v`, thời điểm); node đã duyệt viền ngọc, node thuộc bước "Cần chạy lại" mờ; nhánh rẽ hiện khi `RERUN`/`DIRECT_EDIT`. Bấm node: về tab Quy trình và chọn đúng bước + version (chỉ đọc). Không có hành động ghi.
3. Cây dựng bằng HTML/CSS (danh sách lồng, không thêm thư viện đồ thị); điều hướng bàn phím theo cấu trúc cây (`role="tree"`).

## Acceptance

- Workflow có `RERUN` hiển thị đúng nhánh rẽ; bấm node mở đúng version.
- Nhật ký cập nhật realtime khi SSE chạy.
