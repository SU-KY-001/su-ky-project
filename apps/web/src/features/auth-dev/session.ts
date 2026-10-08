import { z } from "zod";
import { apiRequest } from "@/lib/apiRequest";

export const SESSION_QUERY_KEY = ["auth", "session"] as const;

export const SessionResponseSchema = z
  .object({
    user: z.object({
      name: z.string(),
      email: z.string(),
      role: z.string().nullish(),
    }),
  })
  .nullable();

export type SessionUser = { name: string; role: string | null };

export async function fetchSession(): Promise<SessionUser | null> {
  const session = await apiRequest("/api/auth/get-session", SessionResponseSchema);
  return session ? { name: session.user.name, role: session.user.role ?? null } : null;
}
