import { z } from "zod";
import { UserProfileSchema } from "@repo/shared";
import type { CurrentUser } from "../types/auth";

const apiUrl = (import.meta.env.VITE_API_URL || "http://localhost:3000").replace(/\/$/, "");

const currentUserResponseSchema = z.object({
  success: z.literal(true),
  data: z.object({
    user: UserProfileSchema,
    session: z.object({ expiresAt: z.string() }),
  }),
});

export const currentUserQueryKey = ["auth", "current-user"] as const;

export async function fetchCurrentUser(): Promise<CurrentUser | null> {
  let response: Response;
  try {
    response = await fetch(`${apiUrl}/api/me`, {
      credentials: "include",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(15000),
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === "TimeoutError") {
      throw new Error("Kiểm tra đăng nhập quá thời gian. Thử lại nhé.");
    }
    if (error instanceof TypeError) {
      throw new Error("Không thể kết nối tới máy chủ để kiểm tra đăng nhập.");
    }
    throw error;
  }

  if (response.status === 401) return null;
  if (!response.ok) {
    throw new Error(`Không thể kiểm tra phiên đăng nhập (mã ${response.status}).`);
  }

  const payload: unknown = await response.json();
  const parsed = currentUserResponseSchema.safeParse(payload);
  if (!parsed.success) {
    throw new Error("Máy chủ trả về thông tin phiên đăng nhập chưa hợp lệ.");
  }

  return parsed.data.data.user;
}
