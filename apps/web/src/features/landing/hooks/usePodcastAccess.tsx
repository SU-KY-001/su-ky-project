import { useNavigate } from "react-router";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { useConfirmationDialog } from "@/shared/hooks/useConfirmationDialog";
import { ConfirmationDialog } from "@/shared/components/common/ConfirmationDialog";
import { notify } from "@/shared/lib/notifications";

export function usePodcastAccess(purpose: "podcast" | "quiz" = "podcast") {
  const session = useCurrentUser();
  const navigate = useNavigate();
  const { requestConfirmation, confirmation } = useConfirmationDialog();
  async function requestAccess(): Promise<boolean> {
    const result = session.isPending || session.isError ? await session.refetch() : session;
    if (result.isError) {
      notify.error({ title: "Chưa kiểm tra được tài khoản", description: "Vui lòng thử lại." });
      return false;
    }
    if (result.data) return true;
    const confirmed = await requestConfirmation({ title: "Đăng nhập để tiếp tục", description: purpose === "quiz" ? "Bạn cần đăng nhập để làm quiz và lưu kết quả học tập." : "Bạn cần đăng nhập để nghe podcast và lưu tiến độ học lịch sử.", confirmLabel: "Đăng nhập", cancelLabel: "Để sau" });
    if (confirmed) navigate("/login");
    return false;
  }
  return { requestAccess, signedIn: Boolean(session.data), accessDialog: <ConfirmationDialog {...confirmation} /> };
}
