import { CircleNotch } from "@phosphor-icons/react/dist/icons/CircleNotch";
import { SignOut } from "@phosphor-icons/react/dist/icons/SignOut";
import { SquaresFour } from "@phosphor-icons/react/dist/icons/SquaresFour";
import { Crown } from "@phosphor-icons/react/dist/icons/Crown";
import { UserCircle } from "@phosphor-icons/react/dist/icons/UserCircle";
import { Avatar, DropdownMenu } from "radix-ui";
import { Link } from "react-router";
import type { ReactElement } from "react";
import { Button } from "@/shared/components/ui/button";
import { APP_PATHS, getRoleHomePath } from "@/shared/constants/routes";
import { useCurrentUser } from "@/shared/hooks/useCurrentUser";
import { useLogout } from "../hooks/useLogout";

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
    return (
      <section aria-label="Hồ sơ tài khoản" className="flex flex-col gap-2">
        <div data-account-profile-row className="flex items-center gap-3 px-1">
          <span title={`${user.name} · ${roleLabel}`} className="grid size-9 shrink-0 place-items-center rounded-full border border-mod-border bg-mod-canvas-accent text-mod-text-secondary">
            <UserCircle size={22} aria-hidden="true" />
          </span>
          <div data-account-profile-details className="min-w-0 flex-1">
            <p className="truncate font-sans text-[13px] font-semibold text-mod-text">{user.name}</p>
            <p className="mt-0.5 font-sans text-[11px] text-mod-text-secondary">{roleLabel}</p>
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
        <Button variant="ghost" size="icon" aria-label={`Hồ sơ của ${user.name}`} title={`Hồ sơ của ${user.name}`} className="group relative size-14 shrink-0 rounded-full p-0 transition-transform duration-500 ease-out hover:-translate-y-0.5 hover:bg-transparent focus-visible:ring-bronze border-0 shadow-none motion-reduce:transform-none">
          <span aria-hidden="true" className="absolute inset-0 rounded-full bg-night shadow-none transition-transform duration-700 ease-out [background:repeating-radial-gradient(circle_at_center,var(--color-night)_0px,var(--color-night)_2px,var(--color-night-soft)_3px,var(--color-night)_4px)] group-hover:rotate-45 motion-reduce:transform-none">
            <span className="absolute inset-0 rounded-full [background:conic-gradient(from_35deg,transparent_0deg,color-mix(in_srgb,var(--color-paper-soft)_12%,transparent)_45deg,transparent_90deg,transparent_180deg,color-mix(in_srgb,var(--color-paper-soft)_8%,transparent)_225deg,transparent_270deg)]" />
          </span>
          <Avatar.Root className="relative flex size-8 shrink-0 overflow-hidden rounded-full bg-paper-deep">
            <Avatar.Image src={user.image ?? undefined} alt="" className="size-full object-cover" referrerPolicy="no-referrer" />
            <Avatar.Fallback className="flex size-full items-center justify-center bg-paper-deep text-xs font-semibold text-ink" delayMs={0}>
              {user.name.trim().split(/\s+/).slice(-2).map(part => part[0]).join("").toLocaleUpperCase("vi-VN") || <UserCircle size={22} aria-hidden="true" />}
            </Avatar.Fallback>
          </Avatar.Root>
        </Button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="end" side="bottom" sideOffset={8} collisionPadding={16} className="z-[60] w-60 max-w-[calc(100vw-2rem)] rounded-lg border border-line bg-paper-soft p-1.5 text-left text-ink shadow-lg outline-none">
          <DropdownMenu.Label className="min-w-0 px-3 py-2">
            <p className="truncate text-sm font-semibold">{user.name}</p>
            <p className="truncate text-xs text-ink-soft">{user.email}</p>
          </DropdownMenu.Label>
          <DropdownMenu.Separator className="my-1 h-px bg-line" />
          <DropdownMenu.Item asChild>
            <Link to={APP_PATHS.account} className="grid min-h-10 grid-cols-[18px_1fr] items-center gap-2 rounded-md px-3 text-sm outline-none data-[highlighted]:bg-paper-deep"><UserCircle size={18} aria-hidden="true" /><span>Tài khoản</span></Link>
          </DropdownMenu.Item>
          {homePath !== APP_PATHS.home ? (
            <DropdownMenu.Item asChild>
              <Link to={homePath} className="grid min-h-10 grid-cols-[18px_1fr] items-center gap-2 rounded-md px-3 text-sm outline-none data-[highlighted]:bg-paper-deep"><SquaresFour size={18} aria-hidden="true" /><span>Mở bảng điều khiển</span></Link>
            </DropdownMenu.Item>
          ) : (
            <DropdownMenu.Item asChild>
              <Link to={APP_PATHS.membership} className="grid min-h-10 grid-cols-[18px_1fr] items-center gap-2 rounded-md px-3 text-sm outline-none data-[highlighted]:bg-paper-deep"><Crown size={18} aria-hidden="true" /><span>Gói thành viên</span></Link>
            </DropdownMenu.Item>
          )}
          <DropdownMenu.Item disabled={isPending} onSelect={(event) => { event.preventDefault(); logout(); }} className="grid min-h-10 cursor-pointer grid-cols-[18px_1fr] items-center gap-2 rounded-md px-3 text-sm text-vermilion outline-none data-[highlighted]:bg-vermilion/10 data-[disabled]:pointer-events-none data-[disabled]:opacity-50">
            <SignOut size={18} aria-hidden="true" /><span>{isPending ? "Đang đăng xuất…" : "Đăng xuất"}</span>
          </DropdownMenu.Item>
          {error ? <p role="alert" className="px-3 py-2 text-xs leading-5 text-vermilion">{error}</p> : null}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
