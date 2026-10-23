import { create } from "zustand";

export type NotificationStatus = "success" | "error" | "warning" | "info" | "loading";
export interface NotificationMessage { title: string; description?: string }
export interface AppNotification extends NotificationMessage {
  id: string;
  revision: number;
  status: NotificationStatus;
  duration: number;
  open: boolean;
}
export const notificationDurations: Record<NotificationStatus, number> = {
  success: 4500, error: 8000, warning: 6000, info: 4500, loading: Infinity,
};
interface NotificationState {
  notifications: AppNotification[];
  publish: (status: NotificationStatus, message: NotificationMessage, id?: string) => string;
  dismiss: (id?: string) => void;
  remove: (id: string, revision: number) => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  publish: (status, message, existingId) => {
    const id = existingId ?? crypto.randomUUID();
    set((state) => {
      const previous = state.notifications.find((notification) => notification.id === id);
      const notification: AppNotification = { ...message, id, status, open: true, duration: notificationDurations[status], revision: (previous?.revision ?? 0) + 1 };
      return { notifications: (previous ? state.notifications.map((item) => item.id === id ? notification : item) : [...state.notifications, notification]).slice(-3) };
    });
    return id;
  },
  dismiss: (id) => set((state) => ({ notifications: state.notifications.map((item) => !id || item.id === id ? { ...item, open: false } : item) })),
  remove: (id, revision) => set((state) => ({ notifications: state.notifications.filter((item) => item.id !== id || item.revision !== revision || item.open) })),
}));

const publish = (status: NotificationStatus, message: NotificationMessage, id?: string): string => useNotificationStore.getState().publish(status, message, id);
export const notify = {
  success: (message: NotificationMessage, id?: string): string => publish("success", message, id),
  error: (message: NotificationMessage, id?: string): string => publish("error", message, id),
  warning: (message: NotificationMessage, id?: string): string => publish("warning", message, id),
  info: (message: NotificationMessage, id?: string): string => publish("info", message, id),
  loading: (message: NotificationMessage): string => publish("loading", message),
  dismiss: (id?: string): void => useNotificationStore.getState().dismiss(id),
};

export const dashboardDraftNotice = "Bản nháp chỉ được lưu trong phiên dashboard hiện tại; dữ liệu sẽ mất khi tải lại trang hoặc rời dashboard.";
