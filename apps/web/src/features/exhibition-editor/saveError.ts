import { ApiError } from "@/lib/apiError";

export function exhibitionSaveError(error: unknown): string {
  if (!(error instanceof ApiError)) return "Chưa lưu được triển lãm. Nội dung đang sửa vẫn được giữ, vui lòng thử lại.";
  const fields: Record<string, string> = { title: "tiêu đề", imageAssetId: "ảnh trưng bày", audioAssetId: "file âm thanh", audioMode: "chế độ âm thanh", sourceUrl: "URL nguồn", credit: "nguồn ảnh", wallId: "tường treo tranh", offset: "vị trí treo", width: "kích thước tranh", chapterId: "chương triển lãm", baseRevision: "phiên bản bản nháp" };
  const messages = error.details.map(detail => {
    const parts = detail.path.split(".");
    const index = parts.indexOf("items");
    const itemIndex = Number(parts[index + 1]);
    const prefix = index >= 0 && Number.isInteger(itemIndex) ? `Tranh ${itemIndex + 1}: ` : "";
    const field = fields[parts.at(-1) ?? ""] ?? "thông tin triển lãm";
    return `${prefix}${field} chưa được API chấp nhận`;
  });
  const placementRejected = error.details.some(detail => detail.path.includes("placement"));
  const message = error.errorCode === "VALIDATION_ERROR"
    ? `${messages.length ? [...new Set(messages)].join("; ") : "API từ chối dữ liệu triển lãm."}${placementRejected ? ". Nếu đã áp dụng vị trí hợp lệ, cần đồng bộ API với mẫu tường mới của frontend." : " Kiểm tra lại các trường trước khi lưu."}`
    : error.status === 409 ? "Bản nháp trên hệ thống đã thay đổi. Tải bản mới nhất trước khi lưu tiếp." : error.message;
  return `${message}${error.requestId ? ` Mã hỗ trợ: ${error.requestId}` : ""}`;
}
