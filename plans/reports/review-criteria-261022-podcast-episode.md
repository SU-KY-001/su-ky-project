# Tình trạng tập (hệ thống tự tính)

**Ngày:** 2026-10-22. **Thay thế** bản nháp 22 tiêu chí. Mock: `plans/261015-1640-podcast-ai-source-check-p1/mockups/05-review-dialog.html`.

> **Bảng 5 dòng dưới đây chỉ đủ cho mockup.** Danh mục cấp prod (nhóm, ngưỡng, nguồn dữ liệu, quy tắc áp dụng ở server, test) ở `plans/261015-1640-podcast-ai-source-check-p1/spec-episode-readiness.md`. Khi mâu thuẫn, bản đó thắng.

## Quyết định

Màn duyệt là `ReleaseReviewDialog` hiện có, **một màn hai cột**: trái = nội dung đầy đủ (kịch bản + player), phải = "Tình trạng tập" chỉ-đọc + ghi chú + hai nút. Người duyệt là admin/mod khác (không phải tác giả, không phải AI; `SELF_REVIEW_FORBIDDEN` giữ nguyên).

**Quyết định của người duyệt chỉ có hai: Duyệt | Yêu cầu chỉnh sửa + ghi chú.** Không chấm đạt/không đạt từng tiêu chí.
- Yêu cầu chỉnh sửa: bắt buộc ghi chú (đúng luật hiện có).
- Duyệt: khóa khi còn mục thiếu (hiện lý do); cảnh báo không chặn.

## Mục tình trạng (nguồn: code đã có, không bảng mới)

| Mục hiển thị | Loại | Nguồn (`episodeChecklist`, `content.mappers.ts`) |
|---|---|---|
| Có tên tập | thiếu/đủ (chặn Duyệt) | `BASIC_INFO` |
| Có kịch bản | thiếu/đủ (chặn) | `THIRD_PERSON_SCRIPT` |
| Âm thanh sẵn sàng | thiếu/đủ (chặn) | `THIRD_PERSON_AUDIO` |
| Thẻ nhân vật/sự kiện đã xác nhận | cảnh báo "n thẻ chưa xác nhận" | warning `ENTITY_TAGS_UNCONFIRMED` |
| Series đã phát hành | cảnh báo | warning `SERIES_NOT_PUBLISHED` |
| Giọng AI không còn đoạn chưa tạo lại sau khi sửa | cảnh báo/chặn khi dùng giọng AI | **chưa có**, chờ T1 (trạng thái đoạn TTS) |
| AI đã rà: n cảnh báo, m đã xem | tóm tắt một dòng | `AiCheckItem` (P1), chỉ hiện nếu đã chạy; ghi "AI nghi ngờ, chưa xác minh" |

Không có dòng "series có nguồn" và không có tick đạt/không đạt do người duyệt đặt. Hệ thống tính; người duyệt chỉ đọc, nghe, rồi quyết.

## Vì sao bỏ thiết kế 22 tiêu chí

1. Ngược mindset kể chuyện trước, nguồn thứ yếu: nhiều tiêu chí (A4, B1-B4, E3) đòi nguồn/đối chiếu nguồn/mẫu khẳng định `SUPPORTED_CLAIM`, mà nguồn nay chỉ thuộc series và AI không còn lập độ phủ.
2. Nhiều tiêu chí hệ thống không quan sát được (D1 "đã nghe hết", C1-C3, D3-D4, E2, E4): ghi tick chỉ tạo cảm giác kiểm soát giả; hệ thống chỉ ghi điều nó thấy.
3. Trùng với checklist đã có (A1-A3, A5) nên chỉ cần hiển thị, không cần dựng lại.
4. Đắt: cột `EpisodeReview.criteria` jsonb, snapshot kết quả tự động, quy tắc `APPROVE` phía server theo mức Bắt buộc/Quan trọng/Lưu ý, route mẫu khẳng định, cấu hình `review.spot_check_claims`.
5. AI không được tự xóa cổng Fact QA; chấm theo tiêu chí dễ bị hiểu là sign-off sự thật dù không ai ký.

## Dữ liệu và việc cần làm

- Không đổi schema cho P5 ở mức này; chỉ cần route/đọc để màn duyệt lấy `episodeChecklist` + tóm tắt AI (đếm `AiCheckItem` theo `status` của check mới nhất).
- `EpisodeNarration.audioOrigin` (`UPLOAD|TTS`) chỉ khi làm TTS (cho dòng giọng AI và nhãn giọng AI).

## Chưa kiểm / mở

- Dòng "Giọng AI..." phụ thuộc trạng thái đoạn TTS chưa tồn tại.
- Có giữ ràng buộc `HAS_SOURCE` khi phát hành **series** không (đã có ở `publishSeries`, xem `plan.md`)? Không ảnh hưởng màn duyệt tập.
- Nhãn pháp lý cho giọng AI nhân vật lịch sử chưa kiểm (cần người phụ trách sản phẩm).
