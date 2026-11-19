import axios from "axios";
import { z } from "zod";

interface AuthFormValues {
  isRegister: boolean;
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

export function validateAuthForm({ isRegister, name, email, password, confirmPassword }: AuthFormValues): string | null {
  if (!email.trim() || !password) return "Vui lòng điền đầy đủ email và mật khẩu.";
  if (isRegister && (name.trim().length < 2 || name.trim().length > 100)) return "Tên phải có từ 2 đến 100 ký tự.";
  if (!z.string().email().safeParse(email.trim()).success) return "Vui lòng nhập email hợp lệ.";
  if (isRegister && (password.length < 8 || password.length > 128)) return "Mật khẩu phải có từ 8 đến 128 ký tự.";
  if (isRegister && !confirmPassword) return "Vui lòng xác nhận mật khẩu.";
  if (isRegister && password !== confirmPassword) return "Mật khẩu xác nhận không khớp.";
  return null;
}

export function authErrorMessage(error: unknown, isRegister: boolean): string {
  if (axios.isAxiosError(error)) {
    if (!error.response) return "Không thể kết nối đến máy chủ. Vui lòng kiểm tra kết nối và thử lại.";
    const data: unknown = error.response.data;
    const code = data && typeof data === "object" && "code" in data ? data.code : undefined;
    if (code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL" || code === "USER_ALREADY_EXISTS") return "Email này đã được đăng ký. Hãy đăng nhập hoặc sử dụng email khác.";
    if (code === "INVALID_EMAIL") return "Vui lòng nhập email hợp lệ.";
    if (code === "PASSWORD_TOO_SHORT" || code === "PASSWORD_TOO_LONG") return "Mật khẩu phải có từ 8 đến 128 ký tự.";
    if (!isRegister && (error.response.status === 401 || code === "INVALID_EMAIL_OR_PASSWORD")) return "Sai email hoặc mật khẩu.";
  }
  return isRegister ? "Không thể tạo tài khoản lúc này. Vui lòng thử lại sau." : "Không thể đăng nhập lúc này. Vui lòng thử lại sau.";
}
