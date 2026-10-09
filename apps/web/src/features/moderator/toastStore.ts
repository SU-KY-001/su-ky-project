import { create } from "zustand";

export type ModeratorToast = { id: number; message: string; requestId: string | null };

type ToastState = {
  toast: ModeratorToast | null;
  show: (message: string, requestId?: string | null) => void;
  clear: () => void;
};

let nextToastId = 1;

export const useModeratorToastStore = create<ToastState>((set) => ({
  toast: null,
  show: (message, requestId = null) => set({ toast: { id: nextToastId++, message, requestId } }),
  clear: () => set({ toast: null }),
}));
