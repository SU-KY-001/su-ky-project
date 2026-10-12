# Brainstorm: Studio CRUD (series/episode) + Thời kỳ → Giai đoạn

Date: 2026-10-10. Status: design chốt, chờ plan.

## Vấn đề
Luồng AI-first làm sai lõi. Mod phải kiểm soát hoàn toàn qua CRUD. Backend CRUD series/episode/narration/source-library ĐÃ có; thiếu UI studio, nguồn series-level + PDF, phân tầng thời kỳ.

## Quyết định
| # | Quyết định |
|---|---|
| D1 | Điều hướng: Thời kỳ → Giai đoạn → Series, bằng FK do mod chọn. Không lọc theo năm gõ tay. |
| D2 | `Series.startYear/endYear` = metadata mô tả (thẻ, timeline, gợi ý). Ngoài khoảng giai đoạn → cảnh báo mềm, vẫn lưu. |
| D3 | Mô hình **B**: bảng `HistoricalPeriod` (Thời kỳ, giữ) + bảng mới `HistoricalPhase(periodId, name, slug, startYear, endYear, sortOrder, note)`. `Series.historicalPeriodId` → `historicalPhaseId`; thời kỳ suy ra qua phase. Seed cứng, không UI sửa. Lý do: DB ép đúng 2 tầng + series luôn trỏ giai đoạn; migration init mới 2 ngày, chưa có dữ liệu thật. |
| D4 | Nguồn **series-level, tái dùng**: bảng `SeriesSource(seriesId, sourceId, locator, sortOrder)`. **Bỏ hẳn `EpisodeSource`** (không giữ song song). |
| D5 | Kịch bản = **text thuần** (`EpisodeNarration.scriptContent` Text, textarea). Không Tiptap/markdown/HTML. |
| D6 | Audio tập = narration `THIRD_PERSON`, chỉ upload. Giữ schema `FIRST_PERSON` (chưa làm UI). **Xóa** `audioProvider`/ElevenLabs khỏi schema, thêm lại khi làm thật. |
| D7 | AI = **trợ lý, không phải trung tâm**. Tách `script-workflow` làm đôi: **AI engine** (`pi-runtime`, `structured-agent-runner`, tracer, schema-retry) GIỮ thành module `ai-engine` trong `apps/api`, không route/bảng/boot-init, không module nghiệp vụ nào import, để sau làm module trợ lý/review. **Workflow AI-first** (7 bước, 3 cổng, hàng đợi, 6 bảng, importer, UI) → `archive/script-workflow/` ngoài build, tag `archive/script-workflow-v1` giữ bản chạy được. Giữ dep `pi-*` + env AI (optional). Giữ `pg-boss` (maintenance jobs tự khởi động boss riêng). |
| D8 | Năm TCN lưu số âm. Quy ước mốc giao (vd 43) phải chốt khi seed. |

## Hệ quả của D4 (đã kiểm trong `content.service.ts`)
- `publishEpisode` dùng `episodeChecklist(...).ready`; `deleteSource` chặn xóa nguồn cuối của tập đã publish (`REQUIRED_FOR_PUBLISHED`). Yêu cầu "tập phải có nguồn" hiện nằm ở episode. Chuyển sang: **series** phải có ≥1 nguồn mới publish (đổi `seriesChecklist`, bỏ điều kiện nguồn khỏi `episodeChecklist`). Yêu cầu doc "chưa chốt phải có nguồn mới phát hành" → mặc định giữ ràng buộc ở series, xác nhận lại với team.
- Method `listSources/addSource/patchSource/deleteSource/reorderSources` + routes + repository (`prisma-content.repository.ts`) + mapper + shared schema `episode.ts` chuyển lên series.
- `Requirement`/`User flows` ghi nguồn "cho mỗi Episode" → lệch; cần báo team cập nhật doc.
- Cột `locator/excerpt` giữ trong `SeriesSource`; `origin: TagOrigin` (AI/MODERATOR) bỏ vì AI không còn tạo nguồn trong luồng này.

## PDF nguồn (đã kiểm)
- `MediaKind` chỉ AUDIO/IMAGE; `cloudinary.gateway.ts` map `resourceType(kind)` và allowlist định dạng; `media.formats.ts` chỉ có audio mime. **Không** ngầm tái dùng pipeline cũ.
- Làm: thêm `MediaKind.DOCUMENT` (PDF), `resourceType` → `raw`, allowlist `pdf`, giới hạn size, signed URL khi đọc nếu cần. Cột `Source.fileAssetId` → MediaAsset (nullable). Source có `url` HOẶC file (HOẶC cả hai).
- Việc cần thử thực tế: upload PDF raw lên Cloudinary, kiểm quyền truy cập/delivery của tài khoản.

## Dữ liệu thời kỳ cần chốt trước seed (`Thoiky-Giaidoan.md`)
- Thời kỳ 3 ghi 939–1945 (đoạn đầu) vs 939–1858 (tiêu đề); thời kỳ 4 từ 1858 → chồng nhau. Đề xuất: 939–1857 / 1858–1945.
- Mốc 43 là cuối Bắc thuộc I và đầu II. Đề xuất: lần I 179 TCN–42? hay đóng/mở tại 43; chọn một quy ước, ghi trong note.
- Sự kiện vắt qua 2 giai đoạn: chọn 1 giai đoạn chính.

## Phạm vi làm
1. DB: `HistoricalPhase` + seed; `Series.historicalPhaseId`.
2. DB: `SeriesSource`, bỏ `EpisodeSource`; `MediaKind.DOCUMENT`, `Source.fileAssetId`.
3. API: chuyển source routes lên series; publish checklist; upload PDF; endpoint list period→phase.
4. Web studio: danh sách series → chi tiết series (tiêu đề, mô tả, cover, chọn thời kỳ→giai đoạn, năm + cảnh báo mềm, nguồn, danh sách/sắp xếp tập) → chi tiết tập (tiêu đề, textarea kịch bản, upload audio) ; trang kho nguồn (CRUD + upload PDF + tìm nguồn tương tự).
5. Ngoài phạm vi: tìm kiếm theo năm, user-facing browse thời kỳ→giai đoạn, ngôi 1, ElevenLabs, AI.

## Rủi ro
- Đổi FK Series + bỏ EpisodeSource: sửa đồng loạt catalog, content, shared schema, seed, web; không shim.
- Raw PDF Cloudinary có thể bị chặn delivery theo cấu hình tài khoản.
- Dữ liệu seed thời kỳ sai/mâu thuẫn → sai điều hướng; cần duyệt bởi team.

## Câu hỏi mở
- Series publish có bắt buộc ≥1 nguồn? (mặc định có)
- Quy ước mốc giao giữa giai đoạn.
