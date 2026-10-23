# Phase 3: SSE không mất, không trùng

Phụ thuộc: phase 2 (writer phát sự kiện sau khi insert). Cơ chế SSE không đổi theo quyết định 2026-10-22; chỉ đổi payload (bỏ độ phủ/evidence).

## Trạng thái hiện tại (2026-10-23)

- **Đã triển khai:** `check-hub.ts`, `check-stream.ts`, Last-Event-ID replay, heartbeat/unsubscribe và route `events/stream`; test logic SSE đã có trong test suite phase review.
- **Bằng chứng đã có:** API typecheck pass và các test API đã ghi nhận trong session; không có bằng chứng mới để gọi `curl -N` live/Postgres stream là nghiệm thu.
- **Còn mở:** smoke stream khi runner thật đang phát, ngắt/nối lại và kiểm tra proxy/compress theo các mục Việc kiểm.

## Files

- `application/check-hub.ts` đã có từ phase 2 (không tạo `check-event-hub.ts`). Hub chỉ **đánh thức** vòng lặp; sự thật luôn đọc lại từ DB.
- Tạo `apps/api/src/modules/ai-assist/application/check-stream.ts` (`runCheckStream`, `parseLastEventId`; thuần logic nhận repo + hub, có test)
- Sửa `presentation/ai-check.routes.ts`: route `GET .../ai-checks/:checkId/events/stream` (đuôi `/events/stream` để `bypassEventStreams(etag())` sẵn có bỏ qua etag; `compress` của Hono đã bỏ qua `text/event-stream`, đã chạy thật xác nhận). Trần `MAX_STREAMS_PER_USER` = 4, vượt → 429.
- Sửa `routes/docs/paths/ai-assist.ts` (mô tả SSE, `text/event-stream`, header `Last-Event-ID`)

## Hợp đồng sự kiện

- `item`: `id` = `seq`, `data` = `AiCheckItemSchema` = `{ id, seq, blockRef, blockHash, kind: FACT_DOUBT|READABILITY, severity, basis: CONTRADICTED|NOT_FOUND, message, suggestion|null, evidence: [{sourceId, page, quote}], status: OPEN|REVIEWED, appliedAt|null }`. `evidence` chỉ chứa câu trích đã được server kiểm nguyên văn (có thể rỗng).
- `progress`: không có `id`; `data` = `{ processedBlocks, totalBlocks, failedBlocks }` (không còn `claimsChecked`/độ phủ).
- `done` / `failed`: không có `id`; `data` = trạng thái cuối. Sau khi gửi, server đóng stream.
- Thay đổi `REVIEWED`/`appliedAt` qua PATCH **không** phát SSE (chỉ một người dùng thao tác một tab; web cập nhật từ response của PATCH). Item phát lại qua SSE/GET luôn mang trạng thái hiện tại từ DB.
- Heartbeat: comment `: ping` mỗi `AI_ASSIST_HEARTBEAT_MS` (nên 15-25 giây) để proxy không cắt kết nối rảnh. Header phản hồi: `Content-Type: text/event-stream`, `Cache-Control: no-cache, no-transform`, `X-Accel-Buffering: no`. Dùng `streamSSE` và `writeSSE({ id, event, data })` của `hono/streaming`.

## Thuật toán kết nối (`check-stream.ts`)

1. Kiểm quyền (episode + check thuộc episode) trước khi mở stream (404 nếu sai).
2. **Subscribe hub trước**, đẩy sự kiện đến vào buffer.
3. Đọc `lastEventId` từ header `Last-Event-ID` (không có = 0). Truy vấn DB items `seq > lastEventId` theo `seq` tăng, phát từng cái, ghi nhớ `maxSeqSent`.
4. Đọc trạng thái check hiện tại; phát `progress`. Nếu check đã terminal: phát `done`/`failed` rồi đóng (không chờ live).
5. Xả buffer: bỏ item có `seq <= maxSeqSent`, phát phần còn lại; từ đó chuyển sang phát trực tiếp.
6. Hủy: khi client ngắt (`stream.onAbort`) thì unsubscribe, dừng heartbeat. Mọi nhánh lỗi đều unsubscribe (không rò listener).

Hệ quả cần đúng: writer chỉ publish **sau khi insert commit**, nên bước 3 không thể bỏ sót item đã phát ở bước 2 (đã nằm trong DB), và `seq` tuần tự nên so sánh `<= maxSeqSent` là đủ chống trùng.

Phạm vi kênh live: `EventEmitter` trong process. API và worker pg-boss chỉ ghi DB, nên **không** dùng LISTEN/NOTIFY ở P1 (cần kết nối trực tiếp riêng, không chạy qua pooler, payload < 8000 byte và mất khi ngắt). Check do API chạy nên phát trong cùng process; sự thật luôn nằm ở DB và bước 3 đọc lại DB mỗi lần nối lại. Muốn nhiều instance: thêm NOTIFY làm gợi ý thức dậy (`{checkId, seq}`), không thay DB; đó là việc sau.

Giới hạn số kết nối SSE đồng thời mỗi user bằng hằng số có tên (chống mở vô hạn tab; trình duyệt cũng giới hạn ~6 kết nối HTTP/1.1 mỗi origin); vượt → 429. Đóng stream khi check ở trạng thái cuối. Reaper (phase 2) có thể chuyển check sang `FAILED` khi không còn runner: stream đang mở phải nhìn thấy trạng thái cuối qua một lần đọc lại DB định kỳ (chu kỳ bằng heartbeat), rồi phát `failed` và đóng.

## Middleware toàn cục

`app.ts` có `compress()` và `bypassEventStreams(etag())`. Xác nhận bằng chạy thật rằng `text/event-stream` không bị `compress` buffer (xem `curl -N`). Nếu bị, bọc `bypassEventStreams` quanh `compress()` theo cùng cách đã có cho `etag`.

## Việc kiểm

- `curl -N` có cookie phiên: thấy `progress`/`item` đến từng cái khi runner chạy.
- Ngắt giữa chừng rồi nối lại với `Last-Event-ID`: không mất, không trùng.
- Check đã xong: kết nối mới nhận lại toàn bộ item + `done` rồi đóng.

## Done khi

Test thuật toán (phase 5) và smoke `curl -N` đều đạt.
