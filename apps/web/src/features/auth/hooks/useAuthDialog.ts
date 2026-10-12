import { zodResolver } from "@hookform/resolvers/zod";
import { useIsMutating, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router";
import { getPostLoginPath } from "@/shared/constants/routes";
import type { AuthLocationState } from "@/shared/types/auth";
import { requestPasswordResetSchema, signInSchema, signUpSchema, type RequestPasswordResetValues, type SignInValues, type SignUpValues } from "../schemas/authSchema";
import { authService } from "../services/authService";
import { refreshAuthenticatedUser } from "../services/sessionLifecycle";
import { notify } from "@/shared/lib/notifications";

export function useAuthDialog() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const authenticationKey = ["auth", "authenticate"] as const;
  const authenticating = useIsMutating({ mutationKey: authenticationKey }) > 0;
  const signInForm = useForm<SignInValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "", rememberMe: false }, mode: "onTouched" });
  const signUpForm = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema), defaultValues: { name: "", email: "", password: "", confirmPassword: "" }, mode: "onTouched" });
  const resetForm = useForm<RequestPasswordResetValues>({ resolver: zodResolver(requestPasswordResetSchema), defaultValues: { email: "" }, mode: "onTouched" });

  const onAuthSuccess = async (): Promise<void> => {
    const currentUser = await refreshAuthenticatedUser(queryClient);
    const redirectLocation = (location.state as AuthLocationState | null)?.from;
    const destination = getPostLoginPath(currentUser.role, redirectLocation);

    await navigate(destination, { replace: true });
    window.scrollTo(0, 0);
  };
  const signIn = useMutation({
    mutationKey: authenticationKey, mutationFn: authService.signIn, retry: false,
    onMutate: () => { notify.dismiss(); return { notificationId: notify.loading({ title: "Đang đăng nhập vào tài khoản…" }) }; },
    onSuccess: async (_result, _variables, context) => {
      await onAuthSuccess();
      notify.success({ title: "Đã đăng nhập vào tài khoản." }, context?.notificationId);
    },
    onError: (_error, _variables, context) => notify.error({ title: "Không thể hoàn tất đăng nhập.", description: "Thông tin đăng nhập chưa được xác nhận. Kiểm tra email, mật khẩu và kết nối mạng, rồi thử lại." }, context?.notificationId),
  });
  const signUp = useMutation({
    mutationKey: authenticationKey, mutationFn: authService.signUp, retry: false,
    onMutate: () => { notify.dismiss(); return { notificationId: notify.loading({ title: "Đang tạo tài khoản…" }) }; },
    onSuccess: async (_result, _variables, context) => {
      await onAuthSuccess();
      notify.success({ title: "Đã tạo tài khoản và đăng nhập." }, context?.notificationId);
    },
    onError: (_error, _variables, context) => notify.error({ title: "Không thể hoàn tất tạo tài khoản.", description: "Việc tạo tài khoản chưa được xác nhận. Kiểm tra thông tin trong form và thử lại." }, context?.notificationId),
  });
  const reset = useMutation({
    mutationFn: authService.requestPasswordReset, retry: false,
    onMutate: () => ({ notificationId: notify.loading({ title: "Đang gửi yêu cầu đặt lại mật khẩu…" }) }),
    onSuccess: (_result, _variables, context) => notify.info({ title: "Đã tiếp nhận yêu cầu đặt lại mật khẩu.", description: "Nếu email này có tài khoản và dịch vụ gửi thư đang hoạt động, bạn sẽ nhận được hướng dẫn đặt lại mật khẩu." }, context?.notificationId),
    onError: (_error, _variables, context) => notify.error({ title: "Chưa xác nhận được yêu cầu đặt lại mật khẩu.", description: "Vui lòng thử lại hoặc liên hệ quản trị viên nếu bạn chưa nhận được hướng dẫn." }, context?.notificationId),
  });
  const authPending = authenticating || signIn.isPending || signUp.isPending;

  return {
    signInForm,
    signUpForm,
    resetForm,
    signIn: (values: SignInValues): void => {
      if (!queryClient.isMutating({ mutationKey: authenticationKey })) signIn.mutate(values);
    },
    signUp: (values: SignUpValues): void => {
      if (!queryClient.isMutating({ mutationKey: authenticationKey })) signUp.mutate(values);
    },
    requestPasswordReset: reset.mutate,
    signInPending: authPending,
    signUpPending: authPending,
    resetPending: reset.isPending,
    signInError: signIn.error?.message,
    signUpError: signUp.error?.message,
    resetError: reset.error?.message,
    resetSent: reset.isSuccess,
    clearSignInError: (): void => {
      if (!queryClient.isMutating({ mutationKey: authenticationKey })) signIn.reset();
    },
    clearSignUpError: (): void => {
      if (!queryClient.isMutating({ mutationKey: authenticationKey })) signUp.reset();
    },
    clearResetError: reset.reset,
  };
}
