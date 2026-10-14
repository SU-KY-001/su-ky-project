import { useState, type ReactNode } from "react";
import {
  List,
  type Icon,
} from "@phosphor-icons/react";
import brandLogo from "@/public/brand-su-ky-viet-nam.png";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/components/ui/sheet";
import { ModeratorText } from "./ModeratorText";
import { AccountProfile } from "@/features/auth";

const NAV_LINK_CLASS =
  "relative flex min-h-11 items-center gap-[11px] rounded-[10px] px-3 text-sm no-underline transition-colors hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mod-primary";

export type ShellNavItem = {
  id: string;
  label: string;
  icon?: Icon;
  active: boolean;
  groupStart?: boolean;
  onSelect?: () => void;
};

type ModeratorShellProps = {
  nav: ShellNavItem[];
  breadcrumb?: string;
  subtitle?: string;
  children: ReactNode;
};

function NavLink({ item, onNavigated }: { item: ShellNavItem; onNavigated: () => void }) {
  if (item.groupStart) {
    return <ModeratorText className="mb-1 mt-4 px-3 text-[10px] font-bold tracking-[0.08em] text-mod-text-low first:mt-0">{item.label}</ModeratorText>;
  }
  const Icon = item.icon;
  const className = `${NAV_LINK_CLASS} ${item.active ? "bg-mod-canvas-accent font-bold text-mod-text" : "font-semibold text-mod-text-secondary"}`;
  const content = (
    <>
      {item.active ? <span aria-hidden="true" className="absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-full bg-mod-primary" /> : null}
      {Icon ? <Icon size={18} color={item.active ? "var(--modPrimary)" : "var(--modTextSecondary)"} weight={item.active ? "fill" : "regular"} aria-hidden={true} /> : null}
      {item.label}
    </>
  );

  return <button type="button" onClick={() => { item.onSelect?.(); onNavigated(); }} aria-current={item.active ? "page" : undefined} className={`${className} w-full text-left`}>{content}</button>;
}

function SidebarContents({ nav, onNavigated }: { nav: ShellNavItem[]; onNavigated: () => void }) {
  return (
    <>
      <div className="flex items-center gap-[11px] px-2 py-1">
        <span className="flex min-w-0 flex-col gap-1">
          <img src={brandLogo} alt="Sử Ký Việt Nam" className="h-auto w-[164px] max-w-full object-contain" />
          <ModeratorText className="pl-1 text-[9px] font-semibold tracking-[0.08em] text-mod-text-secondary">KHÔNG GIAN BIÊN TẬP</ModeratorText>
        </span>
      </div>

      <nav className="mt-6 flex flex-col gap-1" aria-label="Điều hướng moderator">
        {nav.map((item) => <NavLink key={item.id} item={item} onNavigated={onNavigated} />)}
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        <Separator className="bg-mod-border" />
        <AccountProfile variant="moderator" />
      </div>
    </>
  );
}

export function ModeratorShell({ nav, children }: ModeratorShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  return (
    <div className="mod-layout-root font-sans text-mod-text">
      <div className="mod-layout-shell">
        <aside className="mod-sidebar" aria-label="Điều hướng moderator">
          <SidebarContents nav={nav} onNavigated={closeDrawer} />
        </aside>

        <div className="mod-main-column">
          <header className="mod-header mod-mobile-header">
            <div className="flex min-w-0 items-center">
              <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="mod-mobile-only size-[39px] rounded-[10px] border-mod-border bg-mod-canvas text-mod-text-muted" aria-label="Mở menu điều hướng">
                    <List size={18} />
                  </Button>
                </SheetTrigger>
                <SheetContent id="moderator-mobile-navigation" side="left" className="mod-dashboard-sheet w-[286px] max-w-[88vw] flex-col gap-[18px] overflow-y-auto bg-mod-surface p-[18px]">
                  <SheetHeader className="pr-8">
                    <SheetTitle className="font-sans text-base">Menu điều hướng moderator</SheetTitle>
                  </SheetHeader>
                  <SidebarContents nav={nav} onNavigated={closeDrawer} />
                </SheetContent>
              </Sheet>
            </div>
          </header>

          <main className="mod-main-content">{children}</main>
        </div>
      </div>
    </div>
  );
}
