import { useMutation, useQuery, useQueryClient, type UseMutationResult, type UseQueryResult } from "@tanstack/react-query";
import * as ImagePicker from "expo-image-picker";
import { useRef, useState, type Dispatch, type SetStateAction } from "react";
import axios from "axios";
import { UpdateProfileSchema } from "@repo/shared";
import { useAuthStore } from "@/lib/authStore";
import type { SessionUser } from "@/lib/session";
import { profileService, type AvatarFile } from "../services/profileService";

export function profileError(error: unknown): string {
  if (axios.isAxiosError<{ message?: string }>(error)) return error.response?.data.message || "Chưa kết nối được máy chủ. Vui lòng thử lại.";
  return error instanceof Error ? error.message : "Có lỗi xảy ra. Vui lòng thử lại.";
}

interface ProfileEditorState {
  profile: UseQueryResult<SessionUser, Error>;
  avatar: AvatarFile | null | undefined;
  setAvatar: Dispatch<SetStateAction<AvatarFile | null | undefined>>;
  pickerError: string | null;
  picking: boolean;
  pickAvatar: () => Promise<void>;
  save: UseMutationResult<void, Error, string>;
}

export function useProfileEditor(onClose: () => void): ProfileEditorState {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [avatar, setAvatar] = useState<AvatarFile | null | undefined>();
  const [pickerError, setPickerError] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const pickLock = useRef(false);
  const profile = useQuery({ queryKey: ["me", "profile", user?.id], queryFn: profileService.get, enabled: Boolean(user), staleTime: 0 });
  const apply = async (next: Awaited<ReturnType<typeof profileService.get>>): Promise<void> => {
    await useAuthStore.getState().updateUser(next);
    queryClient.setQueryData(["me", "profile", next.id], next);
  };
  const save = useMutation({
    mutationFn: async (name: string): Promise<void> => {
      const input = UpdateProfileSchema.parse({ name, ...(avatar === null ? { image: null } : {}) });
      if (avatar) { await apply(await profileService.upload(avatar)); setAvatar(undefined); }
      await apply(await profileService.update(input));
    }, onSuccess: onClose,
  });
  const pickAvatar = async (): Promise<void> => {
    if (pickLock.current) return;
    pickLock.current = true; setPicking(true); setPickerError(null);
    try {
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.85 });
      if (result.canceled) return;
      const asset = result.assets[0];
      if (!asset) return;
      if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) throw new Error("Ảnh không được vượt quá 5 MB.");
      const type = asset.mimeType ?? "image/jpeg";
      if (!["image/jpeg", "image/png", "image/webp"].includes(type)) throw new Error("Vui lòng chọn ảnh JPEG, PNG hoặc WebP.");
      setAvatar({ uri: asset.uri, name: asset.fileName ?? `avatar.${type.split("/")[1]}`, type });
    } catch (error) { setPickerError(profileError(error)); }
    finally { pickLock.current = false; setPicking(false); }
  };
  return { profile, avatar, setAvatar, pickerError, picking, pickAvatar, save };
}
