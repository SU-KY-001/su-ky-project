import { KeyboardAvoidingView, Platform } from "react-native";
import { ScrollView, Spinner, Text, YStack, styled } from "tamagui";
import { AppCard, AppHeader, PrimaryButton } from "@/shared/ui";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { ProfileEditorForm } from "../components/ProfileEditorForm";
import { profileError, useProfileEditor } from "../hooks/useProfileEditor";

const KeyboardScreen = styled(KeyboardAvoidingView, { f: 1, bg: "$paper" });

export function ProfileEditor({ onClose }: { onClose: () => void }): React.JSX.Element {
  const editor = useProfileEditor(onClose);
  const insets = useSafeAreaInsets();
  const busy = editor.save.isPending || editor.picking;
  return <KeyboardScreen behavior={Platform.OS === "ios" ? "padding" : "height"} pt={insets.top} pb={insets.bottom}>
    <AppHeader title="Chỉnh sửa hồ sơ" onBack={busy ? undefined : onClose} />
    <ScrollView f={1} bg="$paper" keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
      <YStack px="$4" pt="$3" pb="$6" g="$4">
        {editor.profile.isPending ? <YStack minH="$12" items="center" justify="center" g="$3"><Spinner color="$vermilion" accessibilityLabel="Đang tải hồ sơ" /><Text ff="$body" fs="$2" color="$inkSoft">Đang tải hồ sơ…</Text></YStack> : editor.profile.isError ? <AppCard><YStack p="$4" g="$3"><Text accessibilityRole="alert" ff="$body" fs="$2" lh="$3" color="$vermilion">{profileError(editor.profile.error)}</Text><PrimaryButton secondary label="Thử lại" onPress={() => void editor.profile.refetch()} /></YStack></AppCard> : <ProfileEditorForm
          user={editor.profile.data}
          avatarUri={editor.avatar === undefined ? editor.profile.data.image ?? null : editor.avatar?.uri ?? null}
          busy={busy} saving={editor.save.isPending}
          error={editor.pickerError ?? (editor.save.error ? profileError(editor.save.error) : null)}
          onPick={() => void editor.pickAvatar()} onRemoveAvatar={() => editor.setAvatar(null)}
          onSave={(name) => editor.save.mutate(name)}
        />}
      </YStack>
    </ScrollView>
  </KeyboardScreen>;
}
