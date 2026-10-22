# Phase 4: Giao diện (bước Kịch bản, tab Trợ lý AI)

Phụ thuộc: phase 2, 3. Thay hẳn `ScriptAssistantMock` (không giữ song song, không để mock sót lại).

## Hiện trạng đã đọc

`apps/web/src/features/podcast-production/components/PodcastScriptStep.tsx` render `RichScriptEditor` (Tiptap, `StarterKit`, handle chỉ có `insertCitation`) bên trái và cột 320px bên phải với tab "Trợ lý AI" (`ScriptAssistantMock`) | "Nguồn" (`ScriptSourcesPanel`). Service dùng Hono RPC (`podcastProductionService.ts`), hook TanStack Query (`usePodcastProduction.ts`). Editor `insertCitation`, tab Nguồn, thông báo `HAS_SOURCE`: **giữ nguyên**, không mở rộng.

## Trải nghiệm (đặc tả: `plans/reports/ui-spec-261022-ai-assistant-mod.md`)

Màn mặc định: một thẻ "AI rà kịch bản" + một nút. Danh sách cảnh báo là **checklist**; mod tự bấm mục nào cũng được. Bấm một dòng mở **chi tiết**; chi tiết có đúng **hai nút chân trang: "Quay lại" và "Hoàn tất"**. Không có "Mục sau/Mục trước", không có "Tự sửa", "Giữ nguyên", "Bỏ qua", không bắt lý do. Sửa kịch bản trực tiếp trong editor chỉ là soạn thảo bình thường, không phải tính năng.

**Chữ trung thực:** mọi nhãn là "AI nghi ngờ, chưa xác minh"; không bao giờ "đã kiểm tra/đã xác minh". Không có tổng "0 vấn đề = ổn": nếu `failedBlocks > 0` hoặc chưa xong thì không được hiện kết luận "không có cảnh báo".

## Files (mỗi file < 200 dòng)

Tạo trong `apps/web/src/features/podcast-production/`:
- `aiCheck/blockRefs.ts`: trích block từ `EditorDocument` (quy tắc block ở `spec-prompts-review.md` B1): `ref = b{docIndex}` tuyệt đối trên toàn tài liệu (cả khi `SELECTION`), `text`, `hash` = `hashBlockText` **của `@repo/shared`**, `prev`, `dup` (tính trên toàn tài liệu). `locateBlock(doc, item)` thực hiện **đúng quy tắc định vị (1)-(3)** ở spec B1: vị trí + hash + hash block trước; dời chỗ chỉ khi `blockDup == 1` và đúng một block khớp; còn lại `conflict`. Không có "gần nhất", không đoán. Hàm thuần, có test.
- `aiCheck/aiCheckService.ts`: `POST/GET/cancel/PATCH` bằng Hono RPC + parse schema shared; `eventsUrl(episodeId, checkId)`. (Không còn `suggest`.)
- `aiCheck/useAiCheck.ts`: tạo check, giữ state (`items`, `progress`, `status`), mở `EventSource`, dedupe theo `item.id` (không ghi đè trạng thái cục bộ `REVIEWED/appliedAt` bằng bản phát lại cũ), đóng khi `done`/`failed`/unmount. `EventSource` tự gửi `Last-Event-ID`. Mở trang: `GET` danh sách gần đây để mở lại check mới nhất sau F5.
- `aiCheck/wordDiff.ts`: diff từng từ thuần (thêm/bớt), không thêm thư viện, có test.
- `aiCheck/novelHint.ts`: heuristic mềm: số/từ viết hoa có trong `suggestion` mà không có trong block gốc → trả danh sách để hiện "Có số/tên mới: ... — hãy kiểm tra". **Chỉ là gợi ý, không chặn Áp dụng**, không phải kiểm chứng.
- `components/AiAssistantPanel.tsx`: thay `ScriptAssistantMock`; state máy `idle | running | done | detail(itemId)`.
- `components/ScriptReviewConfigDialog.tsx` (Dialog sẵn có `shared/components/ui/dialog`): một hộp thoại: phạm vi (cả kịch bản / đoạn đang chọn; khóa nếu chưa chọn), ô **"Ghi chú cho AI"** tự do, dòng xác nhận nội dung gửi tới nhà cung cấp AI, nút Chạy. **Không có** radio mức nghiêm khắc.
- `components/AiCheckProgress.tsx`: trạng thái **"AI đang chạy…"**: "đã xét x/y đoạn", đồng hồ, số cảnh báo tìm thấy, `failedBlocks` nếu có, `INTERRUPTED`; nút Hủy; "đóng tab vẫn không mất".
- `components/AiIssueList.tsx`: tiêu đề "n cảnh báo, m đã xem" + nhãn "AI nghi ngờ, chưa xác minh". Mỗi dòng: tag loại (nghi sai / đọc thành tiếng-mạch), thông điệp ngắn, trạng thái "chưa xem / đã xem", tag nhỏ "đã áp dụng" nếu `appliedAt`. Bấm dòng → chi tiết; điều khiển được bằng bàn phím, nhãn nút rõ.
- `components/AiIssueDetail.tsx`: giải thích (`message`); với `basis = CONTRADICTED`, khối **"Nguồn đối chiếu"** liệt kê từng `evidence` (câu trích nguyên văn + tên nguồn + trang) (xem mockup 01); với `basis = NOT_FOUND`, dòng "Hệ thống chưa dẫn được câu nguồn nguyên văn cho chỗ này. Điều đó không có nghĩa là sai." (không có khối trích dẫn). Đề xuất sửa (chỉ có khi `CONTRADICTED`) hiển thị dạng word diff so với đoạn **hiện tại** (không có `suggestion` thì không hiện khối này), cảnh báo `novelHint` nếu có, nút tùy chọn **"Áp dụng đề xuất"**. Chân trang đúng hai nút: **Quay lại** (đóng, trạng thái không đổi) và **Hoàn tất** (PATCH `REVIEWED`, trở về danh sách). Editor tô viền đoạn của mục đang mở (`focusBlock`). Mọi chuỗi từ model hiển thị bằng `textContent`/escape, không `innerHTML` thô (đã gặp ở mock).

Sửa:
- `RichScriptEditor.tsx`: mở rộng `RichScriptEditorHandle` thêm `getBlocks()`, `getSelectionBlocks()`, `focusBlock(ref)` (selection + `scrollIntoView` bằng lệnh Tiptap có sẵn, không plugin ProseMirror), `replaceBlockText(ref, expectedHash, text)` trả `"ok" | "conflict"`.
- `PodcastScriptStep.tsx`: thay `<ScriptAssistantMock .../>` bằng `<AiAssistantPanel editorRef={editorRef} episodeId=... />`, xóa import mock. Panel **không cần** danh sách nguồn từ client (nguồn series do server đọc).
- Xóa `ScriptAssistantMock.tsx` (và tham chiếu trong test nếu có).

## Hành vi "Áp dụng đề xuất" (hash-mismatch rule)

1. Bấm nút → `locateBlock(doc, item)`; kết quả `target | conflict`. Là `target` thì `replaceBlockText(target, item.suggestion)`.
2. `conflict` (đích bị sửa, bị xóa, hoặc không xác định được vì trùng nội dung): hiện "Đoạn đã đổi, chạy lại" (có nút chạy lại phạm vi đoạn đang chọn); **không ghi đè chữ của mod**, không PATCH `appliedAt`.
3. Khớp → thay trong một thao tác Tiptap (Ctrl+Z hoàn tác được); sau đó PATCH `{ applied: true }` để server ghi `appliedAt`. Hiện tag "đã áp dụng". Nếu PATCH lỗi: văn bản đã đổi, báo lỗi ghi nhận và cho thử lại PATCH (không đảo thay đổi).
4. Áp dụng **không** tự Hoàn tất; mod vẫn bấm Hoàn tất khi muốn. Đã áp dụng thì nút "Áp dụng đề xuất" ẩn/khóa (một lần).
5. Không có ghi nào khác vào kịch bản; `autosave` hiện có lo lưu, không thêm đường ghi mới.

## Quy tắc ô nhập và trạng thái chờ

- **Không ô nào chỉ có lựa chọn cố định**: preset/chip chỉ điền sẵn vào ô tự do (áp dụng cho P1: ô ghi chú; cho P3 xem ui-spec). Số (phút, số bản, tốc độ) là ô number có chip điền nhanh.
- Mọi chỗ gọi AI có trạng thái chờ rõ ("AI đang chạy…"), nút bị khóa khi đang chạy, `aria-busy`.
- Lỗi hiển thị theo mã API: 409 (đang chạy), 422 (vượt độ dài; hoặc `NO_READABLE_SOURCE`: "Series chưa có nguồn đọc được để AI đối chiếu"), 429 (kèm `Retry-After`), 503; check `FAILED` với `AI_PROVIDER_AUTH/QUOTA` → "Dịch vụ AI tạm không dùng được, báo quản trị". `role="alert"` như phần lỗi hiện có.

## Việc kiểm

- `check-types` web sạch; test `blockRefs`, `wordDiff`, `novelHint` đạt; test hiện có của `RichScriptEditor`/`scriptEditor` vẫn đạt.
- Duyệt thật bằng trình duyệt (phase 5 smoke).

## Done khi

Mock không còn trong repo; màn mặc định một việc; cấu hình trong một Dialog (phạm vi + ghi chú tự do); danh sách checklist + chi tiết với hai nút Quay lại/Hoàn tất; Áp dụng đề xuất tùy chọn và từ chối khi hash lệch; nối lại SSE sau F5 không mất/trùng; wording "AI nghi ngờ, chưa xác minh". Bản xem thử tương tác `mockups/01-source-check.html` là hình mẫu (tên file giữ nguyên).
