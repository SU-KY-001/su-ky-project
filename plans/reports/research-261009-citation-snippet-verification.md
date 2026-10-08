# Báo cáo: trích dẫn `citationSnippet` trong workflow kịch bản không kiểm chứng được

**Ngày:** 2026-10-09. **Phạm vi:** backend agent (`apps/api/src/modules/script-workflow`). Không thuộc plan frontend `261009-0010-moderator-script-workflow-frontend`, chưa có plan riêng.

## Vấn đề
Bước `FACT_EXTRACTOR` phải xuất `citationSnippet` là "đoạn nguyên văn" (prompt: "citationSnippet phải là đoạn nguyên văn"). Nhưng bước này **không có cách lấy văn bản thật của nguồn**, nên đoạn trích có thể do model nhớ hoặc bịa, và người dùng không phân biệt được.

## Bằng chứng (đã đọc code)
| Nội dung | Vị trí |
|---|---|
| Chỉ `RESEARCHER` nạp công cụ web (`web_search`, `fetch_content`, `get_search_content`, `source_check` của gói `pi-web-access`); các bước khác chạy `noTools` "để không thể tự bịa nguồn" | `infrastructure/pi/structured-agent-runner.ts:80-91, 141-143` |
| Nguồn trong workflow chỉ có metadata: `name`, `authorOrOrigin`, `tier`, `tierDescription`, `reliabilityScore`, `crossVerificationNotes`, `url?`, `locationInSource?`. Không có nội dung tài liệu | `packages/shared/src/schemas/script-workflow/research-consultation.ts` (`SourceItemSchema`) |
| Bước sau chỉ nhận danh sách nguồn qua đầu vào (`<danh_sach_nguon>`, `<ma_tran_nguon>`), không có prompt nào ghi thẳng "cấm dùng nguồn ngoài danh sách" | `infrastructure/prompts/*.prompt.ts` |
| `SCRIPT_WRITER` chỉ có câu "không thêm dữ kiện mới ngoài Research Pack" ở nhánh chỉnh sửa | `script-writer.prompt.ts:39` |

## Kết luận
- Việc tắt công cụ ở các bước sau là chủ ý: ngăn tự tìm nguồn mới. Cái giá là không kiểm chứng được trích dẫn.
- Thêm câu "chỉ dùng nguồn trong danh sách" vào prompt **không** giải quyết vấn đề này, vì nó chặn chọn nguồn, không chặn bịa nguyên văn.

## Phương án nếu muốn sửa
**Cấp `fetch_content` cho `FACT_EXTRACTOR`** để mở lại nguồn lấy đoạn trích thật. Hai điều kiện, nếu thiếu thì phương án không đạt:
1. **Chỉ cấp công cụ thôi là chưa đủ.** Model có thể truyền cho `fetch_content` bất kỳ URL nào nó nhớ hoặc bịa. Muốn giới hạn trong danh sách nguồn đã chốt thì runner phải **bọc công cụ và từ chối URL không nằm trong `sourcesCatalogue` của bản đã duyệt**. Chưa kiểm runner có cho bật từng công cụ riêng cho một bước hay có điểm chặn để bọc hay không (hiện mã chỉ thấy bật hoặc tắt cả bộ web qua `useWebTools`).
2. **`url` là trường tuỳ chọn.** Nhiều nguồn chính sử (Tầng 1) thường không có `url`, nên đoạn trích của các nguồn đó vẫn **không kiểm chứng được** dù có cấp công cụ. Cần quyết cách xử lý: để trống `citationSnippet` khi không có `url`, hoặc gắn nhãn "chưa kiểm chứng".

## Phương án nhẹ, không đụng agent
Ở giao diện kiểm định và xuất bản, gắn nhãn "Trích dẫn chưa được kiểm chứng với nguồn gốc" cạnh các đoạn trích. Không cần backend. Chưa đưa vào plan frontend, cần người dùng quyết.

## Việc cần quyết
1. Có cần sửa phía agent không, hay chấp nhận rủi ro này và chỉ gắn nhãn ở giao diện.
2. Nếu sửa: mở plan backend riêng với 2 điều kiện ở trên; nên gộp với việc đo xem mức bịa nguyên văn thực tế (chạy thử vài workflow, đối chiếu đoạn trích với nguồn có `url`) trước khi đầu tư.
