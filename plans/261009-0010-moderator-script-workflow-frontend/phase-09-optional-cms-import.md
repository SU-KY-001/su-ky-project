# Phase 9 (tuỳ chọn, chưa quyết): Import kết quả vào CMS

**Trạng thái: deferred.** Chỉ làm khi người dùng xác nhận. `docs/ux/script-workflow-ux.md` §9 ghi rõ "gắn kịch bản vào Series/Episode" **ngoài phạm vi**, còn plan này đã chốt "chỉ workflow tạo kịch bản". Tuy nhiên API đã có sẵn bước này.

## Nếu làm

- `GET /:id/import-preview`: đối chiếu kết quả Gate 2 với catalog (nguồn trùng, thực thể trùng); phải gửi lại `basis.factCheckerVersionId`.
- `POST /:id/import` (`Idempotency-Key`, rate `ai_import`): tạo Series, các tập nháp, bản kể, nguồn, thẻ thực thể. Bắt buộc có quyết định cho **mọi** nguồn trong danh mục AI (`CREATE` hoặc loại), thiếu thì `422 IMPORT_DECISIONS_INCOMPLETE`; `409 STALE_WRITE` nếu nhánh đổi so với `basis`.
- `GET /:id/import`: đọc lại kết quả đã nhập (`404 NOT_IMPORTED` khi chưa nhập).
- UI: bước "Nhập vào thư viện" sau S4, bảng quyết định nguồn/thực thể, kết quả kèm liên kết tới Series trong Studio.

## Câu hỏi cho người dùng

1. Có làm bước import trong đợt này không?
2. Nếu có, Studio (quản lý Series/Tập) đã có UI chưa, hay chỉ cần hiện kết quả import và ID?
