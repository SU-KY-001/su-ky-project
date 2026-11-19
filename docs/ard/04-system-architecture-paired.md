# ARD 04: Kiến trúc hệ thống Su-Ky (kiểu C4, mỗi chiều một mũi tên)

Cùng nội dung với `03` (có pg-boss). Khác ở cách vẽ mũi tên: theo [C4 Notation](https://c4model.com/diagrams/notation), **mỗi đường chỉ một chiều và có nhãn riêng**. Mỗi tương tác hỏi–đáp vẽ thành **hai đường song song**: một đường yêu cầu, một đường phản hồi. `00`–`03` giữ nguyên.

## Cách đọc

- Mỗi mũi tên đi một chiều, nhãn là thứ đi trên đường đó.
- Đường yêu cầu nằm phía trên (hoặc bên trái), đường phản hồi nằm phía dưới (hoặc bên phải).
- Giao thức ghi ở đường yêu cầu (`HTTPS`, `HTTP`, `SQL`). Với đường trong cùng tiến trình hoặc tiến trình con (nét đứt) không ghi giao thức; chú giải nói rõ nét đứt nghĩa là gì.
- Nét liền: gọi qua mạng. Nét đứt: trong cùng một tiến trình hoặc máy.

## 15 cặp, 30 mũi tên

| Cặp | Yêu cầu | Phản hồi | Ghi chú |
|---|---|---|---|
| Người dùng ⇄ Client | `use` | `see` | |
| Client ⇄ Traefik | `request (HTTPS)` | `data (JSON, SSE)` | SSE là server đẩy về trên kết nối client mở |
| Traefik ⇄ Hono API | `forward (HTTP)` | `reply` | |
| Hono API ⇄ Domain modules | `route` | `result` | Trong tiến trình |
| Domain modules ⇄ Prisma | `query` | `rows` | Trong tiến trình |
| Prisma ⇄ PostgreSQL | `SQL` | `rows` | |
| Domain modules ⇄ LibreOffice | `DOC` | `DOCX` | Tiến trình con (`Bun.spawn`) |
| Domain modules ⇄ AI Assist | `ask` | `answer` | Rà kịch bản hoặc tạo giọng |
| AI Assist ⇄ ffmpeg | `WAV` | `MP3` | Tiến trình con (`execFile`) |
| AI Assist ⇄ Google Gemini | `prompt (HTTPS)` | `text, audio` | |
| Domain modules ⇄ Cloudinary | `check, delete (HTTPS)` | `status` | `api.resource`, `uploader.destroy`; ký ticket tính cục bộ |
| Client ⇄ Cloudinary | `upload (HTTPS)` | `result` | Tải thẳng bằng ticket đã ký; đi vòng dưới khung VPS |
| suky-api ⇄ Job queue | `schedule` | `job` | Job bảo trì chạy trong tiến trình API |
| suky-worker ⇄ Job queue | `poll` | `job` | Job nhắc hạn sản xuất |
| Job queue ⇄ PostgreSQL | `SQL` | `rows` | pg-boss lưu trạng thái job trong PostgreSQL |

## Đánh đổi so với bản hai đầu

| | Hai mũi tên (04) | Một mũi tên hai đầu (02/03) |
|---|---|---|
| Theo C4 | Có | Không |
| Thấy dữ liệu quay về | Có, có nhãn riêng | Có, gộp trong một nhãn |
| Độ rối | Cao hơn (30 mũi tên) | Thấp hơn (15 mũi tên) |

## Lưu ý

- Các đường từ Domain modules tới LibreOffice, AI Assist, ffmpeg thể hiện module sở hữu chức năng; chưa kiểm từng lời gọi.
- Ô Job queue là ô logic: pg-boss là thư viện, trạng thái lưu trong PostgreSQL, API và worker mỗi bên chạy một instance.
- Nhãn `SQL` chưa kiểm riêng. Việc phát audio từ Cloudinary về client không vẽ vì chưa thấy chỗ client gọi URL đã ký.

## Cách sinh lại

```bash
node docs/ard/gen_sad_04.mjs docs/ard/04-system-architecture-paired.drawio
"C:\\Program Files\\draw.io\\draw.io.exe" -x -f png -s 2 -b 20 -o docs/ard/04-system-architecture-paired.png docs/ard/04-system-architecture-paired.drawio
```
