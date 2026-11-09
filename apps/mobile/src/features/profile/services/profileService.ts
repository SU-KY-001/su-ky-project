import type { UpdateProfileInput } from "@repo/shared";
import { apiClient } from "@/lib/client";
import type { SessionUser } from "@/lib/session";

export interface AvatarFile { uri: string; name: string; type: string }
export const profileService = {
  async get(): Promise<SessionUser> {
    return (await apiClient.get<{ user: SessionUser }>("/api/me")).data.user;
  },
  async update(input: UpdateProfileInput): Promise<SessionUser> {
    return (await apiClient.patch<{ user: SessionUser }>("/api/me", input)).data.user;
  },
  async upload(file: AvatarFile): Promise<SessionUser> {
    const body = new FormData();
    // React Native accepts URI descriptors instead of browser Blobs.
    body.append("file", file as unknown as Blob);
    return (await apiClient.post<{ user: SessionUser }>("/api/me/avatar", body, { headers: { "Content-Type": "multipart/form-data" }, timeout: 60_000 })).data.user;
  },
};
