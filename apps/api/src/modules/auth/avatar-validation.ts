import { DomainError } from "../../core/errors/domain-error";

export const MAX_AVATAR_BYTES = 5 * 1024 * 1024;

export function validateAvatar(bytes: Uint8Array, mimeType: string): void {
  if (!bytes.length || bytes.length > MAX_AVATAR_BYTES) throw new DomainError(422, "MEDIA_TOO_LARGE", "Ảnh phải có dung lượng từ 1 byte đến 5 MB.");
  const startsWith = (signature: number[]): boolean => signature.every((value, index) => bytes[index] === value);
  const png = startsWith([137, 80, 78, 71, 13, 10, 26, 10]);
  const jpeg = startsWith([255, 216, 255]);
  const webp = startsWith([82, 73, 70, 70]) && [87, 69, 66, 80].every((value, index) => bytes[index + 8] === value);
  if (!((mimeType === "image/png" && png) || (mimeType === "image/jpeg" && jpeg) || (mimeType === "image/webp" && webp))) {
    throw new DomainError(422, "MEDIA_TYPE_NOT_ALLOWED", "Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP hợp lệ.");
  }
}
