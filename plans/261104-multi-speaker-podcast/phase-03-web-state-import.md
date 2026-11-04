# Phase 3: Web state, tách đoạn, gán người đọc

Phụ thuộc: Phase 1. Thuần hàm trong `dialogueState.ts`, không động React nên test nhanh. **Mọi helper nhận `dialogue: Dialogue`** (không nhận riêng mảng `speakers`).

## Hàm mới / đổi trong `apps/web/src/features/podcast-production/dialogueState.ts`
| Hàm | Hợp đồng |
|---|---|
| `newDialogue()` | Giữ 2 người `A`, `B` (tên mặc định "Người nói A/B", giọng là 2 giọng đầu của `DIALOGUE_VOICES`), 1 lượt trống. Không đổi |
| `nextSpeakerKey(dialogue)` | `S` + số nhỏ nhất >= 3 chưa là phần của key nào |
| `addSpeaker(dialogue)` | Trả dialogue mới có thêm người: key từ `nextSpeakerKey`, tên "Người nói N" (N = số người sau khi thêm, tăng nếu trùng tên), giọng = giọng đầu tiên trong `DIALOGUE_VOICES` chưa ai dùng. Đã đủ 30 thì trả nguyên dialogue (UI vô hiệu nút, hàm vẫn an toàn) |
| `updateSpeaker(dialogue, key, patch)` | Viết lại theo `map` trên mảng, không còn tuple `[a, b]` |
| `removeSpeaker(dialogue, key)` | Trả `{ dialogue, blockedBy: number }`: nếu còn lượt dùng key thì không xoá, `blockedBy` = số lượt dùng; nếu chỉ còn 2 người thì không xoá, `blockedBy = 0` và UI tự giải thích bằng số người tối thiểu |
| `assignTurns(dialogue, ids: ReadonlySet<string>, key)` | Gán `speaker` cho mọi lượt trong `ids`; key không tồn tại thì trả nguyên |
| `splitScript(text, maxChars = DIALOGUE_TURN_MAX_CHARS)` | Chuẩn hoá `\r\n` → `\n`; tách bằng `/\n\s*\n/`; `trim`; bỏ đoạn rỗng. Đoạn dài hơn `maxChars` thì cắt tiếp ở cuối câu gần nhất (`(?<=[.!?…])\s+`), và nếu một câu vẫn dài hơn `maxChars` thì cắt cứng tại `maxChars`. Trả `{ paragraphs: string[], splitLong: number }` (`splitLong` = số đoạn bị cắt thêm, để UI báo) |
| `importTurns(dialogue, paragraphs, mode: "append" \| "replace", defaultKey?)` | Tạo lượt mới `{ id: uuid, speaker: defaultKey ?? "", text }`. `append` nối cuối; `replace` thay toàn bộ. Nếu tổng lượt > `DIALOGUE_MAX_TURNS` thì **không cắt ngầm**: trả `{ error: "…" }`. Lượt trống `speaker: ""` là trạng thái chưa gán |
| `unassignedTurns(dialogue)` | Trả mảng **`turn.id`** của các lượt có `speaker` rỗng hoặc không thuộc `speakers` (nạp thẳng vào tập chọn `Set<string>` ở Phase 4) |
| `newTurn(speaker)` | Giữ; tham số thành `string` |
| `addTurn` logic (hiện nằm trong component, `DialogueScriptStep.tsx:60-63`) | Chuyển thành `nextTurnSpeaker(dialogue)`: người kế tiếp theo vòng sau người của lượt cuối; không còn ép A/B |
| `dialogueIssues(dialogue)` | Thêm kiểm: lượt chưa gán (speaker rỗng) báo "Lượt N: chưa gán người nói" *trước* khi gọi `DialogueSchema` (schema coi rỗng là sai regex nhưng thông điệp mặc định khó đọc) |

Lưu ý: `turn.speaker` rỗng chỉ tồn tại trong state web để biểu diễn "chưa gán". Về kiểu, `Dialogue["turns"][n]["speaker"]` suy ra là `string` (schema chỉ ràng buộc bằng regex lúc chạy) nên `""` biên dịch được, không cần kiểu `Draft` riêng. Server luôn từ chối `""` (Phase 1). Chặn gửi đi dựa vào autosave sẵn có: `DialogueScriptStep.tsx:55` thoát khi `issues.length > 0`, và `dialogueIssues` luôn báo lượt chưa gán. **Giữ nguyên điều kiện này**; thêm test hồi quy trong Phase 3 là `dialogueIssues` khác rỗng khi có lượt chưa gán. Việc lưu bằng nút (nếu có, `usePodcastCreationWizard.ts:62-64`) cũng phải kiểm `dialogueIssues` trước khi gọi `api.script`: đọc file khi làm.

## Màu người nói
File mới `apps/web/src/features/podcast-production/speakerColor.ts`:
- `SPEAKER_DOT_CLASSES` mảng 6 class Tailwind tĩnh (viết nguyên chuỗi để Tailwind quét được, không ghép chuỗi động) với hằng `SPEAKER_PALETTE_SIZE = 6`.
- `speakerColorClass(dialogue, key)`: theo **vị trí** trong `speakers`, `index % SPEAKER_PALETTE_SIZE`; không tìm thấy thì class trung tính.
- Dùng chung cho `DialogueScriptStep` và `DialogueRecordingSheet`. **Đã kiểm:** token `mod-*` (`globals.css:41-64`) không đủ 6 sắc phân biệt (`mod-primary` và `mod-danger` đều đỏ, `mod-text` gần đen). Dùng 6 màu Tailwind cố định: sky, emerald, amber, violet, rose, indigo.
- Tiền tố tên mặc định là hằng `DEFAULT_SPEAKER_NAME_PREFIX = "Người nói"`, không rải chuỗi.

## Reducer
`podcastWizardState.ts` không đổi: `setDialogue` đã nhận cả Dialogue; chọn nhiều lượt là state cục bộ component (Phase 4), không vào reducer.

## Test (`dialogueState.test.ts`, giữ phong cách `bun:test` hiện có)
- `splitScript`: `\r\n`, nhiều dòng trống liên tiếp, dòng trống chứa khoảng trắng, đoạn rỗng bị bỏ, đoạn dài > max bị cắt ở câu và `splitLong` đếm đúng, câu dài hơn max bị cắt cứng.
- `importTurns`: append giữ lượt cũ, replace bỏ lượt cũ, vượt 300 trả `error` và không đổi dialogue, `defaultKey` được áp dụng.
- `addSpeaker`: key `S3` rồi `S4`, giọng không trùng, dừng ở 30; sau khi `removeSpeaker` một người giữa, `nextSpeakerKey` tái dùng số trống.
- `removeSpeaker`: bị chặn khi còn lượt dùng (`blockedBy` đúng), chặn khi còn 2 người, xoá được khi không ai dùng.
- `assignTurns`: chỉ đổi các id được chọn; key lạ không đổi gì.
- `dialogueIssues`: lượt chưa gán báo đúng chỉ số; hồi quy ca lời trống, tag sai.
- Sửa dòng 36 cũ: thông điệp "Các người nói phải khác giọng".
