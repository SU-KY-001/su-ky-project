import axios from "axios";
import { create } from "zustand";
import { apiClient } from "./client";
import { clearSession, getToken, loadSession, saveSession, type SessionUser } from "./session";

interface AuthState {
  user: SessionUser | null;
  hydrated: boolean;
  hydrate: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUser: (user: SessionUser) => Promise<void>;
  clearLocalSession: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  hydrated: false,
  updateUser: async (user) => {
    const token = getToken();
    if (!token || get().user?.id !== user.id) return;
    await saveSession(token, user);
    set({ user });
  },
  clearLocalSession: async () => {
    await clearSession();
    set({ user: null });
  },
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
    const user = response.data.user;
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
    const user = response.data.user;
    await saveSession(token, user);
    set({ user });
  },
  signOut: async () => {
    await apiClient.post("/api/auth/sign-out").catch(() => undefined);
    await clearSession();
    set({ user: null });
  },
}));

