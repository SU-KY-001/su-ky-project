import { useCallback, useEffect, useRef } from "react";
import { Spinner, YStack } from "tamagui";
import { Redirect, useFocusEffect, useRouter } from "expo-router";
import { useAuthStore } from "@/lib/authStore";
import { ProfileEditor } from "@/features/profile";

export default function ProfilePage(): React.JSX.Element {
  const { user, hydrated, hydrate } = useAuthStore();
  const router = useRouter();
  const focused = useRef(false);
  useFocusEffect(useCallback(() => {
    focused.current = true;
    return () => { focused.current = false; };
  }, []));
  useEffect(() => { if (!hydrated) void hydrate(); }, [hydrated, hydrate]);
  if (!hydrated) return <YStack f={1} items="center" justify="center" bg="$paper"><Spinner color="$vermilion" accessibilityLabel="Đang tải hồ sơ" /></YStack>;
  if (!user) return <Redirect href="/" />;
  return <ProfileEditor onClose={() => {
    if (!focused.current) return;
    if (router.canGoBack()) router.back(); else router.replace("/");
  }} />;
}
