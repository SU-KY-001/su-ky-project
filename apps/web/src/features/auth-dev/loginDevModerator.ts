import { ApiError } from "@/lib/apiError";
import { apiUrl } from "@/lib/client";

/** Dev only. The credential module is imported behind DEV so Vite drops it from production builds. */
export async function loginDevModerator(): Promise<void> {
  if (!import.meta.env.DEV) throw new Error("Đăng nhập Mod chỉ dùng khi phát triển.");

  // Dynamic on purpose: a static import would put the dev password in the production bundle.
  const { DEV_MODERATOR } = await import("@repo/shared/dev-moderator");
  const response = await fetch(`${apiUrl}/api/auth/sign-in/email`, {
    method: "POST",
    credentials: "include",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: DEV_MODERATOR.email, password: DEV_MODERATOR.password }),
  });
  if (!response.ok) throw await ApiError.fromResponse(response);
}
