import {
  authResponseSchema,
  passwordResetResponseSchema,
  type RequestPasswordResetValues,
  type SignInValues,
  type SignUpValues,
} from "../schemas/authSchema";

const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

interface AuthFailure {
  code?: string;
  message?: string;
}

async function post(path: string, body: Record<string, unknown>): Promise<Response> {
  try {
    return await fetch(`${apiUrl}/api/auth/${path}`, {
      method: "POST",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(15000),
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("Yêu cầu mất quá nhiều thời gian. Thử lại nhé.");
    }
    if (error instanceof TypeError) {
      throw new Error("Không thể kết nối tới máy chủ. Kiểm tra mạng rồi thử lại.");
    }
    throw error;
  }
}

async function readFailure(response: Response, fallback: string): Promise<never> {
  let failure: AuthFailure = {};
  try {
    const payload: unknown = await response.json();
    if (typeof payload === "object" && payload !== null) {
      const error = "error" in payload ? payload.error : payload;
      if (typeof error === "object" && error !== null) {
        failure = {
          code: "code" in error && typeof error.code === "string" ? error.code : undefined,
          message: "message" in error && typeof error.message === "string" ? error.message : undefined,
        };
      }
    }
  } catch {
    // Use the safe message below when the server does not return JSON.
  }

  if (failure.code === "EMAIL_ALREADY_EXISTS") {
    throw new Error("Email này đã có tài khoản. Hãy đăng nhập hoặc dùng email khác.");
  }
  if (failure.code === "RESET_PASSWORD_DISABLED") {
    throw new Error("Tính năng gửi email đặt lại mật khẩu chưa được bật. Vui lòng liên hệ quản trị viên.");
  }
  if (response.status === 401) throw new Error("Email hoặc mật khẩu chưa đúng.");
  if (response.status === 429) throw new Error("Bạn đã thử quá nhiều lần. Đợi một lát rồi thử lại.");
  if (response.status === 400 && failure.message?.toLowerCase().includes("password")) {
    throw new Error("Mật khẩu cần có ít nhất 8 ký tự.");
  }
  throw new Error(fallback);
}

async function readAuthResponse(response: Response): Promise<void> {
  if (!response.ok) await readFailure(response, "Chưa thể hoàn tất yêu cầu. Thử lại nhé.");
  const payload: unknown = await response.json();
  if (!authResponseSchema.safeParse(payload).success) {
    throw new Error("Máy chủ trả về phản hồi chưa hợp lệ. Thử lại nhé.");
  }
}

export const authService = {
  async signIn(values: SignInValues): Promise<void> {
    const { rememberMe, ...credentials } = values;
    await readAuthResponse(await post("sign-in/email", { ...credentials, rememberMe }));
  },

  async signUp(values: SignUpValues): Promise<void> {
    const { confirmPassword: _confirmPassword, ...credentials } = values;
    await readAuthResponse(await post("sign-up/email", credentials));
  },

  async requestPasswordReset(values: RequestPasswordResetValues): Promise<void> {
    const response = await post("request-password-reset", {
      email: values.email,
      redirectTo: `${window.location.origin}/login`,
    });
    if (!response.ok) await readFailure(response, "Chưa thể gửi yêu cầu. Thử lại nhé.");
    const payload: unknown = await response.json();
    if (!passwordResetResponseSchema.safeParse(payload).success) {
      throw new Error("Máy chủ trả về phản hồi chưa hợp lệ. Thử lại nhé.");
    }
  },
};
