# Phase 4: S3 Workspace (khung, stepper, version, panel chỉ đọc)

**Phụ thuộc:** phase 2. Đặc tả: UX §3 S3, §4.2, 4.3, 4.5, 4.6, §5.1.

## Việc làm

1. **Khung.** Thanh tiêu đề (← Danh sách, chủ đề, badge trạng thái), stepper 7 bước bên trái (ngang cuộn / dropdown "Bước n/7" dưới 768px), panel giữa, thanh hành động dính đáy, tab `Quy trình | Cây lịch sử | Nhật ký` (hai tab sau là phase 8, ở đây chỉ dựng tab bar).
2. **Stepper.** Luôn vẽ đủ 7 bước. Mỗi bước: số, tên tiếng Việt (UX §3.1), icon + chữ theo `StepStatus`, dấu cổng `◆` cho `REVIEW_REQUIRED`. `STALE` hiển thị "Cần chạy lại" (không dùng chữ `STALE`). `PENDING` disabled + tooltip. Là `ol` có nhãn, `aria-current="step"`.
3. **Chọn bước tự động** (WAITING_FOR_HUMAN, rồi FAILED, rồi bước đang chạy gần nhất). Không nhảy khi dữ liệu cập nhật; chỉ hiện chấm thông báo ở bước mới cần chú ý.
4. **Version switcher.** Tab `v1, v2…` từ `versions[]`, nhãn `v2 · hiện tại` / `v1 · đã duyệt`. Xem bản cũ: panel chỉ đọc, dải "Bạn đang xem v1. Hành động áp dụng cho v2." + nút về bản hiện tại. Hiện `humanFeedback` dưới tab. `baseVersion` luôn lấy từ `currentVersion` của lần fetch mới nhất (lưu ở store, không lấy từ tab đang xem).
5. **Trạng thái chờ.** `QUEUED`/`RUNNING`: skeleton + "AI đang xử lý…" + đồng hồ thời gian đã chạy; hơn 5 phút không có event thì nhắc "đang chạy lâu hơn bình thường" (hằng số `SLOW_STEP_MS`). `FAILED`: banner đỏ đầu trang với `errorMessage` + nút **Làm lại**. Hoạt ảnh nhấp nháy tắt khi `prefers-reduced-motion`.
6. **Panel chỉ đọc**, mỗi bước một component trong `components/steps/`:
   - `SourceEvaluatorPanel`: bảng nguồn thẩm định, tier (`SOURCE_TIER_LABELS`), điểm tin cậy, vai trò, cờ `echoChamberFlag`, `debatedDetails`; khối cảnh báo `singleSidedSourceWarnings` (vàng) / `flaggedInsufficientSources` (đỏ).
   - `FactExtractorPanel`: tab `Thẻ sự kiện | Niên biểu | Nhân vật | Khoảng trống`; nhãn độ chắc chắn `CONFIRMED/DEBATED/INSUFFICIENT`; niên đại font mono.
   - `ScriptWriterPanel`: 3 tab tập, `narration`, số từ, thời lượng; nhãn "Bản nháp trước khi chuyển văn nói".
   - `OralizerPanel`: 3 tab tập, `spokenNarration` cỡ đọc dài (≤ ~70 ký tự/dòng), `breathAndPacingNotes`.
7. **Cập nhật dữ liệu:** `GET /:id` là nguồn sự thật; SSE chỉ kích hoạt refetch (UX §5.1). Mở stream khi run chưa `COMPLETED/FAILED`.
8. **Nội dung `outputJson`** parse bằng `STEP_OUTPUT_SCHEMAS[stepType]` (`@repo/shared`); dữ liệu không khớp thì hiện khối "Dữ liệu bước này không đọc được" kèm JSON thô thu gọn, không crash.

## UI/UX

- Số liệu: số từ dấu chấm ngăn nghìn, thời lượng `~36 phút`, ngày `dd/MM/yyyy HH:mm`.
- Mọi trạng thái màu kèm icon và chữ; tương phản ≥ 4.5:1 (kiểm trên cả 5 màu trạng thái với nền `mod-surface`).
- `aria-live="polite"` thông báo "Bước <tên> đã sẵn sàng để duyệt".

## Acceptance

- Mở một workflow thật đang chạy: stepper cập nhật theo SSE không cần reload; ngắt API thì hạ cấp polling và hiện banner.
- Workflow đã qua các bước tự động: 4 panel chỉ đọc hiển thị đúng dữ liệu thật (so với `GET /:id`).
- Có workflow `FAILED` (hoặc tạo bằng mock) hiện đúng banner.
- 375px dùng được, điều hướng bàn phím trọn vẹn, `prefers-reduced-motion` tắt nhấp nháy.
