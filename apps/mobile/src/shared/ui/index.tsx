import type { ComponentProps, ReactNode } from "react";
import { Image as NativeImage, type DimensionValue, type ImageResizeMode, type ImageSourcePropType } from "react-native";
import { Feather } from "@expo/vector-icons";
import { Button, Input, ScrollView, Text, XStack, YStack } from "tamagui";
import { SafeAreaView } from "react-native-safe-area-context";
import brandImage from "../../assets/brand/brand-su-ky-viet-nam.png";

export type IconName = ComponentProps<typeof Feather>["name"];
export type MainTab = "discovery" | "history" | "podcast" | "quiz" | "profile";

const colors = {
  ink: "#1C1714",
  muted: "#5B4E44",
  red: "#B8322A",
  cream: "#FAF6ED",
  bronze: "#B58A3C",
  green: "#55714A",
} as const;

interface AppImageProps {
  source: ImageSourcePropType;
  w: DimensionValue;
  h: DimensionValue;
  resizeMode?: ImageResizeMode;
  rounded?: number;
  op?: number;
  blurRadius?: number;
}

export function AppImage({ source, w, h, resizeMode = "cover", rounded = 9, op = 1, blurRadius }: AppImageProps): React.JSX.Element {
  return (
    <NativeImage
      source={source}
      resizeMode={resizeMode}
      blurRadius={blurRadius}
      style={{ width: w, height: h, borderRadius: rounded, opacity: op, flexShrink: 0 }}
    />
  );
}

export function AppIcon({ name, size = 20, color = colors.ink }: { name: IconName; size?: number; color?: string }): React.JSX.Element {
  return <Feather name={name} size={size} color={color} />;
}

export function BrandMark({ compact = false }: { compact?: boolean }): React.JSX.Element {
  return (
    <NativeImage
      accessibilityLabel="Sử Ký"
      source={brandImage}
      resizeMode="contain"
      style={{
        width: compact ? 88 : 112,
        height: compact ? 28 : 36,
        flexShrink: 0,
      }}
    />
  );
}

export function IconButton({ icon, label, onPress, filled = false, light = false }: { icon: IconName; label: string; onPress: () => void; filled?: boolean; light?: boolean }): React.JSX.Element {
  return (
    <Button unstyled circular w="$4" h="$4" items="center" justify="center" bg={filled ? "$vermilion" : light ? "$paperSoft" : "transparent"} onPress={onPress} pressStyle={{ op: 0.7, scale: 0.96 }} aria-label={label}>
      <AppIcon name={icon} size={20} color={filled ? colors.cream : colors.ink} />
    </Button>
  );
}

export function PrimaryButton({ label, onPress, icon, secondary = false, disabled = false }: { label: string; onPress: () => void; icon?: IconName; secondary?: boolean; disabled?: boolean }): React.JSX.Element {
  return (
    <Button unstyled h="$4.5" px="$3" fd="row" g="$2" items="center" justify="center" rounded="$5" bg={secondary ? "$paperSoft" : "$vermilion"} bw="$0.25" bc={secondary ? "$vermilion" : "$vermilion"} onPress={onPress} disabled={disabled} op={disabled ? 0.45 : 1} pressStyle={{ op: 0.78, scale: 0.99 }}>
      {icon ? <AppIcon name={icon} size={17} color={secondary ? colors.red : colors.cream} /> : null}
      <Text color={secondary ? "$vermilion" : "$paperSoft"} fs="$2" fw="$7">{label}</Text>
      {!icon ? <AppIcon name="arrow-right" size={16} color={secondary ? colors.red : colors.cream} /> : null}
    </Button>
  );
}

export function Chip({ label, selected = false, onPress }: { label: string; selected?: boolean; onPress: () => void }): React.JSX.Element {
  return (
    <Button unstyled h="$3.5" px="$2.5" items="center" justify="center" rounded="$8" bg={selected ? "$vermilion" : "$paperSoft"} bw="$0.25" bc={selected ? "$vermilion" : "$line"} onPress={onPress} pressStyle={{ op: 0.72 }}>
      <Text color={selected ? "$paperSoft" : "$ink"} fs="$1" fw={selected ? "$7" : "$5"}>{label}</Text>
    </Button>
  );
}

export function SearchBar({ placeholder = "Tìm kiếm sự kiện, nhân vật..." }: { placeholder?: string }): React.JSX.Element {
  return (
    <XStack h="$4" items="center" g="$2" px="$2.5" rounded="$8" bg="$paperSoft" bw="$0.25" bc="$line">
      <AppIcon name="search" size={17} color={colors.muted} />
      <Input unstyled f={1} placeholder={placeholder} placeholderTextColor="$inkSoft" color="$ink" fs="$1" />
    </XStack>
  );
}

export function AppCard({ children, onPress, dark = false, selected = false }: { children: ReactNode; onPress?: () => void; dark?: boolean; selected?: boolean }): React.JSX.Element {
  return (
    <YStack bg={dark ? "$night" : "$paperSoft"} bw="$0.25" bc={selected ? "$vermilion" : dark ? "$night" : "$line"} rounded="$5" overflow="hidden" onPress={onPress} pressStyle={onPress ? { op: 0.8 } : undefined}>
      {children}
    </YStack>
  );
}

export function ProgressBar({ value, dark = false }: { value: number; dark?: boolean }): React.JSX.Element {
  const width = `${Math.max(0, Math.min(100, value))}%` as `${number}%`;
  return <XStack h="$0.5" bg={dark ? "$inkSoft" : "$paperDeep"} rounded="$10" overflow="hidden"><YStack h="100%" w={width} bg="$vermilion" rounded="$10" /></XStack>;
}

export function SectionHeader({ title, action = "Xem tất cả", onPress }: { title: string; action?: string; onPress?: () => void }): React.JSX.Element {
  return (
    <XStack items="center" justify="space-between">
      <Text color="$ink" fs="$4" fw="$7">{title}</Text>
      {onPress ? <Button unstyled fd="row" items="center" g="$1" onPress={onPress}><Text color="$vermilion" fs="$1" fw="$6">{action}</Text><AppIcon name="chevron-right" size={14} color={colors.red} /></Button> : null}
    </XStack>
  );
}

export function AppHeader({ title, onBack, rightIcon, onRight }: { title?: string; onBack?: () => void; rightIcon?: IconName; onRight?: () => void }): React.JSX.Element {
  return (
    <XStack h="$4.5" px="$3" items="center" justify="space-between">
      <YStack w="$4">{onBack ? <IconButton icon="chevron-left" label="Quay lại" onPress={onBack} /> : null}</YStack>
      {title ? <Text color="$ink" fs="$2" fw="$7">{title}</Text> : <BrandMark compact />}
      <YStack w="$4">{rightIcon && onRight ? <IconButton icon={rightIcon} label="Tác vụ" onPress={onRight} /> : null}</YStack>
    </XStack>
  );
}

const tabItems: { tab: MainTab; icon: IconName; label: string }[] = [
  { tab: "discovery", icon: "compass", label: "Khám phá" },
  { tab: "history", icon: "book-open", label: "Lịch sử" },
  { tab: "podcast", icon: "mic", label: "Podcast" },
  { tab: "quiz", icon: "award", label: "Quiz" },
  { tab: "profile", icon: "user", label: "Tôi" },
];

export function BottomTabs({ active, onChange }: { active: MainTab; onChange: (tab: MainTab) => void }): React.JSX.Element {
  return (
    <YStack bg="$paper" px="$2" py="$1.5">
      <XStack h={58} items="center" p="$1" bg="$paperSoft" rounded="$12" bw="$0.25" bc="$line" boxShadow="0 6px 18px rgba(28, 23, 20, 0.14)">
        {tabItems.map((item) => {
          const selected = active === item.tab;
          return (
            <Button key={item.tab} unstyled f={1} h={48} mx="$0.25" rounded="$10" bg={selected ? "$vermilion" : "transparent"} items="center" justify="center" g="$0.5" onPress={() => onChange(item.tab)} pressStyle={{ op: 0.72, scale: 0.97 }}>
              <AppIcon name={item.icon} size={17} color={selected ? colors.cream : colors.muted} />
              <Text color={selected ? "$paperSoft" : "$inkSoft"} fs={8.5} fw={selected ? "$7" : "$5"}>{item.label}</Text>
            </Button>
          );
        })}
      </XStack>
    </YStack>
  );
}

export interface PlaybackState {
  isPlaying: boolean;
  position: number;
  duration: number;
  toggle: () => void;
  seekBy: (seconds: number) => void;
  seekToRatio: (ratio: number) => void;
  restart: () => void;
}

export function formatTime(totalSeconds: number): string {
  const safe = Number.isFinite(totalSeconds) && totalSeconds > 0 ? Math.floor(totalSeconds) : 0;
  const minutes = Math.floor(safe / 60);
  const seconds = safe % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

interface MiniPlayerData {
  artwork: ImageSourcePropType;
  title: string;
  subtitle: string;
  playback: PlaybackState;
  onOpen: () => void;
}

export function MiniPlayer({ artwork, title, subtitle, playback, onOpen }: MiniPlayerData): React.JSX.Element {
  const progress = playback.duration > 0 ? (playback.position / playback.duration) * 100 : 0;

  return (
    <YStack bg="$paper" px="$2" pb="$1">
      <YStack pos="relative" rounded="$6" overflow="hidden" bw="$0.25" bc="$bronzeDark" boxShadow="0 6px 18px rgba(20, 17, 15, 0.28)">
        {/* Background ảnh mờ đồng bộ thay cho nền đen phẳng */}
        <NativeImage
          source={artwork}
          style={{ position: "absolute", top: -20, left: -20, right: -20, bottom: -20, width: "120%", height: "140%" }}
          resizeMode="cover"
          blurRadius={25}
        />
        <YStack pos="absolute" t={0} l={0} r={0} b={0} bg="rgba(18, 14, 12, 0.82)" />

        <XStack h={64} items="center" px="$2" g="$2">
          <Button unstyled f={1} minW={0} fd="row" items="center" g="$2" onPress={onOpen} aria-label="Mở trình phát">
            <AppImage source={artwork} w={46} h={46} rounded={8} resizeMode="cover" />
            <YStack f={1} minW={0}>
              <Text color="$paperSoft" fs="$1" lh={18} fw="$7" numberOfLines={1}>{title}</Text>
              <Text color="$bronze" fs={11} lh={16} numberOfLines={1}>{subtitle}</Text>
            </YStack>
          </Button>
          <Button unstyled w="$4" h="$4" items="center" justify="center" onPress={() => playback.seekBy(-15)} aria-label="Lùi 15 giây"><AppIcon name="rotate-ccw" size={19} color={colors.cream} /></Button>
          <Button unstyled circular w="$4" h="$4" bg="$vermilion" items="center" justify="center" onPress={playback.toggle} aria-label={playback.isPlaying ? "Tạm dừng" : "Phát"} pressStyle={{ op: 0.8, scale: 0.96 }}>
            <AppIcon name={playback.isPlaying ? "pause" : "play"} size={20} color={colors.cream} />
          </Button>
        </XStack>
        <XStack h={3} bg="$nightSoft"><YStack w={`${Math.min(100, progress)}%` as `${number}%`} h="100%" bg="$bronze" /></XStack>
      </YStack>
    </YStack>
  );
}

export function AppShell({ children, activeTab, onTabChange, hideTabs = false, dark = false, miniPlayer }: { children: ReactNode; activeTab: MainTab; onTabChange: (tab: MainTab) => void; hideTabs?: boolean; dark?: boolean; miniPlayer?: MiniPlayerData }): React.JSX.Element {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: dark ? "#14110F" : "#F4ECDC" }}>
      <YStack f={1} bg={dark ? "$night" : "$paper"}>
        {children}
        {!hideTabs && miniPlayer ? <MiniPlayer {...miniPlayer} /> : null}
        {!hideTabs ? <BottomTabs active={activeTab} onChange={onTabChange} /> : null}
      </YStack>
    </SafeAreaView>
  );
}

export function ScreenScroll({ children, dark = false }: { children: ReactNode; dark?: boolean }): React.JSX.Element {
  return <ScrollView f={1} showsVerticalScrollIndicator={false} bg={dark ? "$night" : "$paper"}><YStack px="$3" pb="$4" g="$3">{children}</YStack></ScrollView>;
}

export function Meta({ icon, children, light = false }: { icon: IconName; children: ReactNode; light?: boolean }): React.JSX.Element {
  return <XStack items="center" g="$1"><AppIcon name={icon} size={13} color={light ? colors.cream : colors.muted} /><Text color={light ? "$paperDeep" : "$inkSoft"} fs={10}>{children}</Text></XStack>;
}
