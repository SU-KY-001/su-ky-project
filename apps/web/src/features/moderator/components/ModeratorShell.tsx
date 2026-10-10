import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import {
  ArrowUpRight,
  BellSimple,
  CheckCircle,
  Copy,
  GearSix,
  List,
  MagnifyingGlass,
  Scroll,
  UsersThree,
  type Icon,
} from "@phosphor-icons/react";
import { DevLoginButton } from "@/features/auth-dev/DevLoginButton";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import { useModeratorToastStore } from "../toastStore";
import { ModeratorText } from "./ModeratorText";

const TOAST_MS = 3200;
const ERROR_TOAST_MS = 8000;
const NAV_LINK_CLASS =
  "relative flex min-h-11 items-center gap-[11px] rounded-[10px] px-3 text-sm no-underline transition-colors hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mod-primary";

export type ShellNavItem = {
  id: string;
  label: string;
  icon: Icon;
  active: boolean;
  /** Route target. Omit for in-page anchors handled by `onSelect`. */
  to?: string;
  onSelect?: () => void;
};

type ModeratorShellProps = {
  nav: ShellNavItem[];
  breadcrumb: string;
  subtitle?: string;
  /** Optional card under the navigation (the dashboard preview notice). */
  sidebarNote?: ReactNode;
  children: ReactNode;
};

function NavLink({ item, onNavigated }: { item: ShellNavItem; onNavigated: () => void }) {
  const Icon = item.icon;
  const className = `${NAV_LINK_CLASS} ${item.active ? "bg-mod-canvas-accent font-bold text-mod-text" : "font-semibold text-mod-text-secondary"}`;
  const content = (
    <>
      {item.active ? <span aria-hidden="true" className="absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-full bg-mod-primary" /> : null}
      <Icon size={18} color={item.active ? "var(--modPrimary)" : "var(--modTextSecondary)"} weight={item.active ? "fill" : "regular"} aria-hidden={true} />
      {item.label}
    </>
  );

  if (item.to) {
    return (
      <Link to={item.to} onClick={onNavigated} aria-current={item.active ? "page" : undefined} className={className}>
        {content}
      </Link>
    );
  }
  return (
    <a
      href={`#${item.id}`}
      onClick={(event) => {
        event.preventDefault();
        item.onSelect?.();
        onNavigated();
      }}
      aria-current={item.active ? "location" : undefined}
      className={className}
    >
      {content}
    </a>
  );
}

function SidebarContents({ nav, sidebarNote, onNavigated }: { nav: ShellNavItem[]; sidebarNote?: ReactNode; onNavigated: () => void }) {
  return (
    <>
      <div className="flex items-center gap-[11px] px-2 py-1">
        <span className="grid size-10 place-items-center rounded-[13px] bg-mod-primary text-white shadow-[0_7px_16px_rgba(2,132,199,.18)]"><Scroll size={20} weight="duotone" aria-hidden="true" /></span>
        <span className="flex flex-col">
          <ModeratorText className="text-base font-extrabold tracking-tight text-mod-text">Sử Ký</ModeratorText>
          <ModeratorText className="text-[10px] font-medium tracking-wide text-mod-text-secondary">KHÔNG GIAN ĐIỀU HÀNH</ModeratorText>
        </span>
      </div>

      <nav className="mt-6 flex flex-col gap-1.5" aria-label="Điều hướng moderator">
        <ModeratorText className="mb-1 px-3 text-[10px] font-bold text-mod-text-low">MENU CHÍNH</ModeratorText>
        {nav.map((item) => <NavLink key={item.id} item={item} onNavigated={onNavigated} />)}
      </nav>

      {sidebarNote}

      <div className="mt-auto flex flex-col gap-4">
        <Separator className="bg-mod-border" />
        <div className="flex items-center gap-[11px] px-1">
          <span className="grid size-[38px] place-items-center rounded-full border border-mod-border bg-mod-surface-glass"><UsersThree size={17} color="var(--modTextSecondary)" aria-hidden="true" /></span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <ModeratorText className="truncate text-sm font-bold text-mod-text">Điều hành Sử Ký</ModeratorText>
            <ModeratorText className="text-xs text-mod-text-secondary">Moderator</ModeratorText>
          </span>
        </div>
        <a href="/" className="flex min-h-10 items-center gap-2 rounded-md px-2.5 text-xs font-semibold text-mod-text-secondary no-underline hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mod-primary">
          <ArrowUpRight size={15} aria-hidden="true" /><span>Mở trang Sử Ký</span>
        </a>
      </div>
    </>
  );
}

function UtilityButton({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="outline" size="icon" className="size-10 rounded-[11px] border-mod-border bg-mod-canvas text-mod-text-secondary hover:border-mod-primary hover:bg-mod-surface-glass" onClick={onClick} aria-label={label}>
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

function ModeratorToastView() {
  const toast = useModeratorToastStore((state) => state.toast);
  const clear = useModeratorToastStore((state) => state.clear);
  const show = useModeratorToastStore((state) => state.show);

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(clear, toast.requestId ? ERROR_TOAST_MS : TOAST_MS);
    return () => window.clearTimeout(timeout);
  }, [toast, clear]);

  if (!toast) return null;
  const { requestId } = toast;

  return (
    <div className="mod-toast" role="status" aria-live="polite">
      <CheckCircle size={17} color="var(--modSuccess)" weight="fill" aria-hidden={true} />
      <div className="flex flex-1 flex-col gap-1">
        <ModeratorText className="text-xs font-semibold text-white">{toast.message}</ModeratorText>
        {requestId ? <ModeratorText className="text-[11px] text-white/80">Mã yêu cầu: {requestId}</ModeratorText> : null}
      </div>
      {requestId ? (
        <Button
          variant="ghost"
          size="icon"
          className="size-9 text-white hover:bg-white/10 hover:text-white"
          aria-label="Sao chép mã yêu cầu"
          onClick={() => {
            void navigator.clipboard.writeText(requestId).then(() => show("Đã sao chép mã yêu cầu."));
          }}
        >
          <Copy size={16} aria-hidden={true} />
        </Button>
      ) : null}
    </div>
  );
}

export function ModeratorShell({ nav, breadcrumb, subtitle = "Không gian điều hành nội dung Sử Ký", sidebarNote, children }: ModeratorShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const showToast = useModeratorToastStore((state) => state.show);
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="mod-layout-root font-moderator text-mod-text">
      <div className="mod-layout-shell">
        <aside className="mod-sidebar" aria-label="Điều hướng moderator">
          <SidebarContents nav={nav} sidebarNote={sidebarNote} onNavigated={closeDrawer} />
        </aside>

        <div className="mod-main-column">
          <header className="mod-header">
            <div className="flex min-w-0 items-center gap-[13px]">
              <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="mod-mobile-only size-[39px] rounded-[10px] border-mod-border bg-mod-canvas text-mod-text-muted" aria-label="Mở menu điều hướng">
                    <List size={18} />
                  </Button>
                </SheetTrigger>
                <SheetContent id="moderator-mobile-navigation" side="left" className="mod-dashboard-sheet w-[286px] max-w-[88vw] flex-col gap-[18px] overflow-y-auto bg-mod-surface p-[18px]">
                  <SheetHeader className="pr-8">
                    <SheetTitle className="font-moderator text-base">Menu điều hướng moderator</SheetTitle>
                  </SheetHeader>
                  <SidebarContents nav={nav} sidebarNote={sidebarNote} onNavigated={closeDrawer} />
                </SheetContent>
              </Sheet>

              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <ModeratorText className="truncate text-xs text-mod-text-secondary">Workspace</ModeratorText>
                  <ModeratorText className="text-xs text-mod-text-low">/</ModeratorText>
                  <ModeratorText className="truncate text-xs font-bold text-mod-text">{breadcrumb}</ModeratorText>
                </div>
                <ModeratorText className="mod-header-description text-xs text-mod-text-low">{subtitle}</ModeratorText>
              </div>
            </div>

            <TooltipProvider>
              <div className="flex shrink-0 items-center gap-2">
                <DevLoginButton />
                <UtilityButton label="Tìm kiếm" onClick={() => showToast("Tìm kiếm trong dashboard chưa được bật.")}><MagnifyingGlass size={17} /></UtilityButton>
                <UtilityButton label="Thông báo" onClick={() => showToast("Bạn chưa có thông báo mới.")}><BellSimple size={17} /></UtilityButton>
                <UtilityButton label="Cài đặt" onClick={() => showToast("Thiết lập moderator chưa khả dụng trong bản xem trước.")}><GearSix size={17} /></UtilityButton>
              </div>
            </TooltipProvider>
          </header>

          <main className="mod-main-content">{children}</main>
        </div>
      </div>

      <ModeratorToastView />
    </div>
  );
}
