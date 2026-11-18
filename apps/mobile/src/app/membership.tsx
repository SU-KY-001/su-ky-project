import { useCallback, useEffect, useRef } from "react";
import { Spinner, YStack } from "tamagui";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useAuthStore } from "@/lib/authStore";
import { MembershipScreen } from "@/features/membership";

export default function MembershipPage(): React.JSX.Element {
  const { user, hydrated, hydrate } = useAuthStore();
  const router = useRouter();
  const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => { focused.current = false; };
  }, []));
  useEffect(() => { if (!hydrated) void hydrate(); }, [hydrated, hydrate]);
  if (!hydrated) return <YStack f={1} items="center" justify="center" bg="$paper"><Spinner color="$vermilion" accessibilityLabel="Đang tải gói Premium" /></YStack>;
  if (!user) return <Redirect href="/" />;
  const close = (): void => {
    if (!focused.current) return;
    if (router.canGoBack()) router.back(); else router.replace("/");
  };
  return (
    <MembershipScreen
      onBack={close}
      onOpenOrder={(order) => router.push({ pathname: "/membership/payment/[orderId]", params: { orderId: order.id } })}
    />
  );
}
