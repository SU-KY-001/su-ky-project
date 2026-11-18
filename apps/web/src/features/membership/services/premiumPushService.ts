import { PremiumPushConfigSchema, PremiumPushResultSchema, PremiumPushSubscriptionSchema, PremiumRenewalReminderSchema } from "@repo/shared";
import { apiRequest } from "@/lib/apiRequest";

const base = "/api/me/membership";
const worker = "/premium-push.js";
export const supportsPremiumPush = () => typeof window !== "undefined" && "Notification" in window && "PushManager" in window && "serviceWorker" in navigator;

async function currentSubscription() {
  if (!supportsPremiumPush()) return null;
  const registration = (await navigator.serviceWorker.getRegistrations())
    .find((item) => item.active && new URL(item.active.scriptURL).pathname === worker);
  return registration?.pushManager.getSubscription() ?? null;
}

export const premiumPushService = {
  reminder: (signal: AbortSignal) => apiRequest(`${base}/renewal-reminder`, PremiumRenewalReminderSchema.nullable(), { signal }),
  config: (signal: AbortSignal) => apiRequest(`${base}/push-config`, PremiumPushConfigSchema, { signal }),
  currentSubscription,
  async enable(publicKey: string) {
    const permission = await Notification.requestPermission();
    if (permission !== "granted") return false;
    await navigator.serviceWorker.register(worker);
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription()
      ?? await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: publicKey });
    const body = PremiumPushSubscriptionSchema.parse(subscription.toJSON());
    await apiRequest(`${base}/push-subscription`, PremiumPushResultSchema, { method: "POST", body });
    return true;
  },
  async disable() {
    const subscription = await currentSubscription();
    if (!subscription) return false;
    await apiRequest(`${base}/push-subscription`, PremiumPushResultSchema, { method: "DELETE", body: { endpoint: subscription.endpoint } });
    await subscription.unsubscribe();
    return false;
  },
};

export async function unsubscribePremiumPushOnLogout(): Promise<void> {
  const subscription = await currentSubscription();
  await subscription?.unsubscribe();
}
