import axios from "axios";
import { create } from "zustand";
import { apiClient } from "./client";
import { clearSession, loadSession, saveSession, type SessionUser } from "./session";

interface AuthState {
  user: SessionUser | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  hydrated: false,
  hydrate: async () => {
    const session = await loadSession().catch(() => null);
    if (!session) {
      set({ user: null, hydrated: true });
      return;
    }
    set({ user: session.user, hydrated: true });
    try {
      const { data } = await apiClient.get<{ user: SessionUser }>("/api/me");
      await saveSession(session.token, data.user);
      set({ user: data.user });
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        await clearSession();
        set({ user: null });
      }
    }
  },
  signIn: async (email, password) => {
    const response = await apiClient.post<{ token?: string; user: SessionUser }>("/api/auth/sign-in/email", {
      email: email.trim(),
      password,
    });
    const token = (response.headers["set-auth-token"] as string | undefined) ?? response.data.token;
    if (!token) throw new Error("Không nhận được phiên đăng nhập");
    const user = { id: response.data.user.id, name: response.data.user.name, email: response.data.user.email };
    await saveSession(token, user);
    set({ user });
  },
  signUp: async (name, email, password) => {
    const response = await apiClient.post<{ token?: string; user: SessionUser }>("/api/auth/sign-up/email", {
      name: name.trim(),
      email: email.trim(),
      password,
    });
    const token = (response.headers["set-auth-token"] as string | undefined) ?? response.data.token;
    if (!token) throw new Error("Không nhận được phiên đăng nhập");
    const user = { id: response.data.user.id, name: response.data.user.name, email: response.data.user.email };
    await saveSession(token, user);
    set({ user });
  },
  signOut: async () => {
    await apiClient.post("/api/auth/sign-out").catch(() => undefined);
    await clearSession();
    set({ user: null });
  },
}));

