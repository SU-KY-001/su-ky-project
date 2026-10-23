# Quy trình Git & GitHub (Git & GitHub Workflow)

Tài liệu này tóm tắt quy trình làm việc (workflow) nhanh dành cho nhà phát triển trong dự án **AI Study Hub**.

---

## 🚀 6 Bước Làm Việc Core (Cheat Sheet)

### 1. Đồng bộ và Tạo Branch mới
Luôn bắt đầu từ `dev` mới nhất:
```bash
git checkout dev
git pull origin dev
git checkout -b <type>/<short-description>
```
*Các `<type>` thường gặp:*
*   `feat/`: Tính năng mới
*   `fix/`: Sửa lỗi
*   `chore/`: Cấu hình, nâng cấp thư viện
*   `refactor/`: Dọn dẹp/tối ưu code cũ
*   `docs/`: Tài liệu
*   `test/`: Thêm test

*Ví dụ:* `feat/document-search`, `fix/upload-timeout`

### 4. Kiểm tra cục bộ trước khi Push
Đảm bảo code không lỗi và đúng chuẩn format trước khi gửi đi:
```bash
pnpm test          # Chạy test
pnpm format        # Định dạng code tự động
pnpm lint          # Check lỗi cú pháp
pnpm check-types   # Check TypeScript
pnpm build         # Biên dịch thử dự án
```

### 5. Rebase & Push
Tích hợp code `dev` mới nhất vào branch cục bộ của bạn để tránh conflict:
```bash
git fetch origin
git rebase origin/dev
git push -u origin <branch-name>
```

### 6. Tạo PR, Nhận Approved & Merge
*   Mở Pull Request hướng vào branch `dev`.
*   **CI Pipeline** tự động chạy lại các lệnh check (test, lint, build). Nếu đỏ ❌, bắt buộc phải sửa và push lại.
*   Yêu cầu ít nhất 1 thành viên review và approve.
*   **Merge PR** xong, hãy xóa branch trên cả GitHub và máy của bạn để giữ repo sạch sẽ.

---

## 📝 Quy tắc Đặt tên Commit (Conventional Commits)

Đặt tên commit theo định dạng:
```text
<type>(<scope>): <mô tả ngắn gọn>
```
*   `type`: `feat`, `fix`, `chore`, `refactor`, `docs`, `test`.
*   `scope` (Phạm vi): `api` (Backend), `web` (Frontend), `mobile`, hoặc `packages` (Thư viện chung).

*Ví dụ:*
*   `feat(api): add document preview endpoint`
*   `fix(web): handle empty search query in form`
*   `docs: update contribution guide`

---

## ✅ Pull Request Checklist
Trước khi bấm gửi PR, hãy tự tích chọn:
- [ ] Code chỉ giải quyết duy nhất 1 task/tính năng (không gộp nhiều việc không liên quan).
- [ ] Chạy check ở máy cục bộ (`test`, `format`, `lint`, `check-types`, `build`) đều xanh mượt.
- [ ] Đính kèm ảnh chụp màn hình UI hoặc logs kết quả API trong PR mô tả.
- [ ] Đã rebase với branch `dev` mới nhất.

