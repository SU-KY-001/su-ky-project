import { useCallback, useEffect, useRef } from "react";
import { Spinner, YStack } from "tamagui";
import { Redirect, useFocusEffect, useLocalSearchParams, useRouter } from "expo-router";
import { useAuthStore } from "@/lib/authStore";
import { PaymentScreen } from "@/features/membership";

export default function PaymentPage(): React.JSX.Element {
  const { user, hydrated, hydrate } = useAuthStore();
  const router = useRouter();
  const { orderId } = useLocalSearchParams<{ orderId: string }>();
  const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => { focused.current = false; };
  }, []));
  useEffect(() => { if (!hydrated) void hydrate(); }, [hydrated, hydrate]);
  if (!hydrated) return <YStack f={1} items="center" justify="center" bg="$paper"><Spinner color="$vermilion" accessibilityLabel="Đang tải đơn thanh toán" /></YStack>;
  if (!user) return <Redirect href="/" />;
  const back = (): void => {
    if (!focused.current) return;
    if (router.canGoBack()) router.back(); else router.replace("/membership");
  };
  return (
    <PaymentScreen
      orderId={orderId}
      onBack={back}
      onDone={() => {
        if (!focused.current) return;
        if (router.canGoBack()) router.back(); else router.replace("/membership");
      }}
      onRestart={(nextOrderId) => router.replace({ pathname: "/membership/payment/[orderId]", params: { orderId: nextOrderId } })}
    />
  );
}
