import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { APP_PATHS } from "@/shared/constants/routes";
import { signOutSession } from "../services/sessionLifecycle";
import { notify } from "@/shared/lib/notifications";

const logoutMutationKey = ["auth", "logout"] as const;

interface LogoutState {
  logout: () => void;
  isPending: boolean;
  error: string | undefined;
}

export function useLogout(): LogoutState {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const pending = useIsMutating({ mutationKey: logoutMutationKey }) > 0;
  const mutation = useMutation({
    mutationKey: logoutMutationKey,
    mutationFn: () => signOutSession(queryClient),
    retry: false,
    onMutate: () => {
      notify.dismiss();
      return { notificationId: notify.loading({ title: "Đang đăng xuất khỏi tài khoản…" }) };
    },
    onSuccess: async (_result, _variables, context) => {
      await navigate(APP_PATHS.home, { replace: true });
      notify.success({ title: "Đã đăng xuất khỏi tài khoản." }, context?.notificationId);
      window.scrollTo(0, 0);
    },
    onError: (_error, _variables, context) => {
      notify.error({ title: "Chưa xác nhận được việc đăng xuất.", description: "Ứng dụng vẫn giữ trạng thái đăng nhập. Vui lòng thử lại để xác nhận việc đăng xuất." }, context?.notificationId);
    },
  });
  return { logout: mutation.mutate, isPending: pending || mutation.isPending, error: mutation.error?.message };
}
