export const paymentLabels: Record<string, string> = {
  pending: "Chờ thanh toán", paid: "Đã thanh toán", needs_review: "Cần đối soát", rejected: "Bị từ chối",
  unmatched: "Chưa khớp", matched: "Đã khớp", ignored: "Đã bỏ qua",
};

export const paymentReasons: Record<string, string> = {
  AMOUNT_MISMATCH: "Số tiền nhận lệch với giá đơn",
  NO_MATCHING_ORDER: "Không tìm thấy đơn khớp",
  ORDER_REJECTED: "Đơn đã bị từ chối",
  ORDER_NEEDS_REVIEW: "Đơn đang chờ đối soát",
  ORDER_ALREADY_PAID: "Đơn đã có giao dịch thanh toán",
  STACK_LIMIT_REACHED: "Vượt giới hạn cộng dồn Premium",
  OUTBOUND: "Giao dịch tiền ra",
  MANUAL_IGNORE: "Admin bỏ qua giao dịch",
};

export const paymentDate = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });
export const paymentMoney = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" });
