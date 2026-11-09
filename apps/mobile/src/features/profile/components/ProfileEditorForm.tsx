import { useState } from "react";
import { Button, Input, Spinner, Text, XStack, YStack, getTokens } from "tamagui";
import { UpdateProfileSchema } from "@repo/shared";
import type { SessionUser } from "@/lib/session";
import { AppCard, AppIcon, AppImage, PrimaryButton } from "@/shared/ui";

interface ProfileEditorFormProps {
  user: SessionUser; avatarUri: string | null; busy: boolean; error: string | null;
  saving: boolean;
  onPick: () => void; onRemoveAvatar: () => void;
  onSave: (name: string) => void;
}

export function ProfileEditorForm({ user, avatarUri, busy, error, saving, onPick, onRemoveAvatar, onSave }: ProfileEditorFormProps): React.JSX.Element {
  const [name, setName] = useState(user.name);
  const [fieldError, setFieldError] = useState<string | null>(null);
  const tokens = getTokens();
  return <YStack g="$5">
    <YStack items="center" g="$2.5" py="$3">
      <YStack pos="relative" w="$9" h="$9" mb="$2">
        <YStack w="$9" h="$9" rounded="$12" overflow="hidden" bg="$paperDeep" bw="$0.5" bc="$bronze" items="center" justify="center">
          {avatarUri ? <AppImage source={{ uri: avatarUri }} w={tokens.size["$9"].val} h={tokens.size["$9"].val} rounded={tokens.radius["12"].val} /> : <Text ff="$heading" fs="$5" fw="$7" color="$vermilionDark">{user.name.trim().slice(0, 1).toUpperCase()}</Text>}
        </YStack>
        <Button unstyled circular pos="absolute" b={0} r={0} w="$4" h="$4" bg="$vermilion" bw="$0.5" bc="$paper" items="center" justify="center" disabled={busy} op={busy ? 0.45 : 1} onPress={onPick} accessibilityRole="button" accessibilityLabel="Thay ảnh đại diện" pressStyle={{ op: 0.75 }}>
          <AppIcon name="edit-2" size={18} color={tokens.color.paperSoft.val} />
        </Button>
      </YStack>
      <Text ff="$heading" fs="$4" lh="$4" fw="$7" color="$ink" text="center">{user.name}</Text>
      <Text ff="$body" fs="$2" lh="$2" color="$inkSoft" text="center">{user.email}</Text>
      {avatarUri ? <Button unstyled minH="$4" px="$4" items="center" justify="center" disabled={busy} op={busy ? 0.45 : 1} onPress={onRemoveAvatar} accessibilityRole="button"><Text ff="$body" fs="$2" color="$inkSoft">Gỡ ảnh</Text></Button> : null}
    </YStack>
    <AppCard>
      <YStack p="$4" g="$3">
        <Text ff="$heading" fs="$2" fw="$6" color="$ink">Tên hiển thị</Text>
        <Input accessibilityLabel="Tên hiển thị" value={name} onChangeText={(value) => { setName(value); setFieldError(null); }} disabled={busy} maxLength={100} autoComplete="name" minH="$5" px="$3" py="$2.5" rounded="$5" bw="$0.25" bc={fieldError ? "$vermilion" : "$line"} bg="$paperSoft" color="$ink" ff="$body" fs="$3" focusStyle={{ bc: "$vermilion" }} />
        {fieldError ? <Text accessibilityRole="alert" ff="$body" fs="$2" lh="$2" color="$vermilion">{fieldError}</Text> : null}
      </YStack>
    </AppCard>
    {error ? <Text accessibilityRole="alert" ff="$body" fs="$2" lh="$2" color="$vermilion">{error}</Text> : null}
    <YStack g="$2">
      {saving ? <XStack items="center" justify="center" g="$2"><Spinner color="$vermilion" /><Text ff="$body" fs="$1" color="$inkSoft">Đang lưu thay đổi…</Text></XStack> : null}
      <PrimaryButton label={saving ? "Đang lưu hồ sơ…" : "Lưu hồ sơ"} disabled={busy} onPress={() => {
        const result = UpdateProfileSchema.safeParse({ name });
        if (!result.success) { setFieldError(result.error.issues[0]?.message ?? "Tên không hợp lệ."); return; }
        onSave(result.data.name!);
      }} />
    </YStack>
  </YStack>;
}
