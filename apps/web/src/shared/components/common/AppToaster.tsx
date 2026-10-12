import { CheckCircle, CircleNotch, Info, Warning, WarningCircle, X } from "@phosphor-icons/react";
import { Button } from "../ui/button";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "../ui/toast";
import { useNotificationStore, type NotificationStatus } from "../../lib/notifications";

const statusMeta = {
  success: { label: "Thành công", icon: CheckCircle, color: "text-mod-success", border: "border-mod-success/30 border-l-mod-success" },
  error: { label: "Không thành công", icon: WarningCircle, color: "text-vermilion", border: "border-vermilion/30 border-l-vermilion" },
  warning: { label: "Cần chú ý", icon: Warning, color: "text-mod-attention", border: "border-mod-attention/30 border-l-mod-attention" },
  info: { label: "Thông tin", icon: Info, color: "text-mod-text-secondary", border: "border-mod-text-low/30 border-l-mod-text-secondary" },
  loading: { label: "Đang xử lý", icon: CircleNotch, color: "text-mod-primary", border: "border-mod-primary/30 border-l-mod-primary" },
} satisfies Record<NotificationStatus, { label: string; icon: typeof CheckCircle; color: string; border: string }>;

export function AppToaster() {
  const notifications = useNotificationStore((state) => state.notifications);
  const dismiss = useNotificationStore((state) => state.dismiss);
  return <ToastProvider label="Thông báo" swipeDirection="right">
    {notifications.map((notification) => {
      const meta = statusMeta[notification.status];
      const Icon = meta.icon;
      return <Toast key={`${notification.id}-${notification.revision}`} open duration={notification.duration} type={notification.status === "loading" ? "background" : "foreground"} onOpenChange={(open) => { if (!open) dismiss(notification.id); }} data-toast-status={notification.status} className={meta.border}>
        <Icon size={22} weight={notification.status === "loading" ? "regular" : "fill"} className={`mt-0.5 shrink-0 ${meta.color} ${notification.status === "loading" ? "animate-spin" : ""}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <p className={`mb-1 text-xs font-semibold ${meta.color}`}>{meta.label}</p>
          <ToastTitle className="break-words text-sm font-bold leading-5">{notification.title}</ToastTitle>
          {notification.description ? <ToastDescription className="mt-1.5 break-words text-sm leading-5 text-muted-foreground">{notification.description}</ToastDescription> : null}
        </div>
        <ToastClose asChild><Button variant="ghost" size="icon" className="size-8 shrink-0 text-muted-foreground" aria-label="Đóng thông báo"><X size={16} aria-hidden="true" /></Button></ToastClose>
      </Toast>;
    })}
    <ToastViewport label="Thông báo ({hotkey})" />
  </ToastProvider>;
}
