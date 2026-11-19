import { useMutation, useQueryClient } from "@tanstack/react-query";
import { profileService } from "../services/profileService";
import { currentUserQueryKey } from "@/shared/services/currentUserService";
import { ApiError } from "@/lib/apiError";

export function useProfileActions() {
  const cache = useQueryClient();
  const synchronize = async (result: Awaited<ReturnType<typeof profileService.update>>) => {
    await cache.cancelQueries({ queryKey: currentUserQueryKey });
    cache.setQueryData(currentUserQueryKey, result.user);
    void cache.invalidateQueries({ queryKey: currentUserQueryKey });
  };
  const revalidateSession = (error: unknown) => {
    if (error instanceof ApiError && error.status === 401) void cache.invalidateQueries({ queryKey: currentUserQueryKey });
  };
  const update = useMutation({ mutationFn: profileService.update, retry: false, onSuccess: synchronize, onError: revalidateSession });
  const avatar = useMutation({ mutationFn: profileService.uploadAvatar, retry: false, onSuccess: synchronize, onError: revalidateSession });
  return { update, avatar, busy: update.isPending || avatar.isPending };
}
