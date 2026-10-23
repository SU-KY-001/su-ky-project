# UX 05: Kiểm duyệt tập (một màn, hai cột)

Nguồn: `mockups/05-review-dialog.html`. Phạm vi: phase 7 (`spec-episode-readiness.md`). Người dùng: **người duyệt** (Admin hoặc Mod được giao), không phải người sản xuất, không phải AI.

## 1. Vào trang

Từ **Lịch phát hành** (Quản trị) hoặc hàng đợi duyệt của Mod, mở tập đang chờ duyệt. Mock vẽ như **một trang đầy đủ**:
- Breadcrumb: `Quản trị / Lịch phát hành / Tập 3: Cuộc dời đô`.
- Bên phải thanh trên: *"Người duyệt: Phạm Thu Hà (không phải người sản xuất, không phải AI)"*.
- Rộng ~1100px, hai cột: **nội dung** (linh hoạt) + **cột quyết định** 400px.

## 2. Cột trái: nội dung để xem

- Dòng đầu: *"Chờ duyệt · phiên bản 3"*, tiêu đề tập, nhãn vàng **"Chờ duyệt"**.
- Thẻ **"Kịch bản"**:
  - nút nhỏ **"Xem hết 12 đoạn"** ⇄ **"Thu gọn"**;
  - vùng chữ **thu gọn** cao ~150px, mờ dần ở đáy; mở ra cao tối đa 360px và **cuộn được**; mỗi đoạn một dòng.
- Thẻ **"Âm thanh"**:
  - dạng sóng + nút **"Nghe từ đầu"** + *"04:12 · giọng AI"* (nhãn giọng AI nếu âm thanh do AI tạo);
  - chú thích: *"Hệ thống không biết bạn đã nghe bao nhiêu, nên không có ô tick nghe xong."*

## 3. Cột phải: "Tình trạng tập"

Tiêu đề + *"Hệ thống tự tính từ dữ liệu, bạn không chỉnh được."*

**Bảng tình trạng**, mỗi hàng: chấm màu · nội dung · nhãn (**Đủ** xanh / **Cảnh báo** vàng / **Thiếu** đỏ). Hàng mock:
1. Có tên tập: Đủ
2. Có kịch bản: Đủ
3. Âm thanh sẵn sàng: Đủ (hoặc **"Chưa có âm thanh sẵn sàng": Thiếu** khi bật mô phỏng thiếu âm thanh)
4. Thẻ nhân vật, sự kiện đã xác nhận: **Cảnh báo** (mock: 2 thẻ chưa xác nhận)
5. Giọng AI không còn đoạn chưa tạo lại sau khi sửa: Đủ

Dưới bảng: hộp thông tin **"AI đã rà: 3 cảnh báo, 2 đã xem. AI nghi ngờ, chưa xác minh; đây chỉ là gợi ý tham khảo."**

Rồi:
- Ô **"Ghi chú"** (4 dòng), gợi ý *"Bắt buộc khi Yêu cầu chỉnh sửa."*, placeholder *"Nêu rõ phần cần sửa"*.
- Dòng lý do (cập nhật theo trạng thái):
  - có hàng **Thiếu**: *"Chưa thể Duyệt: chưa có âm thanh sẵn sàng."*
  - chỉ có **Cảnh báo**: *"Có thể Duyệt. Cảnh báo không chặn, nhưng bạn nên xem."*
  - sạch: *"Có thể Duyệt."*
- Hai nút: **"Yêu cầu chỉnh sửa"** (icon X) · **"Duyệt"** (icon ✓, nút chính).
- Chú thích: *"Ghi chú và quyết định được lưu, gắn với phiên bản 3."*

### Quy tắc nút
- **Duyệt** bị **khóa** khi còn bất kỳ hàng **Thiếu**. Hàng **Cảnh báo** không chặn.
- **Yêu cầu chỉnh sửa** bị **khóa** khi ô ghi chú rỗng (sau khi bỏ khoảng trắng).
- Gõ vào ô ghi chú → cập nhật ngay trạng thái hai nút.

## 4. Quy tắc cứng

- Bảng tình trạng do **hệ thống tính**, người duyệt không sửa.
- Không có ô "đã nghe xong": hệ thống không đo được.
- Quyết định + ghi chú gắn với **phiên bản** (revision) đang duyệt. Nếu nội dung đã đổi sang phiên bản mới, không cho duyệt bản cũ.
- Phần AI luôn dùng chữ "nghi ngờ, chưa xác minh"; 0 cảnh báo không phải xác nhận.
- Server phải **khớp** với việc khóa nút (không chỉ khóa ở giao diện): `spec-episode-readiness.md` mục 8; đang chờ xác nhận vì đổi hành vi hiện tại.

## 5. Đối chiếu web hiện tại

Đã đọc code **và mở thật** (`/moderator/pending` → "Xem và kiểm duyệt" trên "Ba lần kháng chiến chống Mông - Nguyên - Tập 2", 2026-10-22). Chỉ xem, **không bấm Duyệt hay Yêu cầu chỉnh sửa**.

**Quan sát:** hộp thoại mở, tải được nội dung; hai cột hiển thị đúng; Cần có (✓ ✓ ✗ "Chưa có âm thanh ngôi thứ ba sẵn sàng"), Cần xem (72 từ < 150, series chưa xuất bản), Thông tin, "AI hỗ trợ: Chưa chạy AI rà kịch bản cho tập này"; dòng đỏ "Chưa thể duyệt: Chưa có âm thanh…" khớp việc thiếu; kịch bản hiện toàn bộ không thu gọn; không có dòng người duyệt, không có nhãn "Chờ kiểm duyệt/Phiên bản" ở bản Mod. Chưa kiểm: bấm hai nút quyết định, tập có lượt AI rà (hàng AI_REVIEW_SUMMARY), bản Admin.

| # | Mock | Web | Kết luận |
|---|---|---|---|
| 1 | Một **trang** có breadcrumb + dòng "Người duyệt: tên (không phải người sản xuất, không phải AI)" | Hai **hộp thoại** `max-w-5xl` ("Kiểm duyệt nội dung podcast" / "Chi tiết nội dung kiểm duyệt"); không có dòng tên người duyệt | Khác hình thức; thiếu dòng người duyệt |
| 2 | "Chờ duyệt · phiên bản N" + nhãn "Chờ duyệt" | Admin: nhãn "Chờ kiểm duyệt" + "Phiên bản N". Mod: không có | Admin có; Mod thiếu |
| 3 | Kịch bản: **thu gọn 150px**, nút "Xem hết N đoạn"/"Thu gọn" | Hiển thị **toàn bộ** chữ (`whitespace-pre-wrap`), không thu gọn | Thiếu |
| 4 | Thẻ Âm thanh: sóng, "Nghe từ đầu", thời lượng, nhãn "giọng AI", chú thích không có tick "nghe xong" | `<audio controls>` mặc định; không nhãn giọng AI; không có chú thích | Thiếu nhãn giọng AI và chú thích |
| 5 | Bảng tình trạng: chấm + chữ + nhãn Đủ/Cảnh báo/Thiếu | Nhóm **Cần có / Cần xem / Thông tin / AI hỗ trợ**, icon ✓ ✗ ⚠ ℹ; không có nhãn chữ Đủ/Thiếu | Khác cách trình bày; đủ thông tin |
| 6 | Hộp "AI đã rà: x cảnh báo, y đã xem, nghi ngờ chưa xác minh" | Nhóm "AI hỗ trợ (nghi ngờ, chưa xác minh)" với `AI_REVIEW_SUMMARY` / `NOT_RUN` / `STALE` / `INCOMPLETE` | Có (đủ hơn mock) |
| 7 | Dòng lý do 3 trạng thái (Thiếu / Cảnh báo / Sạch) | Chỉ có "Chưa thể duyệt: …" khi thiếu; **không có** câu "Có thể Duyệt…" | Thiếu 2 trạng thái |
| 8 | Ghi chú + khóa "Yêu cầu chỉnh sửa" khi rỗng | Có; "Duyệt nội dung" khóa khi `!readiness.ready` | Có |
| 9 | Hàng "Giọng AI không còn đoạn chưa tạo lại sau khi sửa" | Không có key này trong `readinessLabels`; phụ thuộc UX 04 chưa tồn tại | Thiếu (chờ TTS) |
| 10 | Khóa theo phiên bản | Có (`validRevision`, thông báo "Phiên bản đã được xử lý hoặc nội dung đã thay đổi") | Có |
| 11 | Chú thích "Ghi chú và quyết định được lưu, gắn với phiên bản N" | Có câu khác nghĩa: "Người sản xuất thấy nhận xét này ở trang Công việc…" | Khác chữ |

Ngoài mock nhưng web có: `ENTITY_TAGS_NONE`, `DURATION_MISMATCH`, `AUDIO_QUALITY`, `SCRIPT_TOO_SHORT`, `FIRST_PERSON_INCOMPLETE`... (theo `spec-episode-readiness.md`).
