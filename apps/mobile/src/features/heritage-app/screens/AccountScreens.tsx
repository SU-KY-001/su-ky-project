import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Input, Separator, Text, XStack, YStack } from "tamagui";
import {
  AppCard,
  AppHeader,
  AppIcon,
  AppImage,
  BrandMark,
  Chip,
  IconButton,
  PrimaryButton,
  ProgressBar,
  ScreenScroll,
  SectionHeader,
} from "@/shared/ui";
import { useAuthStore } from "@/lib/authStore";
import { art } from "../data";
import { formatDateVi, formatDuration, podcastApi, type ListeningHistoryEntry, type PodcastEpisode, type ReleaseItem } from "../podcastApi";

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

export function ProfileScreen({
  onLogin,
  onSchedule,
  onPlayEpisodeSlug,
}: {
  onLogin: () => void;
  onSchedule: () => void;
  onPlayEpisodeSlug: (slug: string) => void;
}): React.JSX.Element {
  const { user, signOut } = useAuthStore();

  const missionsQuery = useQuery({
    queryKey: ["me", "missions", user?.id],
    queryFn: () => podcastApi.weeklyMissions(),
    enabled: Boolean(user),
  });

  const historyQuery = useQuery({
    queryKey: ["me", "history", user?.id],
    queryFn: () => podcastApi.listeningHistory(),
    enabled: Boolean(user),
  });

  return (
    <ScreenScroll>
      <XStack pt="$1" justify="space-between" items="center">
        <Text color="$ink" fs="$5" fw="$7">Hồ sơ cá nhân</Text>
        <IconButton icon="bell" label="Thông báo" onPress={onSchedule} />
      </XStack>

      {user ? (
        <XStack items="center" g="$3">
          <AppImage source={art.haiBaTrungCard} w={64} h={64} rounded={32} resizeMode="cover" />
          <YStack f={1} minW={0}>
            <Text color="$ink" fs="$4" fw="$7" numberOfLines={1}>{user.name}</Text>
            <Text color="$inkSoft" fs="$1" numberOfLines={1}>{user.email}</Text>
          </YStack>
          <Button unstyled px="$2.5" py="$1" bg="$paperDeep" rounded="$4" onPress={() => void signOut()}>
            <Text color="$vermilion" fs={11} fw="$7">Đăng xuất</Text>
          </Button>
        </XStack>
      ) : (
        <AppCard>
          <YStack p="$3" g="$2">
            <XStack items="center" g="$2">
              <AppIcon name="user" size={24} color="#B8322A" />
              <YStack f={1}>
                <Text color="$ink" fs="$2" fw="$7">Chưa đăng nhập</Text>
                <Text color="$inkSoft" fs={10}>Đăng nhập để đồng bộ tiến trình nghe, lưu quiz và tích lũy XP.</Text>
              </YStack>
            </XStack>
            <PrimaryButton label="Đăng nhập ngay" onPress={onLogin} />
          </YStack>
        </AppCard>
      )}

      {user && missionsQuery.data ? (
        <XStack justify="space-around" py="$2" bg="$paperSoft" rounded="$5" bw="$0.25" bc="$line">
          <YStack items="center">
            <Text color="$vermilion" fs="$5" fw="$7">{missionsQuery.data.totalXp}</Text>
            <Text color="$inkSoft" fs={10}>Tổng điểm XP</Text>
          </YStack>
          <Separator vertical bc="$line" />
          <YStack items="center">
            <Text color="$bronzeDark" fs="$5" fw="$7">{missionsQuery.data.items.filter((m) => m.status === "COMPLETED").length}</Text>
            <Text color="$inkSoft" fs={10}>Nhiệm vụ xong</Text>
          </YStack>
        </XStack>
      ) : null}

      {user && missionsQuery.data && missionsQuery.data.items.length > 0 ? (
        <YStack g="$2">
          <SectionHeader title="Nhiệm vụ tuần này" />
          {missionsQuery.data.items.map((mission) => {
            const pct = Math.min(100, Math.round((mission.progressCount / mission.targetCount) * 100));
            return (
              <AppCard key={mission.id}>
                <XStack p="$2.5" items="center" g="$2">
                  <AppIcon name={mission.activityType === "PASS_QUIZ" ? "award" : "headphones"} size={20} color="#B8322A" />
                  <YStack f={1} g="$1">
                    <Text color="$ink" fs="$1" fw="$6">{mission.title}</Text>
                    <ProgressBar value={pct} />
                  </YStack>
                  <Text color="$inkSoft" fs={10}>{mission.progressCount}/{mission.targetCount}</Text>
                </XStack>
              </AppCard>
            );
          })}
        </YStack>
      ) : null}

      {user && historyQuery.data && historyQuery.data.length > 0 ? (
        <YStack g="$1.5">
          <SectionHeader title="Đã nghe gần đây" />
          {historyQuery.data.map((item: ListeningHistoryEntry) => (
            <XStack
              key={item.episodeId}
              py="$1.5"
              items="center"
              g="$2"
              onPress={() => onPlayEpisodeSlug(item.episodeSlug)}
              pressStyle={{ op: 0.75 }}
            >
              <YStack w="$4" h="$4" rounded="$3" bg="$paperDeep" items="center" justify="center">
                <AppIcon name="headphones" size={18} color="#B8322A" />
              </YStack>
              <YStack f={1} minW={0} g="$0.5">
                <Text color="$ink" fs="$1" fw="$7" numberOfLines={1}>{item.episodeTitle}</Text>
                <Text color="$inkSoft" fs={10} numberOfLines={1}>
                  {item.seriesTitle} · Đã nghe {item.percent}%
                </Text>
                <ProgressBar value={item.percent} />
              </YStack>
              <IconButton icon="play" label="Nghe tiếp" onPress={() => onPlayEpisodeSlug(item.episodeSlug)} light />
            </XStack>
          ))}
        </YStack>
      ) : null}

      <PrimaryButton label="Xem lịch phát sóng" icon="calendar" secondary onPress={onSchedule} />
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
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const { signIn, signUp } = useAuthStore();

  const handleSubmit = async (): Promise<void> => {
    setError(null);
    if (!email.trim() || !password) {
      setError("Vui lòng điền đầy đủ email và mật khẩu.");
      return;
    }
    if (isRegister && !name.trim()) {
      setError("Vui lòng nhập tên của bạn.");
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
      const msg = err instanceof Error ? err.message : "Đăng nhập không thành công";
      setError(msg.includes("401") || msg.includes("credentials") ? "Sai email hoặc mật khẩu." : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <YStack f={1} px="$3" pb="$4" justify="space-between" bg="$paper">
      <XStack justify="flex-start" pt="$1">
        <IconButton icon="chevron-left" label="Quay lại" onPress={onBack} />
      </XStack>

      <YStack items="center" g="$2.5">
        <BrandMark />
        <AppImage source={art.doiMoiHero} w={180} h={90} resizeMode="cover" rounded={10} />
        <YStack items="center" g="$1" px="$2">
          <Text color="$ink" fs="$5" lh={28} fw="$7" text="center">
            {isRegister ? "Tạo tài khoản Sử Ký" : "Lưu hành trình nghe của bạn"}
          </Text>
          <Text color="$inkSoft" fs="$1" text="center">
            {reason ?? "Đăng nhập để đồng bộ tiến trình nghe, lưu bộ câu hỏi và tiếp tục khám phá lịch sử Việt Nam."}
          </Text>
        </YStack>
      </YStack>

      <YStack g="$2">
        {error ? (
          <YStack p="$2" bg="#F6DEDA" rounded="$4" bw={1} bc="$vermilion">
            <Text color="$vermilion" fs={11} text="center">{error}</Text>
          </YStack>
        ) : null}

        {isRegister ? (
          <XStack h="$4.5" px="$3" items="center" g="$2" rounded="$5" bw="$0.25" bc="$line" bg="$paperSoft">
            <AppIcon name="user" />
            <Input
              unstyled
              f={1}
              placeholder="Tên của bạn"
              placeholderTextColor="$inkSoft"
              value={name}
              onChangeText={setName}
            />
          </XStack>
        ) : null}

        <XStack h="$4.5" px="$3" items="center" g="$2" rounded="$5" bw="$0.25" bc="$line" bg="$paperSoft">
          <AppIcon name="mail" />
          <Input
            unstyled
            f={1}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email của bạn"
            placeholderTextColor="$inkSoft"
            value={email}
            onChangeText={setEmail}
          />
        </XStack>

        <XStack h="$4.5" px="$3" items="center" g="$2" rounded="$5" bw="$0.25" bc="$line" bg="$paperSoft">
          <AppIcon name="lock" />
          <Input
            unstyled
            f={1}
            secureTextEntry={!showPassword}
            placeholder="Mật khẩu"
            placeholderTextColor="$inkSoft"
            value={password}
            onChangeText={setPassword}
          />
          <Button unstyled onPress={() => setShowPassword((v) => !v)}>
            <AppIcon name={showPassword ? "eye" : "eye-off"} />
          </Button>
        </XStack>

        <PrimaryButton
          label={loading ? "Đang xử lý…" : isRegister ? "Tạo tài khoản" : "Đăng nhập"}
          disabled={loading}
          onPress={() => void handleSubmit()}
        />

        <XStack justify="center" mt="$1">
          <Button unstyled onPress={() => { setIsRegister((v) => !v); setError(null); }}>
            <Text color="$inkSoft" fs={11}>
              {isRegister ? "Đã có tài khoản? " : "Chưa có tài khoản? "}
              <Text color="$vermilion" fw="$7">{isRegister ? "Đăng nhập" : "Đăng ký ngay"}</Text>
            </Text>
          </Button>
        </XStack>
      </YStack>
    </YStack>
  );
}
