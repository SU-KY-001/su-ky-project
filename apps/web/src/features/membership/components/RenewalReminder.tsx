import { useEffect } from "react";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { notify } from "@/shared/lib/notifications";
import { useMembership } from "../hooks/useMembership";

/** One in-app reminder per paid period when fewer than 5 days remain. */
export function RenewalReminder(): null {
  const user = useCurrentUser();
  const membership = useMembership(Boolean(user.data));
  useEffect(() => {
    const data = membership.data;
    if (!data?.renewSoon || !data.expiresAt) return;
    const key = `premium.renewal.${new Date(data.expiresAt).toISOString()}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, "1");
    notify.info({ title: "Sắp hết hạn Premium", description: `Gói còn ${data.daysLeft ?? 0} ngày. Gia hạn trong mục Thành viên để không bị gián đoạn.` });
  }, [membership.data]);
  return null;
}
