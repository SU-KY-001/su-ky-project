import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle";
import { CircleNotch } from "@phosphor-icons/react/dist/icons/CircleNotch";
import { Info } from "@phosphor-icons/react/dist/icons/Info";
import { Warning } from "@phosphor-icons/react/dist/icons/Warning";
import { WarningCircle } from "@phosphor-icons/react/dist/icons/WarningCircle";
import { X } from "@phosphor-icons/react/dist/icons/X";
import { useEffect, useRef, useState, type ReactElement } from "react";
import { Button } from "../ui/button";
import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "../ui/toast";
import { useNotificationStore, type AppNotification, type NotificationStatus } from "../../lib/notifications";

const statusMeta = {
  success: { icon: CheckCircle, color: "text-mod-success" },
  error: { icon: WarningCircle, color: "text-vermilion" },
  warning: { icon: Warning, color: "text-mod-attention" },
  info: { icon: Info, color: "text-focus" },
  loading: { icon: CircleNotch, color: "text-mod-primary" },
} satisfies Record<NotificationStatus, { icon: typeof CheckCircle; color: string }>;

function NotificationToast({ notification }: { notification: AppNotification }): ReactElement {
  const dismiss = useNotificationStore((state) => state.dismiss);
  const remove = useNotificationStore((state) => state.remove);
  const [paused, setPaused] = useState(false);
  const clock = useRef({ revision: -1, remaining: 0 });
  const meta = statusMeta[notification.status];
  const Icon = meta.icon;

  useEffect(() => {
    if (clock.current.revision !== notification.revision) {
      clock.current = { revision: notification.revision, remaining: notification.duration };
    }
    if (!notification.open) {
      // Keep the item mounted until its exit animation finishes, including imperative dismissals.
      const timer = window.setTimeout(() => remove(notification.id, notification.revision), 260);
      return () => window.clearTimeout(timer);
    }
    if (paused || !Number.isFinite(notification.duration)) return undefined;
    const startedAt = performance.now();
    const timer = window.setTimeout(() => dismiss(notification.id), clock.current.remaining);
    return () => {
      window.clearTimeout(timer);
      clock.current.remaining = Math.max(0, clock.current.remaining - (performance.now() - startedAt));
    };
  }, [notification.id, notification.revision, notification.duration, notification.open, paused, dismiss, remove]);

  return <Toast forceMount open={notification.open} duration={Infinity} type={notification.status === "loading" ? "background" : "foreground"} onOpenChange={(open) => { if (!open) dismiss(notification.id); }} onPause={() => setPaused(true)} onResume={() => setPaused(false)} onAnimationEnd={(event) => { if (event.target === event.currentTarget && !notification.open) remove(notification.id, notification.revision); }} data-toast-status={notification.status} aria-hidden={!notification.open || undefined}>
    <Icon size={18} weight={notification.status === "loading" ? "regular" : "fill"} className={`mt-[3px] size-[18px] shrink-0 ${meta.color} ${notification.status === "loading" ? "toast-spinner" : ""}`} aria-hidden="true" />
    <div className="min-w-0 flex-1">
      <ToastTitle className="break-words text-sm font-semibold leading-6">{notification.title}</ToastTitle>
      {notification.description ? <ToastDescription className="mt-0.5 break-words text-xs leading-5 text-muted-foreground">{notification.description}</ToastDescription> : null}
    </div>
    <ToastClose asChild><Button variant="ghost" size="icon" className="-my-0.5 -mr-1 size-7 shrink-0 text-muted-foreground" aria-label="Đóng thông báo"><X size={14} aria-hidden="true" /></Button></ToastClose>
  </Toast>;
}

export function AppToaster() {
  const notifications = useNotificationStore((state) => state.notifications);
  return <ToastProvider label="Thông báo" swipeDirection="right">
    {notifications.map((notification) => <NotificationToast key={notification.id} notification={notification} />)}
    <ToastViewport label="Thông báo ({hotkey})" />
  </ToastProvider>;
}
