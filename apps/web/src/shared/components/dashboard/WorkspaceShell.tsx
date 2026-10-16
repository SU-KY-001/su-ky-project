import { useLayoutEffect, useState, type ReactNode } from "react";
import { Link } from "react-router";
import { ArrowUpRight, List, type Icon } from "@phosphor-icons/react";
import brandLogo from "@/public/brand-su-ky-viet-nam.png";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
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
  externalHomeLabel?: string;
}

function WorkspaceNavLink({
  item,
  onNavigated,
}: {
  item: WorkspaceNavItem;
  onNavigated: () => void;
}) {
  if (item.groupStart)
    return (
      <p className="mb-1 mt-4 px-3 text-[10px] font-bold tracking-[0.08em] text-mod-text-low first:mt-0">
        {item.label}
      </p>
    );
  const IconComponent = item.icon;
  const className = `${NAV_LINK_CLASS} ${
    item.active
      ? "bg-mod-canvas-accent font-bold text-mod-text"
      : "font-semibold text-mod-text-secondary"
  }`;
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
      {item.label}
    </>
  );
  if (item.to)
    return (
      <Link
        to={item.to}
        onClick={onNavigated}
        aria-current={item.active ? "page" : undefined}
        className={className}
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
  externalHomeLabel,
  onNavigated,
}: Omit<WorkspaceShellProps, "children" | "mobileNavigationTitle"> & {
  onNavigated: () => void;
}) {
  return (
    <>
      <div className="flex items-center gap-[11px] px-2 py-1">
        <span className="flex min-w-0 flex-col gap-1">
          <img
            src={brandLogo}
            alt="Sử Ký Việt Nam"
            className="h-auto w-[164px] max-w-full object-contain"
          />
          <span className="pl-1 text-[9px] font-semibold tracking-[0.08em] text-mod-text-secondary">
            {brandCaption}
          </span>
        </span>
      </div>
      <nav className="mt-6 flex flex-col gap-1" aria-label={navigationLabel}>
        {nav.map((item) => (
          <WorkspaceNavLink key={item.id} item={item} onNavigated={onNavigated} />
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-4">
        <Separator className="bg-mod-border" />
        {profile}
        {externalHomeLabel ? (
          <a
            href="/"
            className="flex min-h-10 items-center gap-2 rounded-md px-2.5 text-xs font-semibold text-mod-text-secondary no-underline hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mod-primary"
          >
            <ArrowUpRight size={15} aria-hidden="true" />
            <span>{externalHomeLabel}</span>
          </a>
        ) : null}
      </div>
    </>
  );
}

export function WorkspaceShell(props: WorkspaceShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const closeDrawer = () => setDrawerOpen(false);

  useLayoutEffect(() => {
    const className = "workspace-scroll-lock";
    document.documentElement.classList.add(className);
    document.body.classList.add(className);

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
    externalHomeLabel: props.externalHomeLabel,
    onNavigated: closeDrawer,
  };

  return (
    <div className="mod-layout-root font-sans text-mod-text">
      <div className="mod-layout-shell">
        <aside className="mod-sidebar" aria-label={props.navigationLabel}>
          <WorkspaceSidebar {...sidebarProps} />
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
