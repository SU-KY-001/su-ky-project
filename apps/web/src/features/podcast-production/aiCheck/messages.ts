import type { AiCheck } from "@repo/shared";
import { isApiError } from "@/lib/apiError";

export const AI_DOUBT_LABEL = "AI nghi ngờ, chưa xác minh";

/** Maps an API error of "start a check" to what the moderator should do next. */
export function describeStartError(error: unknown): string {
  if (isApiError(error) && error.is("AI_CHECK_ALREADY_RUNNING")) return "Tập này đang có một lượt rà chạy. Chờ lượt đó xong hoặc hủy nó.";
  if (isApiError(error, 422)) {
    return error.is("NO_READABLE_SOURCE")
      ? "Series chưa có nguồn đọc được để AI đối chiếu."
      : "Kịch bản hoặc phạm vi chọn vượt giới hạn. Thu hẹp phạm vi rồi chạy lại.";
  }
  if (isApiError(error, 429)) {
    return `Bạn chạy quá nhiều lượt rà.${error.retryAfterSeconds ? ` Thử lại sau ${error.retryAfterSeconds} giây.` : " Thử lại sau ít phút."}`;
  }
  if (isApiError(error, 503)) return "Trợ lý AI đang tắt hoặc chưa sẵn sàng. Báo quản trị.";
  return error instanceof Error ? error.message : "Không chạy được AI rà kịch bản.";
}

/** Why a finished check is not a clean pass; null when it succeeded or was cancelled by the user. */
export function describeCheckProblem(check: AiCheck): string | null {
  if (check.status === "FAILED") {
    if (check.errorCode === "AI_PROVIDER_AUTH" || check.errorCode === "AI_PROVIDER_QUOTA") return "Dịch vụ AI tạm không dùng được, báo quản trị.";
    if (check.errorCode === "INTERRUPTED") return "Lượt rà bị gián đoạn giữa chừng. Kết quả bên dưới chưa đầy đủ.";
    if (check.errorCode === "ALL_BLOCKS_FAILED") return "AI không rà được đoạn nào. Thử lại sau.";
    return "Lượt rà thất bại. Kết quả bên dưới (nếu có) chưa đầy đủ.";
  }
  if (check.status === "SUCCEEDED" && check.failedBlocks > 0) return `${check.failedBlocks} đoạn AI không rà được. Kết quả chưa đầy đủ.`;
  return null;
}
