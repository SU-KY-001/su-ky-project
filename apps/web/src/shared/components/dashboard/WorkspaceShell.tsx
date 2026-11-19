import { useId, useLayoutEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { List } from "@phosphor-icons/react/dist/icons/List";
import { CaretLeft } from "@phosphor-icons/react/dist/icons/CaretLeft";
import type { Icon } from "@phosphor-icons/react";
import brandLogo from "@/public/brand-su-ky-viet-nam.png";
import compactLogo from "@/public/logo-su-ky-viet-nam.png";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { cn } from "@/lib/utils";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import "./WorkspaceShell.css";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";

const NAV_LINK_CLASS =
  "relative flex min-h-10 shrink-0 items-center gap-3 rounded-lg px-3 text-sm leading-5 no-underline transition-colors hover:bg-mod-canvas-accent hover:text-mod-text focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mod-primary";

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
  variant: "admin" | "moderator";
  navigationLabel: string;
  mobileNavigationTitle: string;
  brandCaption?: string;
  nav: WorkspaceNavItem[];
  profile: ReactNode;
  children: ReactNode;
  compact?: boolean;
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
    if (collapsed) return null;
    return (
      <p className="mb-1 shrink-0 px-3 text-[11px] font-medium leading-5 text-mod-text-secondary">
        {item.label}
      </p>
    );
  }
  const IconComponent = item.icon;
  const className = cn(NAV_LINK_CLASS, collapsed && "justify-center gap-0 px-0", 
    item.active
      ? "bg-mod-canvas-accent font-semibold text-mod-text"
      : "font-medium text-mod-text-secondary"
  );
  const content = (
    <>
      {IconComponent ? (
        <IconComponent
          size={18}
          color={item.active ? "var(--modPrimary)" : "var(--modTextSecondary)"}
          weight={item.active ? "bold" : "regular"}
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
}: Omit<WorkspaceShellProps, "children" | "mobileNavigationTitle"> & {
  onNavigated: () => void;
  collapsed?: boolean;
}) {
  const groups: WorkspaceNavItem[][] = [];
  for (const item of nav) {
    if (item.groupStart || groups.length === 0) groups.push([]);
    groups.at(-1)?.push(item);
  }

  return (
    <>
      <div className={cn("mod-sidebar-brand", collapsed && "is-compact")}>
        <span className="flex min-w-0 flex-col items-center gap-1">
          <img
            src={collapsed ? compactLogo : brandLogo}
            alt="Sử Ký Việt Nam"
            className={cn("h-auto max-w-full object-contain", collapsed ? "size-10" : "w-[128px]")}
          />
          {brandCaption ? <span className={cn("mt-1 text-[11px] font-medium text-mod-text-secondary", collapsed && "sr-only")}>
            {brandCaption}
          </span> : null}
        </span>
      </div>
      <nav className="mod-sidebar-nav flex min-h-0 flex-1 flex-col overflow-y-auto py-2" aria-label={navigationLabel}>
        {groups.map((group) => (
          <div key={group[0]?.id} className="flex shrink-0 flex-col gap-1">
            {group.map((item) => (
              <WorkspaceNavLink key={item.id} item={item} onNavigated={onNavigated} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>
      <div className="workspace-sidebar-footer mt-auto flex shrink-0 flex-col gap-3 pt-2">
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
  const compact = props.compact || sidebarCollapsed;

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
    variant: props.variant,
    navigationLabel: props.navigationLabel,
    brandCaption: props.brandCaption,
    nav: props.nav,
    profile: props.profile,
    onNavigated: closeDrawer,
  };

  return (
    <div className="workspace-shell mod-layout-root font-sans text-mod-text" data-workspace={props.variant} data-compact-workspace={props.compact || undefined}>
      <div className="mod-layout-shell" data-sidebar-collapsed={compact}>
        <aside id={sidebarId} className="mod-sidebar" aria-label={props.navigationLabel}>
          <WorkspaceSidebar {...sidebarProps} collapsed={compact} />
        </aside>
        {props.compact ? null :
          <TooltipProvider delayDuration={250}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="mod-sidebar-toggle shrink-0 text-mod-text-secondary"
                  aria-label={sidebarCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
                  aria-expanded={!sidebarCollapsed}
                  aria-controls={sidebarId}
                  onClick={() => setSidebarCollapsed(collapsed => !collapsed)}
                >
                  <CaretLeft className={cn("size-3.5 transition-transform duration-200 motion-reduce:transition-none", sidebarCollapsed && "rotate-180")} aria-hidden="true" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="right" sideOffset={10} className="bg-mod-text text-mod-surface [&_svg]:bg-mod-text [&_svg]:fill-mod-text">
                {sidebarCollapsed ? "Mở rộng thanh bên" : "Thu gọn thanh bên"}
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        }
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
                data-workspace={props.variant}
                className="workspace-navigation-sheet mod-dashboard-sheet w-[286px] max-w-[88vw] flex-col gap-[18px] overflow-y-auto bg-mod-surface p-[18px]"
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
