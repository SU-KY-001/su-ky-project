import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router";
import { APP_PATHS, getRoleHomePath } from "@/shared/constants/routes";
import { currentUserQueryKey } from "@/shared/services/currentUserService";
import type { AuthLocationState, CurrentUser } from "@/shared/types/auth";
import { requestPasswordResetSchema, signInSchema, signUpSchema, type RequestPasswordResetValues, type SignInValues, type SignUpValues } from "../schemas/authSchema";
import { authService } from "../services/authService";

export function useAuthDialog() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const signInForm = useForm<SignInValues>({ resolver: zodResolver(signInSchema), defaultValues: { email: "", password: "", rememberMe: false }, mode: "onTouched" });
  const signUpForm = useForm<SignUpValues>({ resolver: zodResolver(signUpSchema), defaultValues: { name: "", email: "", password: "", confirmPassword: "" }, mode: "onTouched" });
  const resetForm = useForm<RequestPasswordResetValues>({ resolver: zodResolver(requestPasswordResetSchema), defaultValues: { email: "" }, mode: "onTouched" });

  const onAuthSuccess = async () => {
    await queryClient.invalidateQueries({ queryKey: currentUserQueryKey });
    const currentUser = queryClient.getQueryData<CurrentUser | null>(currentUserQueryKey);
    const redirectLocation = (location.state as AuthLocationState | null)?.from;
    const isSafeReturnPath = Boolean(
      redirectLocation?.pathname.startsWith("/") &&
      !redirectLocation.pathname.startsWith("//") &&
      redirectLocation.pathname !== APP_PATHS.login,
    );
    const destination = isSafeReturnPath && redirectLocation
      ? `${redirectLocation.pathname}${redirectLocation.search ?? ""}${redirectLocation.hash ?? ""}`
      : getRoleHomePath(currentUser?.role);

    await navigate(destination, { replace: true });
    window.scrollTo(0, 0);
  };
  const signIn = useMutation({ mutationFn: authService.signIn, retry: false, onSuccess: onAuthSuccess });
  const signUp = useMutation({ mutationFn: authService.signUp, retry: false, onSuccess: onAuthSuccess });
  const reset = useMutation({ mutationFn: authService.requestPasswordReset, retry: false });

  return {
    signInForm,
    signUpForm,
    resetForm,
    signIn: signIn.mutate,
    signUp: signUp.mutate,
    requestPasswordReset: reset.mutate,
    signInPending: signIn.isPending,
    signUpPending: signUp.isPending,
    resetPending: reset.isPending,
    signInError: signIn.error?.message,
    signUpError: signUp.error?.message,
    resetError: reset.error?.message,
    resetSent: reset.isSuccess,
    clearSignInError: signIn.reset,
    clearSignUpError: signUp.reset,
    clearResetError: reset.reset,
  };
}
