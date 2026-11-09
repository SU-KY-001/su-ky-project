import { useEffect, useRef, useState } from "react";
import { Image, ImageBackground, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text as NativeText, TextInput, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useQuery } from "@tanstack/react-query";
import { Text, XStack, YStack } from "tamagui";
import {
  AppCard,
  AppHeader,
  AppIcon,
  IconButton,
  PrimaryButton,
  ScreenScroll,
} from "@/shared/ui";
import { useAuthStore } from "@/lib/authStore";
import { authErrorMessage, validateAuthForm } from "../authForm";
import { formatDateVi, podcastApi, type ReleaseItem } from "../podcastApi";
import loginBackground from "../../../assets/brand/login-background-v2.png";
import brandImage from "../../../assets/brand/brand-su-ky-viet-nam.png";

export function ScheduleScreen({
  onBack,
  onPlayEpisode,
}: {
  onBack: () => void;
  onPlayEpisode: (slug: string) => void;
}): React.JSX.Element {
  const [targetDate, setTargetDate] = useState(() => new Date());

  const monthStart = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
  const monthEnd = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

  const releasesQuery = useQuery({
    queryKey: ["podcast", "releases", monthStart.toISOString(), monthEnd.toISOString()],
    queryFn: () => podcastApi.releases(monthStart, monthEnd),
  });

  const prevMonth = (): void => {
    setTargetDate((d) => new Date(d.getFullYear(), d.getMonth() - 1, 1));
  };
  const nextMonth = (): void => {
    setTargetDate((d) => new Date(d.getFullYear(), d.getMonth() + 1, 1));
  };

  const monthLabel = `Tháng ${targetDate.getMonth() + 1}, ${targetDate.getFullYear()}`;
  const releases = releasesQuery.data ?? [];

  return (
    <ScreenScroll>
      <AppHeader title="Lịch phát sóng" onBack={onBack} />
      <XStack items="center" justify="space-between">
        <IconButton icon="chevron-left" label="Tháng trước" onPress={prevMonth} />
        <Text color="$ink" fs="$3" fw="$7">{monthLabel}</Text>
        <IconButton icon="chevron-right" label="Tháng sau" onPress={nextMonth} />
      </XStack>

      {releasesQuery.isPending ? (
        <YStack py="$6" items="center"><Text color="$inkSoft" fs="$1">Đang tải lịch phát sóng…</Text></YStack>
      ) : releasesQuery.isError ? (
        <YStack py="$6" items="center" g="$2">
          <Text color="$inkSoft" fs="$1">Chưa tải được lịch phát sóng.</Text>
          <PrimaryButton label="Thử lại" secondary onPress={() => void releasesQuery.refetch()} />
        </YStack>
      ) : releases.length === 0 ? (
        <AppCard>
          <YStack p="$4" items="center" g="$1.5">
            <AppIcon name="calendar" size={32} color="#B58A3C" />
            <Text color="$ink" fs="$2" fw="$7">Chưa có lịch phát trong tháng này</Text>
            <Text color="$inkSoft" fs="$1" text="center">Vui lòng chọn tháng khác hoặc quay lại sau.</Text>
          </YStack>
        </AppCard>
      ) : (
        releases.map((item: ReleaseItem) => {
          const dateStr = formatDateVi(new Date(item.scheduledAt));
          return (
            <YStack key={item.id} g="$1">
              <Text color="$ink" fs="$2" fw="$7">{dateStr}</Text>
              <AppCard>
                <XStack p="$2" g="$2" overflow="hidden" items="center">
                  <YStack w="$4" h="$4" rounded="$4" bg="$paperDeep" items="center" justify="center">
                    <AppIcon name="headphones" size={20} color="#B8322A" />
                  </YStack>
                  <YStack f={1} minW={0} g="$0.5">
                    <Text color="$ink" fs="$1" fw="$7" numberOfLines={2}>{item.title}</Text>
                    <Text color="$inkSoft" fs={10} numberOfLines={1}>Series: {item.series.title}</Text>
                  </YStack>
                  <YStack shrink={0} items="flex-end" justify="space-between">
                    <Text color={item.released ? "#55714A" : "$inkSoft"} fs={10} fw="$7">
                      {item.released ? "Đã phát hành" : "Sắp ra mắt"}
                    </Text>
                    {item.released ? (
                      <IconButton
                        icon="play"
                        label="Nghe"
                        onPress={() => onPlayEpisode(item.episodeSlug)}
                        light
                      />
                    ) : null}
                  </YStack>
                </XStack>
              </AppCard>
            </YStack>
          );
        })
      )}
    </ScreenScroll>
  );
}

export function LoginScreen({
  onBack,
  onSuccess,
  reason,
}: {
  onBack: () => void;
  onSuccess: () => void;
  reason?: string;
}): React.JSX.Element {
  const [isRegister, setIsRegister] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<React.ElementRef<typeof ScrollView>>(null);
  const keyboardVisible = useRef(false);
  const keyboardTop = useRef(0);
  const scrollOffset = useRef(0);
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  const focusedInput = useRef<React.ElementRef<typeof TextInput> | null>(null);
  const nameInput = useRef<React.ElementRef<typeof TextInput>>(null);
  const emailInput = useRef<React.ElementRef<typeof TextInput>>(null);
  const passwordInput = useRef<React.ElementRef<typeof TextInput>>(null);
  const confirmPasswordInput = useRef<React.ElementRef<typeof TextInput>>(null);
  const insets = useSafeAreaInsets();

  const scrollToFocusedInput = (): void => {
    focusedInput.current?.measureInWindow((_x, y, _width, height) => {
      const overlap = y + height + 20 - keyboardTop.current;
      if (keyboardVisible.current && overlap > 0) {
        scrollRef.current?.scrollTo({ y: scrollOffset.current + overlap, animated: false });
      }
    });
  };

  useEffect(() => {
    const showListener = Keyboard.addListener("keyboardDidShow", (event) => {
      keyboardVisible.current = true;
      keyboardTop.current = event.endCoordinates.screenY;
      setKeyboardOpen(true);
      scrollToFocusedInput();
    });
    const hideListener = Keyboard.addListener("keyboardDidHide", () => { keyboardVisible.current = false; setKeyboardOpen(false); focusedInput.current?.blur(); focusedInput.current = null; });
    return () => { showListener.remove(); hideListener.remove(); };
  }, []);

  const { signIn, signUp } = useAuthStore();

  const handleSubmit = async (): Promise<void> => {
    setError(null);
    const validationError = validateAuthForm({ isRegister, name, email, password, confirmPassword });
    if (validationError) {
      setError(validationError);
      return;
    }
    try {
      setLoading(true);
      if (isRegister) {
        await signUp(name, email, password);
      } else {
        await signIn(email, password);
      }
      onSuccess();
    } catch (err) {
      setError(authErrorMessage(err, isRegister));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ImageBackground source={loginBackground} resizeMode="cover" style={loginStyles.background}>
      <KeyboardAvoidingView style={loginStyles.flex} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={insets.top}>
        <ScrollView ref={scrollRef} keyboardShouldPersistTaps="always" keyboardDismissMode="none" scrollEventThrottle={16} onScroll={(event) => { scrollOffset.current = event.nativeEvent.contentOffset.y; }} contentContainerStyle={{ flexGrow: 1 }} onContentSizeChange={() => { if (keyboardVisible.current) scrollToFocusedInput(); }} onLayout={() => { if (keyboardVisible.current) scrollToFocusedInput(); }}>
          <View style={[loginStyles.content, { paddingBottom: keyboardOpen ? 100 : Math.max(24, insets.bottom + 12) }]}>
            <Pressable accessibilityRole="button" accessibilityLabel="Quay lại" onPress={onBack} style={loginStyles.back}>
              <AppIcon name="chevron-left" size={24} color="#2A211A" />
            </Pressable>
            <View style={loginStyles.brandArea}>
              <Image source={brandImage} resizeMode="contain" accessibilityLabel="Sử Ký" style={{ width: 245, height: 86 }} />
              <NativeText style={loginStyles.tagline}>NGHE LẠI DÒNG CHẢY VIỆT NAM</NativeText>
            </View>
            <View style={loginStyles.form}>
              <View style={loginStyles.intro}>
                <NativeText style={loginStyles.title}>
                  {isRegister ? "Bắt đầu hành trình\ncùng Sử Ký" : "Lưu hành trình\nnghe của bạn"}
                </NativeText>
                <NativeText style={loginStyles.description}>
                  {isRegister ? "Tạo tài khoản để lưu tiến trình và tiếp tục khám phá lịch sử Việt Nam." : reason ?? "Đăng nhập để đồng bộ tiến trình, lưu tập nghe yêu thích và tiếp tục khám phá lịch sử Việt Nam."}
                </NativeText>
              </View>
        {error ? (
          <View accessibilityRole="alert" style={loginStyles.error}>
            <NativeText style={loginStyles.errorText}>{error}</NativeText>
          </View>
        ) : null}

              <View style={loginStyles.fields}>
                {isRegister ? (
                  <View style={loginStyles.field}>
                    <AppIcon name="user" size={21} color="#352D25" />
                    <TextInput style={loginStyles.input} placeholder="Tên của bạn" placeholderTextColor="#766A5D" value={name} onChangeText={setName} autoComplete="name" accessibilityLabel="Tên của bạn" ref={nameInput} onFocus={() => { focusedInput.current = nameInput.current; if (keyboardVisible.current) scrollToFocusedInput(); }} />
                  </View>
                ) : null}
                <View style={loginStyles.field}>
                  <AppIcon name="mail" size={21} color="#352D25" />
                  <TextInput style={loginStyles.input} autoCapitalize="none" autoCorrect={false} autoComplete="email" keyboardType="email-address" placeholder="Email của bạn" placeholderTextColor="#766A5D" value={email} onChangeText={setEmail} accessibilityLabel="Email của bạn" ref={emailInput} onFocus={() => { focusedInput.current = emailInput.current; if (keyboardVisible.current) scrollToFocusedInput(); }} />
                </View>
                <View style={loginStyles.field}>
                  <AppIcon name="lock" size={21} color="#352D25" />
                  <TextInput style={loginStyles.input} secureTextEntry={!showPassword} autoCapitalize="none" autoComplete={isRegister ? "new-password" : "current-password"} placeholder="Mật khẩu" placeholderTextColor="#766A5D" value={password} onChangeText={setPassword} accessibilityLabel="Mật khẩu" ref={passwordInput} onFocus={() => { focusedInput.current = passwordInput.current; if (keyboardVisible.current) scrollToFocusedInput(); }} />
                  <Pressable accessibilityRole="button" accessibilityLabel={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"} onPress={() => setShowPassword((v) => !v)} style={loginStyles.passwordToggle}>
                    <AppIcon name={showPassword ? "eye" : "eye-off"} size={20} color="#62574B" />
                  </Pressable>
                </View>
                {isRegister ? (
                  <View style={loginStyles.field}>
                    <AppIcon name="lock" size={21} color="#352D25" />
                    <TextInput style={loginStyles.input} secureTextEntry={!showConfirmPassword} autoCapitalize="none" autoComplete="new-password" placeholder="Xác nhận mật khẩu" placeholderTextColor="#766A5D" value={confirmPassword} onChangeText={setConfirmPassword} accessibilityLabel="Xác nhận mật khẩu" ref={confirmPasswordInput} onFocus={() => { focusedInput.current = confirmPasswordInput.current; if (keyboardVisible.current) scrollToFocusedInput(); }} />
                    <Pressable accessibilityRole="button" accessibilityLabel={showConfirmPassword ? "Ẩn mật khẩu xác nhận" : "Hiện mật khẩu xác nhận"} onPress={() => setShowConfirmPassword((v) => !v)} style={loginStyles.passwordToggle}>
                      <AppIcon name={showConfirmPassword ? "eye" : "eye-off"} size={20} color="#62574B" />
                    </Pressable>
                  </View>
                ) : null}
                <Pressable accessibilityRole="button" disabled={loading} onPress={() => void handleSubmit()} style={[loginStyles.submit, { opacity: loading ? 0.6 : 1 }]}>
                  <NativeText style={loginStyles.submitText}>{loading ? "Đang xử lý…" : isRegister ? "Tạo tài khoản" : "Đăng nhập"}</NativeText>
                  <AppIcon name="arrow-right" size={19} color="#FFF9EF" />
                </Pressable>
              </View>
              <Pressable accessibilityRole="button" onPress={() => { setIsRegister((v) => !v); setConfirmPassword(""); setError(null); }} style={loginStyles.switchButton}>
                <NativeText style={loginStyles.switchText}>
                  {isRegister ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
                  <NativeText style={loginStyles.switchLink}>{isRegister ? "Đăng nhập" : "Đăng ký tài khoản"}</NativeText>
                </NativeText>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ImageBackground>
  );
}

const loginStyles = StyleSheet.create({
  background: { flex: 1, backgroundColor: "#F2E5CE" },
  flex: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24 },
  back: { height: 48, width: 48, alignItems: "center", justifyContent: "center", alignSelf: "flex-start" },
  brandArea: { flexGrow: 1, minHeight: 260, alignItems: "center", paddingTop: 8 },
  tagline: { marginTop: 4, color: "#4E4034", fontSize: 9, letterSpacing: 2.4, textAlign: "center" },
  form: { width: "100%", maxWidth: 420, alignSelf: "center" },
  intro: { marginBottom: 24, alignItems: "center", paddingHorizontal: 8 },
  title: { textAlign: "center", fontSize: 30, fontWeight: "700", lineHeight: 36, color: "#1C1714" },
  description: { marginTop: 12, textAlign: "center", fontSize: 14, lineHeight: 20, color: "#51483F" },
  error: { marginBottom: 12, borderRadius: 12, borderWidth: 1, borderColor: "#9A2922", backgroundColor: "#F8E4DD", padding: 12 },
  errorText: { textAlign: "center", fontSize: 14, color: "#8B211D" },
  fields: { gap: 10 },
  field: { height: 54, flexDirection: "row", alignItems: "center", gap: 12, borderRadius: 16, borderWidth: 1, borderColor: "#CDBDA5", backgroundColor: "rgba(248,240,226,0.9)", paddingHorizontal: 16 },
  input: { height: "100%", flex: 1, padding: 0, fontSize: 15, color: "#1C1714" },
  passwordToggle: { height: 44, width: 44, alignItems: "center", justifyContent: "center", marginRight: -10 },
  submit: { height: 54, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12, borderRadius: 27, backgroundColor: "#8A1E1A" },
  submitText: { fontSize: 16, fontWeight: "700", color: "#FFF9EF" },
  switchButton: { marginTop: 16, minHeight: 44, alignItems: "center", justifyContent: "center" },
  switchText: { fontSize: 14, color: "#51483F" },
  switchLink: { fontWeight: "700", color: "#8A1E1A", textDecorationLine: "underline" },
});
