import { useState } from "react";
import type { ComponentPropsWithoutRef, ElementType } from "react";
import {
  Article,
  CalendarBlank,
  ChartBar,
  List,
  ListChecks,
} from "@phosphor-icons/react";
import brandLogo from "@/public/brand-su-ky-viet-nam.png";
import { cn } from "@/lib/utils";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/components/ui/sheet";
import { AccountProfile } from "@/features/auth";

const sidebarItems = [
  { id: "statistics", label: "Thống kê", icon: ChartBar },
  { id: "content", label: "Nội dung", icon: Article },
  { id: "tasks", label: "Nhiệm vụ", icon: ListChecks },
  { id: "release-schedule", label: "Lịch phát hành", icon: CalendarBlank },
] as const;

function DashboardText<T extends ElementType = "span">({
  as,
  className,
  ...props
}: { as?: T } & Omit<ComponentPropsWithoutRef<T>, "as">) {
  const Component = as ?? "span";
  return <Component className={cn("font-sans", className)} {...props} />;
}

export type DashboardRole = "admin" | "moderator";

const roleLabels: Record<DashboardRole, {
  roleName: string;
  profileName: string;
  navigationLabel: string;
  mobileNavigationTitle: string;
  headerDescription: string;
}> = {
  moderator: {
    roleName: "Moderator",
    profileName: "Điều hành Sử Ký",
    navigationLabel: "Điều hướng moderator",
    mobileNavigationTitle: "Menu điều hướng moderator",
    headerDescription: "Không gian điều hành nội dung Sử Ký",
  },
  admin: {
    roleName: "Admin",
    profileName: "Quản trị Sử Ký",
    navigationLabel: "Điều hướng admin",
    mobileNavigationTitle: "Menu điều hướng admin",
    headerDescription: "Không gian quản trị hệ thống Sử Ký",
  },
};

function SidebarContents({ role }: { role: DashboardRole }) {
  const labels = roleLabels[role];

  return (
    <>
      <div className="flex items-center px-2 py-1">
        <div className="flex min-w-0 flex-col gap-1">
          <img src={brandLogo} alt="Sử Ký Việt Nam" className="h-auto w-[170px] max-w-full object-contain" />
          <DashboardText className="pl-1 text-[9px] font-medium tracking-wide text-ink-soft">
            KHÔNG GIAN ĐIỀU HÀNH
          </DashboardText>
        </div>
      </div>

      <nav className="mt-6 flex flex-col gap-1.5" aria-label={labels.navigationLabel}>
        <DashboardText className="mb-1 px-3 text-[10px] font-bold text-ink-soft">MENU CHÍNH</DashboardText>
        {sidebarItems.map((item) => {
          const isActive = item.id === "statistics";
          const Icon = item.icon;

          return (
            <div
              key={item.id}
              aria-current={isActive ? "page" : undefined}
              className={`relative flex min-h-11 items-center gap-[11px] rounded-[10px] px-3 text-sm ${isActive ? "bg-paper-deep font-bold text-ink" : "font-semibold text-ink-soft"}`}
            >
              {isActive ? <span aria-hidden="true" className="absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-full bg-vermilion" /> : null}
              <Icon size={18} className={isActive ? "text-vermilion" : "text-ink-soft"} weight={isActive ? "fill" : "regular"} aria-hidden={true} />
              {item.label}
            </div>
          );
        })}
      </nav>

      <div className="mt-auto flex flex-col gap-4">
        <Separator className="bg-line" />
        <AccountProfile variant={role} />
      </div>
    </>
  );
}

export function SharedDashboard({ role }: { role: DashboardRole }) {
  const labels = roleLabels[role];
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="mod-layout-root font-sans text-ink">
      <div className="mod-layout-shell">
        <aside className="mod-sidebar" aria-label={labels.navigationLabel}>
          <SidebarContents role={role} />
        </aside>

        <div className="mod-main-column">
          <header className="mod-header">
            <div className="flex min-w-0 items-center gap-[13px]">
              <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" size="icon" className="mod-mobile-only size-[39px] rounded-[10px] border-line bg-paper text-ink-soft" aria-label="Mở menu điều hướng">
                    <List size={18} />
                  </Button>
                </SheetTrigger>
                <SheetContent id={`${role}-mobile-navigation`} side="left" className="mod-dashboard-sheet w-[286px] max-w-[88vw] flex-col gap-[18px] overflow-y-auto border-line bg-paper-soft p-[18px] text-ink">
                  <SheetHeader className="pr-8">
                    <SheetTitle className="font-sans text-base text-ink">{labels.mobileNavigationTitle}</SheetTitle>
                  </SheetHeader>
                  <SidebarContents role={role} />
                </SheetContent>
              </Sheet>

              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <DashboardText className="truncate text-xs text-ink-soft">Workspace</DashboardText>
                  <DashboardText className="text-xs text-ink-soft">/</DashboardText>
                  <DashboardText className="truncate text-xs font-bold text-ink">Tổng quan</DashboardText>
                </div>
                <DashboardText className="mod-header-description text-xs text-ink-soft">{labels.headerDescription}</DashboardText>
              </div>
            </div>
          </header>

          <main className="mod-main-content" aria-label="Nội dung bảng điều khiển" />
        </div>
      </div>
    </div>
  );
}
