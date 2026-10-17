import { Books, CaretDown, CircleNotch, ClockCounterClockwise, Gear, SignOut, SquaresFour, Target, UserCircle } from "@phosphor-icons/react";
import { DropdownMenu } from "radix-ui";
import { Link } from "react-router";
import type { ReactElement } from "react";
import { Button } from "@/shared/components/ui/button";
import { APP_PATHS, getRoleHomePath } from "@/shared/constants/routes";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { useLogout } from "../hooks/useLogout";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";

export function AccountProfile({ variant = "header" }: { variant?: "header" | "moderator" | "admin" }): ReactElement | null {
  const { data: user } = useCurrentUser();
  const { logout, isPending, error } = useLogout();
  if (!user) return null;
  const homePath = getRoleHomePath(user.role);
  const roleLabel = homePath === APP_PATHS.admin ? "Admin" : homePath === APP_PATHS.moderator ? "Moderator" : "Người nghe";

  const logoutButton = (
    <Button variant="ghost" size="icon" disabled={isPending} aria-label={isPending ? "Đang đăng xuất…" : "Đăng xuất"} title="Đăng xuất" onClick={() => logout()} className="size-10 shrink-0 rounded-md text-vermilion hover:bg-vermilion/10 hover:text-vermilion-dark">
      {isPending ? <CircleNotch size={19} className="animate-spin" aria-hidden="true" /> : <SignOut size={19} aria-hidden="true" />}
      <span className="sr-only">{isPending ? "Đang đăng xuất…" : "Đăng xuất"}</span>
    </Button>
  );

  if (variant !== "header") {
    const moderator = variant === "moderator";
    return (
      <section aria-label="Hồ sơ tài khoản" className="flex flex-col gap-2">
        <div className="flex items-center gap-3 px-1">
          <span className={`grid size-10 shrink-0 place-items-center rounded-full border ${moderator ? "border-mod-border bg-mod-canvas-accent text-mod-text-secondary" : "border-line bg-paper-deep text-ink-soft"}`}>
            {user.image ? <img src={user.image} alt="" className="size-full rounded-full object-cover" /> : <UserCircle size={22} aria-hidden="true" />}
          </span>
          <div className="min-w-0 flex-1">
            <ModeratorText as="p" className={`truncate text-sm font-bold ${moderator ? "text-mod-text" : "text-ink"}`}>{user.name}</ModeratorText>
            <ModeratorText as="p" className={`text-xs ${moderator ? "text-mod-text-secondary" : "text-ink-soft"}`}>{roleLabel}</ModeratorText>
          </div>
          {logoutButton}
        </div>
        {error ? <p role="alert" className="px-3 text-xs leading-5 text-vermilion">{error}</p> : null}
      </section>
    );
  }

  return (
    <DropdownMenu.Root modal={false}>
      <DropdownMenu.Trigger asChild>
        <Button variant="outline" aria-label={`Hồ sơ của ${user.name}`} className="max-w-56 gap-2 rounded-lg border-line bg-paper-soft px-3 text-ink hover:bg-paper-deep hover:text-ink">
          {user.image ? <img src={user.image} alt="" className="size-6 rounded-full object-cover" /> : <UserCircle size={21} aria-hidden="true" />}
          <span className="truncate">{user.name}</span>
          <CaretDown size={14} aria-hidden="true" />
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" side="bottom" sideOffset={8} collisionPadding={16} className="z-[60] w-60 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-paper-soft p-1.5 text-left text-ink shadow-lg outline-none">
          <DropdownMenu.Label className="min-w-0 px-3 py-2">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-ink-soft">{user.email}</p>
          </DropdownMenu.Label>
          <DropdownMenu.Item asChild>
            <Link to={APP_PATHS.profile} className="grid min-h-10 grid-cols-[18px_1fr] items-center gap-2 rounded-md px-3 text-sm outline-none data-[highlighted]:bg-paper-deep">
              <Gear size={18} aria-hidden="true" />
              <span>Hồ sơ & mật khẩu</span>
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link to={APP_PATHS.series} className="grid min-h-10 grid-cols-[18px_1fr] items-center gap-2 rounded-md px-3 text-sm outline-none data-[highlighted]:bg-paper-deep">
              <Books size={18} aria-hidden="true" />
              <span>Thư viện Series</span>
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link to={APP_PATHS.listeningHistory} className="grid min-h-10 grid-cols-[18px_1fr] items-center gap-2 rounded-md px-3 text-sm outline-none data-[highlighted]:bg-paper-deep">
              <ClockCounterClockwise size={18} aria-hidden="true" />
              <span>Lịch sử nghe</span>
            </Link>
          </DropdownMenu.Item>
          <DropdownMenu.Item asChild>
            <Link to={APP_PATHS.weeklyMissions} className="grid min-h-10 grid-cols-[18px_1fr] items-center gap-2 rounded-md px-3 text-sm outline-none data-[highlighted]:bg-paper-deep">
              <Target size={18} aria-hidden="true" />
              <span>Nhiệm vụ tuần</span>
            </Link>
          </DropdownMenu.Item>
          {homePath !== APP_PATHS.home ? (
            <DropdownMenu.Item asChild>
              <Link to={homePath} className="grid min-h-10 grid-cols-[18px_1fr] items-center gap-2 rounded-md px-3 text-sm outline-none data-[highlighted]:bg-paper-deep"><SquaresFour size={18} aria-hidden="true" /><span>Mở bảng điều khiển</span></Link>
            </DropdownMenu.Item>
          ) : null}
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item disabled={isPending} onSelect={(event) => { event.preventDefault(); logout(); }} className="grid min-h-10 cursor-pointer grid-cols-[18px_1fr] items-center gap-2 rounded-md px-3 text-sm text-vermilion outline-none data-[highlighted]:bg-vermilion/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
            <SignOut size={18} aria-hidden="true" /><span>{isPending ? "Đang đăng xuất…" : "Đăng xuất"}</span>
          </DropdownMenu.Item>
          {error ? <p role="alert" className="px-3 py-2 text-xs leading-5 text-vermilion">{error}</p> : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
