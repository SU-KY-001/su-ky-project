# Brainstorm: ảnh nền đứng/ngang cho Series + upload audio Episode

## Vấn đề
- Series cần 2 ảnh nền: đứng (portrait) và ngang (landscape).
- Mod phải upload được audio cho episode.

## Hiện trạng (đã kiểm code)
- Audio: xong BE + web. `POST /api/studio/media-assets` → upload Cloudinary → `/verify` → `PUT /episodes/:id/narrations/:type/audio`. Web: `UploadedAudioPanel.tsx`. Không làm thêm.
- Series: chỉ 1 cột `coverImageAssetId` (`packages/db/prisma/schema.prisma`), relation `SeriesCover`.

## Quyết định
1. Giữ `coverImageAssetId` + response `cover` = ảnh ĐỨNG (không phá mobile/web).
2. Thêm `coverLandscapeAssetId` (nullable) + relation `SeriesCoverLandscape` + response `coverLandscape`.
3. Verify ảnh: đọc width/height từ Cloudinary, chặn sai hướng (đứng: h > w; ngang: w > h). Cần cách báo hướng mong đợi: mod gắn asset vào đúng ô, kiểm lúc attach (create/update series), không lúc verify (verify chưa biết ô nào).
4. Không làm bảng `series_images(kind)` tổng quát (YAGNI: chỉ 2 ảnh cố định).
5. Audio: không đổi.

## Phạm vi sửa
- schema.prisma + migration
- content.service.ts: mở rộng `assertCoverAssetUsable(asset, session, orientation)`; create/update nhận `coverLandscapeAssetId`
- prisma-content.repository.ts: detach ảnh ngang cũ / attach mới (giống cover)
- content.mappers.ts + Zod schema + docs paths (studio.ts) + CHANGELOG
- media: lưu width/height khi verify (cần cột trên MediaAsset nếu chưa có — kiểm tra khi plan)
- web: nhân đôi ô upload cover ở form series

## Rủi ro
- MediaAsset có thể chưa lưu width/height → thêm cột + backfill null (ảnh cũ không bị chặn).
- Ảnh cũ chỉ có 1 cover: không ép có ảnh ngang (nullable), tránh chặn publish series hiện có.

## Tiêu chí xong
- Attach ảnh sai hướng → 422.
- Thay ảnh ngang → ảnh cũ `detachedAt` set, job cleanup dọn như cover.
- Response cũ không đổi, thêm `coverLandscape`.
