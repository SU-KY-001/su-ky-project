# ARD 05-1: Bản 05 dựng bằng skill `drawio`

Nội dung và quy ước giống `05` (mỗi chiều một mũi tên, nét liền = yêu cầu, nét đứt = phản hồi, màu tối = qua mạng, màu xanh lục = trong tiến trình hoặc cùng máy). Khác ở cách dựng: viết đặc tả YAML rồi chạy CLI của skill `drawio`, không tự viết XML.

## Quy trình

1. `.drawio-tmp/05-1-system-architecture-skill/make-spec.mjs` tính toạ độ làn và khe nối, rồi sinh `input.yaml` (đặc tả YAML, theme `tech-blue`, profile `engineering-review`).
2. CLI của skill sinh `.drawio`, `.svg`, `.png` (PNG qua draw.io Desktop với `--use-desktop`) và kiểm tra hợp lệ.

```bash
node .drawio-tmp/05-1-system-architecture-skill/make-spec.mjs .drawio-tmp/05-1-system-architecture-skill/input.yaml
node <skill>/scripts/cli.js .drawio-tmp/05-1-system-architecture-skill/input.yaml docs/ard/05-1-system-architecture-skill.drawio --validate --write-sidecars --sidecar-dir .drawio-tmp/05-1-system-architecture-skill
```

Đổi đuôi `.drawio` thành `.svg` hoặc `.png` (thêm `--use-desktop`) để xuất các định dạng khác.

## Khác bản 05 do giới hạn của skill

| Mục | Bản 05 | Bản 05-1 |
|---|---|---|
| Khung lồng nhau (VPS ⊃ Docker Compose ⊃ suky-api) | Có | Không: `modules` của skill chỉ một cấp. Vị trí ghi trong nhãn, ví dụ `VPS › Docker Compose › suky-api (Bun)` |
| Logo công nghệ (Simple Icons) | Có | Không: skill chỉ nhận tên icon dựng sẵn, không nhận ảnh nhúng |
| Web App và Mobile App | Hai ô | Một ô `Client` (để khỏi nhân đôi mũi tên) |
| Nhãn nhiều dòng | Có | Không: nhãn xuống dòng thành một dòng |
| Kiểu chữ | Helvetica | Helvetica (khai báo qua `meta.font`) |
| Phân loại nét | Tự đặt | `primary` (liền) cho yêu cầu, `data` (đứt) cho phản hồi |

## Kiểm tra

- Cả ba lần xuất cho kết quả `XML validation: PASSED`.
- Còn 4 cảnh báo "short final segment (-136px)" ở các cặp `mods ⇄ prisma` và `mods ⇄ ai`. Ảnh cho thấy các mũi tên thẳng đứng, nên coi đây là cảnh báo sai của bộ kiểm tra; chưa tìm nguyên nhân.
- Mũi tên `Client ⇄ Cloudinary` đi vòng dưới các khung bằng điểm uốn (waypoint) và không có khe nối khai báo, theo đúng quy tắc của skill (không trộn hai kiểu).
- Ô người dùng (hình elip) có một đoạn gấp nhỏ ở hai mũi tên đầu vì khe nối không nằm trên viền elip.
- PNG xuất bằng `draw.io.exe -x -s 2` từ chính file `.drawio` (4790 px rộng); PNG do CLI của skill xuất chỉ ở 1x nên mờ.
- Mỗi tầng một màu qua `style` của từng khung và ô (client xanh dương, VPS cyan, suky-api xanh lục, data tím, external cam).
- Cột bên phải Traefik đẩy xa hơn để nhãn nằm trong khoảng trống, không đè lên viền khung. Tiêu đề khung data đặt dưới khung vì các đường SQL từ Prisma đi xuyên qua phần đầu khung.
- Icon: skill `drawio` không nhúng được ảnh, nên sau khi CLI sinh `.drawio`, script `add-icons.mjs` thêm 17 ô ảnh Simple Icons (react, vite, tailwindcss, expo, traefik, hono, typescript, prisma, libreoffice, ffmpeg, postgresql, bun, cloudinary, googlegemini, docker) và hai ký tự `π`, `⏱` cho AI Assist và Job queue. Bước này nằm ngoài skill; PNG/SVG xuất lại bằng draw.io từ file đã thêm icon.
- Đệm (padding) khung: theme cố định 24px nên mỗi khung thêm hai điểm neo trong suốt để rộng thêm 24px mỗi phía.
