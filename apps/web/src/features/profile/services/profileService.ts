import { z } from "zod";
import { apiUrl } from "@/lib/client";
import type { ChangePasswordValues, UpdateProfileValues } from "../schemas/profileSchema";

const statusResponseSchema = z.object({ status: z.literal(true) });
const passwordResponseSchema = z.object({
  token: z.string().nullable().optional(),
  user: z.object({ id: z.string() }).passthrough(),
});

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
      signal: AbortSignal.timeout(15_000),
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("Yêu cầu mất quá nhiều thời gian. Vui lòng thử lại.");
    }
    if (error instanceof TypeError) {
      throw new Error("Không thể kết nối tới máy chủ. Kiểm tra mạng rồi thử lại.");
    }
    throw error;
  }
}

async function throwFailure(response: Response, fallback: string): Promise<never> {
  let failure: AuthFailure = {};
  try {
    const payload: unknown = await response.json();
    if (typeof payload === "object" && payload !== null) {
      const candidate = "error" in payload ? payload.error : payload;
      if (typeof candidate === "object" && candidate !== null) {
        failure = {
          code: "code" in candidate && typeof candidate.code === "string" ? candidate.code : undefined,
          message: "message" in candidate && typeof candidate.message === "string" ? candidate.message : undefined,
        };
      }
    }
  } catch {
    // Fall through to a stable Vietnamese message.
  }
  if (response.status === 401 || failure.code === "INVALID_PASSWORD") {
    throw new Error("Mật khẩu hiện tại chưa đúng.");
  }
  if (response.status === 429) throw new Error("Bạn thao tác quá nhiều lần. Vui lòng đợi một lát.");
  throw new Error(failure.message || fallback);
}

export const profileService = {
  async update(values: UpdateProfileValues): Promise<void> {
    const response = await post("update-user", {
      name: values.name.trim(),
      image: values.image.trim() || null,
    });
    if (!response.ok) await throwFailure(response, "Chưa thể cập nhật hồ sơ.");
    const payload: unknown = await response.json();
    if (!statusResponseSchema.safeParse(payload).success) throw new Error("Máy chủ chưa xác nhận cập nhật hồ sơ.");
  },

  async changePassword(values: ChangePasswordValues): Promise<void> {
    const response = await post("change-password", {
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
      revokeOtherSessions: true,
    });
    if (!response.ok) await throwFailure(response, "Chưa thể đổi mật khẩu.");
    const payload: unknown = await response.json();
    if (!passwordResponseSchema.safeParse(payload).success) throw new Error("Máy chủ chưa xác nhận đổi mật khẩu.");
  },
};
