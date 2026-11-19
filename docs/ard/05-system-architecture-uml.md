# ARD 05: Kiến trúc hệ thống Su-Ky (mũi tên theo quy ước UML)

Cùng nội dung và bố cục với `04` (mỗi tương tác hỏi–đáp là hai đường một chiều, có pg-boss). Chỉ đổi cách phân biệt kiểu nét cho khớp quy ước **sơ đồ trình tự UML**: nét liền là yêu cầu, nét đứt là phản hồi. `00`–`04` giữ nguyên.

## Quy ước

| Dấu hiệu | Nghĩa |
|---|---|
| Nét **liền** | Yêu cầu (bên gọi → bên được gọi) |
| Nét **đứt** | Phản hồi (bên được gọi → bên gọi) |
| Màu **tối** | Gọi qua mạng |
| Màu **xanh lục** | Trong cùng tiến trình hoặc tiến trình con cùng máy |

Quy ước nét lấy từ sơ đồ trình tự UML (nét đứt là return message). Sơ đồ kiến trúc và C4 không có quy tắc chung, nên chú giải trên hình nêu rõ.

## Khác bản 04

| | 04 | 05 |
|---|---|---|
| Nét liền/đứt | Liền = mạng, đứt = trong tiến trình | Liền = yêu cầu, đứt = phản hồi |
| Phân biệt mạng và trong tiến trình | Bằng nét | Bằng màu (tối / xanh lục) |
| Rủi ro đọc nhầm | Người quen UML có thể đọc nét đứt là phản hồi | Không |

## 15 cặp

Các cặp, nhãn và ghi chú giống `04-system-architecture-paired.md`. Đọc theo chiều: nhãn nét liền là yêu cầu (có giao thức như `HTTPS`, `SQL`), nhãn nét đứt là phản hồi (`data`, `rows`, `status`…).

## Lưu ý

- Các đường từ Domain modules tới LibreOffice, AI Assist, ffmpeg thể hiện module sở hữu chức năng; chưa kiểm từng lời gọi.
- Ô Job queue là ô logic: pg-boss là thư viện, trạng thái lưu trong PostgreSQL.
- Nhãn `SQL` chưa kiểm riêng. Không vẽ mũi tên phát audio từ Cloudinary về client vì chưa thấy chỗ client gọi URL đã ký.
- Chưa đối chiếu với đặc tả UML chính thức (OMG); quy ước lấy từ tài liệu tham khảo thứ cấp.

## Cách sinh lại

```bash
node docs/ard/gen_sad_05.mjs docs/ard/05-system-architecture-uml.drawio
"C:\\Program Files\\draw.io\\draw.io.exe" -x -f png -s 2 -b 20 -o docs/ard/05-system-architecture-uml.png docs/ard/05-system-architecture-uml.drawio
```
