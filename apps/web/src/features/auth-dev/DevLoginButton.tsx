import { CircleNotch, SignIn, UserCircle } from "@phosphor-icons/react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";
import { loginDevModerator } from "./loginDevModerator";
import { SESSION_QUERY_KEY } from "./session";
import { useSession } from "./useSession";

function DevLoginStatus({ message, isError }: { message: string; isError: boolean }) {
  return (
    <ModeratorText
      className={isError ? "max-w-[260px] text-xs font-semibold text-mod-attention" : "text-xs font-semibold text-mod-text-secondary"}
    >
      {message}
    </ModeratorText>
  );
}

export function DevLoginButton() {
  const queryClient = useQueryClient();
  const session = useSession();
  const login = useMutation({
    mutationFn: loginDevModerator,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY }),
  });

  if (!import.meta.env.DEV) return null;

  const user = session.data;
  let status = "";
  if (login.isError) status = login.error.message;
  else if (user) status = `${user.name} (${user.role ?? "chưa có vai trò"})`;

  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-end" aria-live="polite">
        {status ? <DevLoginStatus message={status} isError={login.isError} /> : null}
        <ModeratorText className="text-[11px] text-mod-text-low">Chỉ dùng khi phát triển</ModeratorText>
      </div>
      <Button
        variant="outline"
        className="min-h-11 rounded-[10px] border-mod-border bg-mod-surface px-[15px] text-mod-text-muted hover:border-mod-primary hover:bg-mod-surface-glass"
        disabled={login.isPending}
        onClick={() => login.mutate()}
      >
        {login.isPending ? (
          <CircleNotch size={16} className="animate-spin" aria-hidden={true} />
        ) : user ? (
          <UserCircle size={16} aria-hidden={true} />
        ) : (
          <SignIn size={16} aria-hidden={true} />
        )}
        {login.isPending ? "Đang đăng nhập" : user ? "Đăng nhập lại" : "Đăng nhập Mod"}
      </Button>
    </div>
  );
}
