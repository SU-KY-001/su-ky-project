import type { QueryClient } from "@tanstack/react-query";
import { currentUserQueryKey, fetchCurrentUser } from "@/shared/services/currentUserService";
import type { CurrentUser } from "@/shared/types/auth";
import { authService } from "./authService";

export async function refreshAuthenticatedUser(queryClient: QueryClient): Promise<CurrentUser> {
  await queryClient.cancelQueries({ queryKey: currentUserQueryKey });
  const user = await queryClient.fetchQuery({
    queryKey: currentUserQueryKey,
    queryFn: ({ signal }) => fetchCurrentUser(signal),
    staleTime: 0,
  });
  if (!user) throw new Error("Chưa xác nhận được phiên đăng nhập. Vui lòng thử lại.");
  await queryClient.invalidateQueries({ queryKey: ["auth", "session"] });
  return user;
}

export async function signOutSession(queryClient: QueryClient): Promise<void> {
  await authService.signOut();
  await queryClient.cancelQueries();
  queryClient.setQueryData(currentUserQueryKey, null);
  queryClient.removeQueries({
    predicate: ({ queryKey }) => queryKey.length !== currentUserQueryKey.length || queryKey.some((part, index) => part !== currentUserQueryKey[index]),
  });
}
