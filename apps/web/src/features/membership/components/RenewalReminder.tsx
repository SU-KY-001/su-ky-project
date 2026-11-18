import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { premiumPushService, supportsPremiumPush } from "../services/premiumPushService";

const reminderKey = ["membership", "reminder"] as const;
const subscriptionKey = ["membership", "push-subscription"] as const;
const date = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeZone: "Asia/Ho_Chi_Minh" });

export function RenewalReminder({ premium }: { premium: boolean }) {
  const cache = useQueryClient();
  const canSubscribe = supportsPremiumPush();
  const reminder = useQuery({
    queryKey: reminderKey,
    queryFn: ({ signal }) => premiumPushService.reminder(signal),
    enabled: premium,
    meta: { requiresAuth: true },
    refetchInterval: 60_000,
  });
  const config = useQuery({
    queryKey: ["membership", "push-config"],
    queryFn: ({ signal }) => premiumPushService.config(signal),
    enabled: canSubscribe,
    meta: { requiresAuth: true },
  });
  const subscription = useQuery({
    queryKey: subscriptionKey,
    queryFn: premiumPushService.currentSubscription,
    enabled: canSubscribe,
  });
  const push = useMutation({
    mutationFn: (publicKey: string) => subscription.data ? premiumPushService.disable() : premiumPushService.enable(publicKey),
    onSuccess: () => cache.invalidateQueries({ queryKey: subscriptionKey }),
  });
  const key = config.data?.publicKey;
  return (
    <>
      {premium && reminder.data ? (
        <section className="rounded-xl border border-line bg-paper-soft p-5" aria-label="Thông báo gia hạn">
          <h2 className="font-semibold">Premium sắp hết hạn</h2>
          <p className="mt-2 text-sm text-ink-soft">{reminder.data.planName} còn {reminder.data.daysLeft} ngày, hết hạn {date.format(reminder.data.expiresAt)}.</p>
          <Button variant="outline" asChild className="mt-3"><a href="#mua-goi">Gia hạn Premium</a></Button>
        </section>
      ) : null}
      {key ? (
        <section className="flex flex-wrap items-center gap-3" aria-label="Cài đặt nhắc gia hạn">
          <Button type="button" variant="outline" disabled={push.isPending || subscription.isPending} onClick={() => push.mutate(key)}>
            {subscription.data ? "Tắt nhắc gia hạn qua trình duyệt" : "Bật nhắc gia hạn qua trình duyệt"}
          </Button>
          {push.isError ? <p role="alert" className="text-sm text-vermilion">Không cập nhật được quyền nhận thông báo.</p> : null}
          {push.isSuccess && !push.data && typeof Notification !== "undefined" && Notification.permission === "denied" ? (
            <p className="text-sm text-ink-soft">Quyền nhận thông báo đang tắt trong trình duyệt.</p>
          ) : null}
        </section>
      ) : null}
    </>
  );
}
