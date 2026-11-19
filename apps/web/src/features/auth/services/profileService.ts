import { UserProfileSchema, type UpdateProfileInput, type DeleteProfileInput } from "@repo/shared";
import { z } from "zod";
import { apiRequest } from "@/lib/apiRequest";
import { apiUrl } from "@/lib/client";
import { ApiError } from "@/lib/apiError";

const profileResponse = z.object({ user: UserProfileSchema });
export const profileService = {
  update: (body: UpdateProfileInput) => apiRequest("/api/me", profileResponse, { method: "PATCH", body }),
  delete: (body: DeleteProfileInput) => apiRequest("/api/me", z.object({ success: z.literal(true) }), { method: "DELETE", body }),
  async uploadAvatar(file: File) {
    const body = new FormData();
    body.set("file", file);
    const response = await fetch(`${apiUrl}/api/me/avatar`, {
      method: "POST", credentials: "include", body, signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) throw await ApiError.fromResponse(response);
    return profileResponse.parse(await response.json());
  },
};
