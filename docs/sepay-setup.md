# SePay setup (bank transfer + webhook)

Dùng cho gói premium: user quét VietQR, chuyển khoản kèm mã `SK...`; SePay gọi webhook để hệ thống tự kích hoạt.

## 1. Biến môi trường

| Biến | Bắt buộc | Ý nghĩa |
|---|---|---|
| `BANK_SHORT_CODE` | có | Mã ngân hàng VietQR: `BIDV`, `MB`, `VCB`… (đúng mã trên vietqr.io) |
| `BANK_NAME` | có | Tên ngân hàng hiển thị cho user |
| `BANK_ACCOUNT_NUMBER` | có | Số tài khoản nhận tiền |
| `BANK_ACCOUNT_NAME` | có | Tên chủ tài khoản (không dấu) |
| `SEPAY_WEBHOOK_API_KEY` | có | Key tạo ở bước bảo mật webhook; SePay gửi `Authorization: Apikey <key>` |

Production: API từ chối khởi động nếu thiếu `BANK_ACCOUNT_NUMBER`, `BANK_ACCOUNT_NAME` hoặc `SEPAY_WEBHOOK_API_KEY`. Docker `env_file: .env.prod` tự nạp các biến này; không cần khai báo lại trong `environment:`.

`SEPAY_API_TOKEN` chỉ cần khi gọi API SePay để đối soát/chủ động truy vấn giao dịch. Luồng hiện tại chỉ nhận webhook nên không dùng.

## 2. Tạo webhook trên SePay

1. Vào https://my.sepay.vn/webhooks → **+ Thêm webhook**.
2. **Thông tin cơ bản**
   - Sự kiện: **Có tiền vào** (có thể chọn cả hai; giao dịch ra bị hệ thống đánh dấu `ignored`).
   - URL: `https://<api-domain>/api/payments/sepay/webhook`
   - Định dạng dữ liệu: **JSON**.
3. **Tài khoản và bộ lọc**: chọn đúng tài khoản ở `BANK_ACCOUNT_NUMBER`. Có thể lọc tiền tố mã thanh toán `SK` để giảm nhiễu.
4. **Bảo mật**: chọn **API Key**, dán cùng giá trị `SEPAY_WEBHOOK_API_KEY`. Không chọn "không xác thực".
5. **Cảnh báo**: bật thông báo khi webhook lỗi.

Sau khi tạo, dùng **Gửi thử** trên trang webhook. Endpoint phải trả HTTP `200` và body `{"success":true}`. Nếu bật "Tự động gửi lại khi server trả lỗi", SePay retry tối đa 7 lần (~33 phút) khi endpoint trả ngoài 200–299 hoặc timeout 30 giây.

## 3. Kiểm tra thủ công

```bash
curl -i -X POST "http://localhost:3005/api/payments/sepay/webhook" \
  -H "Authorization: Apikey $SEPAY_WEBHOOK_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "id": 999999999,
    "gateway": "BIDV",
    "transactionDate": "2026-11-13 10:00:00",
    "accountNumber": "0123456789",
    "code": "SKTEST0001",
    "content": "SKTEST0001 chuyen tien",
    "transferType": "in",
    "transferAmount": 20000,
    "referenceCode": "FT_TEST_1"
  }'
```

Kỳ vọng: `200 {"success":true}`. Payload trên không khớp đơn nào nên giao dịch nằm ở `payment_transactions.status='unmatched'`, `reason='NO_MATCHING_ORDER'` — đúng hành vi, dùng để test endpoint mà không kích hoạt membership.

Muốn test trọn luồng: tạo đơn thật, chuyển đúng số tiền + `transferContent`, rồi xem **Nhật ký webhooks** trên SePay và bảng `payment_transactions`.

## 4. Lưu ý vận hành

- Idempotent theo `(provider, external_id)` = `('sepay', id)`. SePay gửi lại cùng `id` không tạo giao dịch hay membership thứ hai.
- Endpoint chỉ trả 5xx khi lỗi hạ tầng thật; lỗi nghiệp vụ (lệch tiền, không khớp mã) vẫn trả 200 để tránh retry vô ích, và ghi `needs_review`.
- Nếu server có firewall/whitelist, thêm dải IP gửi webhook của SePay (danh sách công bố tại https://docs.sepay.vn/tich-hop-webhooks.html).
- SePay **Test Mode** dùng để thử webhook/API trước khi go-live, không phát sinh giao dịch thật.
