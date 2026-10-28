import { useId, useLayoutEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { List } from "@phosphor-icons/react/dist/icons/List";
import { SidebarSimple } from "@phosphor-icons/react/dist/icons/SidebarSimple";
import type { Icon } from "@phosphor-icons/react";
import brandLogo from "@/public/brand-su-ky-viet-nam.png";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { cn } from "@/lib/utils";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";

const NAV_LINK_CLASS =
  "relative flex min-h-11 items-center gap-[11px] rounded-[10px] px-3 text-sm no-underline transition-colors hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mod-primary";

export interface WorkspaceNavItem {
  id: string;
  label: string;
  icon?: Icon;
  active: boolean;
  groupStart?: boolean;
  to?: string;
  onSelect?: () => void;
}

export interface WorkspaceShellProps {
  navigationLabel: string;
  mobileNavigationTitle: string;
  brandCaption: string;
  nav: WorkspaceNavItem[];
  profile: ReactNode;
  children: ReactNode;
}

function WorkspaceNavLink({
  item,
  onNavigated,
  collapsed = false,
}: {
  item: WorkspaceNavItem;
  onNavigated: () => void;
  collapsed?: boolean;
}) {
  if (item.groupStart) {
    if (collapsed) return <div role="separator" aria-label={item.label} className="mx-3 my-2 border-t border-mod-border" />;
    return (
      <p className="mb-1 mt-4 px-3 text-[10px] font-bold tracking-[0.08em] text-mod-text-low first:mt-0">
        {item.label}
      </p>
    );
  }
  const IconComponent = item.icon;
  const className = cn(NAV_LINK_CLASS, collapsed && "justify-center gap-0 px-0", 
    item.active
      ? "bg-mod-canvas-accent font-bold text-mod-text"
      : "font-semibold text-mod-text-secondary"
  );
  const content = (
    <>
      {item.active ? (
        <span
          aria-hidden="true"
          className="absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-full bg-mod-primary"
        />
      ) : null}
      {IconComponent ? (
        <IconComponent
          size={18}
          color={item.active ? "var(--modPrimary)" : "var(--modTextSecondary)"}
          weight={item.active ? "fill" : "regular"}
          aria-hidden="true"
        />
      ) : null}
      <span className={collapsed ? "sr-only" : undefined}>{item.label}</span>
    </>
  );
  if (item.to)
    return (
      <Link
        to={item.to}
        onClick={onNavigated}
        aria-current={item.active ? "page" : undefined}
        className={className}
        aria-label={item.label}
        title={collapsed ? item.label : undefined}
      >
        {content}
      </Link>
    );
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
      aria-label={item.label}
      title={collapsed ? item.label : undefined}
    >
      {content}
    </a>
  );
}

function WorkspaceSidebar({
  navigationLabel,
  brandCaption,
  nav,
  profile,
  onNavigated,
  collapsed = false,
  toggle,
}: Omit<WorkspaceShellProps, "children" | "mobileNavigationTitle"> & {
  onNavigated: () => void;
  collapsed?: boolean;
  toggle?: ReactNode;
}) {
  return (
    <>
      <div className={cn("mod-sidebar-brand", collapsed && "is-compact")}>
        <span className="flex min-w-0 flex-col gap-1">
          <img
            src={brandLogo}
            alt="Sử Ký Việt Nam"
            className={cn("h-auto max-w-full object-contain", collapsed ? "w-12" : "w-[150px]")}
          />
          <span className={cn("pl-1 text-[9px] font-semibold tracking-[0.08em] text-mod-text-secondary", collapsed && "sr-only")}>
            {brandCaption}
          </span>
        </span>
        {toggle}
      </div>
      <nav className="mt-6 flex flex-col gap-1" aria-label={navigationLabel}>
        {nav.map((item) => (
          <WorkspaceNavLink key={item.id} item={item} onNavigated={onNavigated} collapsed={collapsed} />
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-4">
        <Separator className="bg-mod-border" />
        {profile}
      </div>
    </>
  );
}

export function WorkspaceShell(props: WorkspaceShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const sidebarId = useId();
  const closeDrawer = () => setDrawerOpen(false);

  useLayoutEffect(() => {
    const className = "workspace-scroll-lock";
    document.documentElement.classList.add(className);
    document.body.classList.add(className);
    window.scrollTo(0, 0);

    return () => {
      document.documentElement.classList.remove(className);
      document.body.classList.remove(className);
    };
  }, []);

  const sidebarProps = {
    navigationLabel: props.navigationLabel,
    brandCaption: props.brandCaption,
    nav: props.nav,
    profile: props.profile,
    onNavigated: closeDrawer,
  };

  return (
    <div className="mod-layout-root font-sans text-mod-text">
      <div className="mod-layout-shell" data-sidebar-collapsed={sidebarCollapsed}>
        <aside id={sidebarId} className="mod-sidebar" aria-label={props.navigationLabel}>
          <WorkspaceSidebar {...sidebarProps} collapsed={sidebarCollapsed} toggle={
            <Button variant="ghost" size="icon" className="mod-sidebar-toggle shrink-0 text-mod-text-secondary"
              aria-label={sidebarCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
              title={sidebarCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
              aria-expanded={!sidebarCollapsed} aria-controls={sidebarId}
              onClick={() => setSidebarCollapsed(collapsed => !collapsed)}>
              <SidebarSimple size={19} aria-hidden="true" />
            </Button>
          } />
        </aside>
        <div className="mod-main-column">
          <header className="mod-header mod-mobile-header">
            <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
              <SheetTrigger asChild>
                <Button
                  variant="outline"
                  size="icon"
                  className="mod-mobile-only size-[39px] rounded-[10px] border-mod-border bg-mod-canvas text-mod-text-muted"
                  aria-label="Mở menu điều hướng"
                >
                  <List size={18} />
                </Button>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="mod-dashboard-sheet w-[286px] max-w-[88vw] flex-col gap-[18px] overflow-y-auto bg-mod-surface p-[18px]"
              >
                <SheetHeader className="pr-8">
                  <SheetTitle className="font-sans text-base">
                    {props.mobileNavigationTitle}
                  </SheetTitle>
                </SheetHeader>
                <WorkspaceSidebar {...sidebarProps} />
              </SheetContent>
            </Sheet>
          </header>
          <main className="mod-main-content">{props.children}</main>
        </div>
      </div>
    </div>
  );
}
