import { ArrowLeft, Eye, EyeSlash } from "@phosphor-icons/react";
import { useState, type ReactElement, type ReactNode } from "react";
import type { UseFormRegisterReturn } from "react-hook-form";
import brandLogo from "@/public/brand-su-ky-viet-nam.png";
import { Button } from "@/shared/components/ui/button";
import { DialogDescription, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { useAuthDialog } from "../hooks/useAuthDialog";

type AuthMode = "sign-in" | "sign-up" | "reset";

function FormField({ id, label, registration, error, children }: { id: string; label: string; registration: UseFormRegisterReturn; error?: string; children?: ReactNode }): ReactElement {
  return (
    <div className="auth-field">
      <Label htmlFor={id}>{label}</Label>
      {children ?? <Input id={id} autoComplete={id.includes("email") ? "email" : "name"} type={id.includes("email") ? "email" : "text"} autoCapitalize={id.includes("email") ? "none" : undefined} placeholder={id.includes("email") ? "ban@example.com" : undefined} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...registration} />}
      {error ? <p id={`${id}-error`} className="auth-field-error" role="alert">{error}</p> : null}
    </div>
  );
}

function PasswordField({ id, label, registration, error, autoComplete }: { id: string; label: string; registration: UseFormRegisterReturn; error?: string; autoComplete: string }): ReactElement {
  const [visible, setVisible] = useState(false);
  return (
    <FormField id={id} label={label} registration={registration} error={error}>
      <div className="auth-password-wrap">
        <Input id={id} type={visible ? "text" : "password"} autoComplete={autoComplete} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} className="pr-12" {...registration} />
        <Button type="button" variant="ghost" size="icon" className="auth-password-toggle" onClick={() => setVisible((current) => !current)} aria-label={visible ? "Ẩn mật khẩu" : "Hiện mật khẩu"} aria-pressed={visible}>
          {visible ? <EyeSlash size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
        </Button>
      </div>
    </FormField>
  );
}

function MutationError({ children }: { children?: string }): ReactElement | null {
  return children ? <p className="auth-submit-error" role="alert">{children}</p> : null;
}

export function AuthDialog(): ReactElement {
  const auth = useAuthDialog();
  const [mode, setMode] = useState<AuthMode>("sign-in");

  const switchMode = (nextMode: AuthMode): void => {
    auth.clearSignInError();
    auth.clearSignUpError();
    auth.clearResetError();
    setMode(nextMode);
  };
  const openReset = (): void => {
    const email = auth.signInForm.getValues("email");
    if (email) auth.resetForm.setValue("email", email, { shouldValidate: true });
    switchMode("reset");
  };
  const titles: Record<AuthMode, string> = {
    "sign-in": "Đăng nhập",
    "sign-up": "Tạo tài khoản",
    reset: "Quên mật khẩu?",
  };
  const descriptions: Record<AuthMode, string> = {
    "sign-in": "Đăng nhập vào tài khoản Sử Ký của bạn.",
    "sign-up": "Tạo tài khoản để lưu lại hành trình nghe sử.",
    reset: "Nhập email bạn dùng để đăng ký. Nếu khôi phục qua email đã được bật, chúng tôi sẽ gửi hướng dẫn đặt lại mật khẩu.",
  };

  return (
    <div className="auth-dialog-inner">
      <DialogHeader className="auth-dialog-header">
        <img className="auth-dialog-logo" src={brandLogo} alt="Sử Ký" width="130" />
        <DialogTitle>{titles[mode]}</DialogTitle>
        <DialogDescription>{descriptions[mode]}</DialogDescription>
      </DialogHeader>

      {mode !== "reset" ? (
        <div className="auth-mode-tabs" role="tablist" aria-label="Chọn đăng nhập hoặc tạo tài khoản">
          <button type="button" role="tab" aria-selected={mode === "sign-in"} className={mode === "sign-in" ? "is-active" : ""} onClick={() => switchMode("sign-in")}>Đăng nhập</button>
          <button type="button" role="tab" aria-selected={mode === "sign-up"} className={mode === "sign-up" ? "is-active" : ""} onClick={() => switchMode("sign-up")}>Tạo tài khoản</button>
        </div>
      ) : null}

      {mode === "sign-in" ? (
        <form className="auth-form" noValidate onSubmit={auth.signInForm.handleSubmit((values) => auth.signIn(values))} aria-busy={auth.signInPending}>
          <FormField id="auth-email" label="Email" registration={auth.signInForm.register("email")} error={auth.signInForm.formState.errors.email?.message} />
          <PasswordField id="auth-password" label="Mật khẩu" registration={auth.signInForm.register("password")} error={auth.signInForm.formState.errors.password?.message} autoComplete="current-password" />
          <div className="auth-form-options">
            <label className="auth-remember"><input type="checkbox" {...auth.signInForm.register("rememberMe")} />Ghi nhớ đăng nhập</label>
            <button type="button" className="auth-text-button" onClick={openReset}>Quên mật khẩu?</button>
          </div>
          <MutationError>{auth.signInError}</MutationError>
          <Button type="submit" className="auth-submit" disabled={auth.signInPending}>{auth.signInPending ? "Đang đăng nhập…" : "Đăng nhập"}</Button>
        </form>
      ) : null}

      {mode === "sign-up" ? (
        <form className="auth-form" noValidate onSubmit={auth.signUpForm.handleSubmit((values) => auth.signUp(values))} aria-busy={auth.signUpPending}>
          <FormField id="auth-name" label="Họ và tên" registration={auth.signUpForm.register("name")} error={auth.signUpForm.formState.errors.name?.message} />
          <FormField id="auth-signup-email" label="Email" registration={auth.signUpForm.register("email")} error={auth.signUpForm.formState.errors.email?.message} />
          <PasswordField id="auth-new-password" label="Mật khẩu" registration={auth.signUpForm.register("password")} error={auth.signUpForm.formState.errors.password?.message} autoComplete="new-password" />
          <PasswordField id="auth-confirm-password" label="Nhập lại mật khẩu" registration={auth.signUpForm.register("confirmPassword")} error={auth.signUpForm.formState.errors.confirmPassword?.message} autoComplete="new-password" />
          <MutationError>{auth.signUpError}</MutationError>
          <Button type="submit" className="auth-submit" disabled={auth.signUpPending}>{auth.signUpPending ? "Đang tạo tài khoản…" : "Tạo tài khoản"}</Button>
        </form>
      ) : null}

      {mode === "reset" ? (
        <form className="auth-form" noValidate onSubmit={auth.resetForm.handleSubmit((values) => auth.requestPasswordReset(values))} aria-busy={auth.resetPending}>
          <FormField id="reset-email" label="Email" registration={auth.resetForm.register("email")} error={auth.resetForm.formState.errors.email?.message} />
          <MutationError>{auth.resetError}</MutationError>
          {auth.resetSent ? <p className="auth-reset-success" role="status">Nếu email có tài khoản, hướng dẫn khôi phục sẽ được gửi tới hộp thư của bạn.</p> : null}
          <Button type="submit" className="auth-submit" disabled={auth.resetPending}>{auth.resetPending ? "Đang gửi…" : "Gửi hướng dẫn khôi phục"}</Button>
          <button type="button" className="auth-back-button" onClick={() => switchMode("sign-in")}><ArrowLeft size={16} aria-hidden="true" />Quay lại đăng nhập</button>
        </form>
      ) : null}

    </div>
  );
}
