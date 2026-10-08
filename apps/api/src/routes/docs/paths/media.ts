import { CreateMediaAssetSchema, UuidParamSchema, VerifyMediaAssetSchema } from "@repo/shared";
import { operation, type Paths } from "../operation";
import { MediaAssetSchema, MediaUploadTicketSchema } from "../schemas";

const TAG = "Studio Media";
const BASE = "/api/studio/media-assets";
const params = { pathParams: UuidParamSchema, pathParamDocs: { id: "ID media asset (UUID)" } } as const;
const NOT_FOUND = "`NOT_FOUND`: media không tồn tại hoặc không do bạn upload (Admin xem được mọi media)";
const mediaAsset = { name: "MediaAsset", schema: MediaAssetSchema } as const;

const UPLOAD_FLOW = [
  "Luồng upload gồm 3 bước:",
  "1. `POST /api/studio/media-assets` để nhận `assetId` và chữ ký upload.",
  "2. Client gửi file thẳng lên `upload.url` (Cloudinary) bằng `multipart/form-data`, kèm đủ `upload.fields`.",
  "3. `POST /api/studio/media-assets/{id}/verify` với `publicId` Cloudinary trả về; server kiểm tra rồi chuyển asset sang `READY`.",
  "",
  "Chỉ asset `READY` mới gắn được vào Series (ảnh bìa) hoặc bản kể (audio).",
].join("\n");

export const mediaPaths: Paths = {
  [BASE]: {
    post: operation({
      id: "createMediaAsset",
      tag: TAG,
      summary: "Xin chữ ký upload",
      description: `Kiểm tra loại file và dung lượng theo cấu hình hệ thống trước khi cấp chữ ký.\n\n${UPLOAD_FLOW}`,
      access: "studio",
      body: {
        name: "CreateMediaAsset",
        schema: CreateMediaAssetSchema,
        example: { kind: "AUDIO", fileName: "tap-1.mp3", sizeBytes: 12582912, mimeType: "audio/mpeg" },
      },
      ok: {
        status: 201,
        description: "Ticket upload",
        schema: { name: "MediaUploadTicket", schema: MediaUploadTicketSchema },
        location: `${BASE}/{id}`,
      },
      idempotent: true,
      rate: "media_upload",
      errors: {
        422: "`MEDIA_TYPE_NOT_ALLOWED`: loại file không được phép; `MEDIA_TOO_LARGE`: vượt dung lượng tối đa",
        503: "`MEDIA_PROVIDER_UNAVAILABLE`: Cloudinary không khả dụng (có thể thử lại)",
      },
    }),
  },
  [`${BASE}/{id}`]: {
    get: operation({
      id: "getMediaAsset",
      tag: TAG,
      summary: "Trạng thái media",
      description: "Cặp đọc lại của `POST` và `verify`: cùng kiểu `MediaAsset`. `previewUrl` chỉ có khi `status = READY`.",
      access: "studio",
      ...params,
      ok: { status: 200, description: "Media asset", schema: mediaAsset },
      errors: { 404: NOT_FOUND },
    }),
  },
  [`${BASE}/{id}/verify`]: {
    post: operation({
      id: "verifyMediaAsset",
      tag: TAG,
      summary: "Xác minh media đã upload",
      description:
        "Hỏi Cloudinary xem file đã lên chưa, kiểm tra định dạng, dung lượng và (với audio) thời lượng. File không hợp lệ bị xoá khỏi Cloudinary và asset chuyển `DELETED`. Gọi lại trên asset đã `READY` trả nguyên kết quả.",
      access: "studio",
      ...params,
      body: {
        name: "VerifyMediaAsset",
        schema: VerifyMediaAssetSchema,
        example: { publicId: "su-ky/audio/3f6b0c9e-7c1a-4b53-9e0e-2f5d8a1b4c10" },
      },
      ok: { status: 200, description: "Media `READY`", schema: mediaAsset },
      rate: "media_upload",
      errors: {
        404: NOT_FOUND,
        409: "`MEDIA_NOT_UPLOADED`: Cloudinary chưa có file (hãy hoàn tất bước 2 rồi thử lại)",
        422: "`MEDIA_INVALID`: `publicId` không khớp ticket, hoặc file sai định dạng, quá lớn hay audio không có thời lượng",
        503: "`MEDIA_PROVIDER_UNAVAILABLE`: Cloudinary không khả dụng (có thể thử lại)",
      },
    }),
  },
};
