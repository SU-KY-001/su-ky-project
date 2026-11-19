# ARD 05-2: Bản gọn của 05 cho Google Docs

Bản 05 chiếm chiều rộng, đưa lên Google Docs bị co nhỏ nên chữ khó đọc. 05-2 giữ nguyên nội dung, đường, icon và khung như 05; chỉ thu hẹp khoảng trống. `05` giữ nguyên.

## Quy ước (giống 05)

| Dấu hiệu | Nghĩa |
|---|---|
| Nét **liền** | Yêu cầu (bên gọi → bên được gọi) |
| Nét **đứt** | Phản hồi (bên được gọi → bên gọi) |
| Màu **tối** | Gọi qua mạng |
| Màu **xanh lục** | Trong cùng tiến trình hoặc tiến trình con cùng máy |

## Khác gì so với 05

| | 05 | 05-2 |
|---|---|---|
| Kích thước ảnh | 4710×2270 px, tỉ lệ 2,08 | 3830×1882 px, tỉ lệ 2,04 |
| Ô lá (Prisma, LibreOffice, ffmpeg, AI Assist) | 140 px rộng | 104 px |
| Khoảng giữa các cột | 90 px | 72 px |
| Đệm khung | 30 px | 24 px |
| Icon | 40 px | 32 px |
| Khoảng giữa hàng | 90 px | 66 px |
| Hàng PostgreSQL / Job queue / suky-worker | Dưới khung suky-api, trong Docker Compose | Giữ nguyên vị trí |
| Legend | Một hàng dưới đường vòng | Giữ nguyên |

Chiều rộng giảm 19%, chiều cao giảm 17%.

## Lưu ý lúc đưa lên Google Docs

- Google Docs co hình về đúng chiều rộng trang, không co thêm. Hình hẹp hơn nên chữ lớn hơn.
- Nếu vẫn nhỏ, đặt hình theo chiều ngang (landscape) hoặc đưa trang thành nửa trang, ảnh rộng hết khổ.

## Cách sinh lại

```bash
node docs/ard/gen_sad_05_2.mjs docs/ard/05-2-system-architecture-compact.drawio
"C:\\Program Files\\draw.io\\draw.io.exe" -x -f png -s 2 -b 20 -o docs/ard/05-2-system-architecture-compact.png docs/ard/05-2-system-architecture-compact.drawio
```
