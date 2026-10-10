import { lazy, Suspense, useCallback, useEffect, useState, type ReactNode } from "react";
import {
  ArrowUpRight,
  BellSimple,
  ChartBar,
  CheckCircle,
  GearSix,
  List,
  MagnifyingGlass,
  Plus,
  Scroll,
  SquaresFour,
  TrendUp,
  UsersThree,
} from "@phosphor-icons/react";
import { ChunkErrorBoundary } from "@/shared/components/common/ChunkErrorBoundary";
import { Button } from "@/shared/components/ui/button";
import { WorkspaceContentSkeleton } from "@/shared/components/ui/WorkspaceContentSkeleton";
import { Separator } from "@/shared/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/shared/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/shared/components/ui/tooltip";
import type { ModeratorQuickActionIcon } from "@/features/moderator/types";
import { ModeratorText } from "@/features/moderator/components/ModeratorText";

const ModeratorDashboard = lazy(() =>
  import("@/features/moderator/components/ModeratorDashboard").then(({ ModeratorDashboard: Dashboard }) => ({ default: Dashboard }))
);

const sidebarItems = [
  { id: "overview", label: "Tổng quan", icon: SquaresFour },
  { id: "analytics", label: "Phân tích", icon: TrendUp },
  { id: "integrations", label: "Kết nối", icon: ChartBar },
  { id: "quick-actions", label: "Thao tác nhanh", icon: Plus },
] as const;

const quickActionCopy: Record<ModeratorQuickActionIcon, string> = {
  series: "Mở bản xem trước tạo series. Dữ liệu chưa được lưu.",
  episode: "Mở bản xem trước thêm tập podcast. Dữ liệu chưa được lưu.",
  milestone: "Mở bản xem trước thêm mốc lịch sử. Dữ liệu chưa được lưu.",
  reference: "Mở bản xem trước thêm nguồn tư liệu. Dữ liệu chưa được lưu.",
};

type DashboardSection = (typeof sidebarItems)[number]["id"];
export type DashboardRole = "admin" | "moderator";

const roleLabels: Record<DashboardRole, {
  roleName: string;
  greetingLabel: string;
  profileName: string;
  navigationLabel: string;
  mobileNavigationTitle: string;
  headerDescription: string;
  settingsUnavailable: string;
  loadingLabel: string;
}> = {
  moderator: {
    roleName: "Moderator",
    greetingLabel: "Biên tập viên Sử Ký",
    profileName: "Điều hành Sử Ký",
    navigationLabel: "Điều hướng moderator",
    mobileNavigationTitle: "Menu điều hướng moderator",
    headerDescription: "Không gian điều hành nội dung Sử Ký",
    settingsUnavailable: "Thiết lập moderator chưa khả dụng trong bản xem trước.",
    loadingLabel: "Đang tải bảng điều khiển moderator…",
  },
  admin: {
    roleName: "Admin",
    greetingLabel: "Quản trị viên Sử Ký",
    profileName: "Quản trị Sử Ký",
    navigationLabel: "Điều hướng admin",
    mobileNavigationTitle: "Menu điều hướng admin",
    headerDescription: "Không gian quản trị hệ thống Sử Ký",
    settingsUnavailable: "Thiết lập admin chưa khả dụng trong bản xem trước.",
    loadingLabel: "Đang tải bảng điều khiển admin…",
  },
};

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

function SidebarContents({ role, activeSection, onNavigate, onPreview }: { role: DashboardRole; activeSection: DashboardSection; onNavigate: (section: DashboardSection) => void; onPreview: () => void }) {
  const labels = roleLabels[role];

  return (
    <>
      <div className="flex items-center gap-[11px] px-2 py-1">
        <span className="grid size-10 place-items-center rounded-[13px] bg-mod-primary text-white shadow-[0_7px_16px_rgba(2,132,187,.18)]"><Scroll size={20} weight="duotone" aria-hidden="true" /></span>
        <span className="flex flex-col">
          <ModeratorText className="text-base font-extrabold tracking-tight text-mod-text">Sử Ký</ModeratorText>
          <ModeratorText className="text-[10px] font-medium tracking-wide text-mod-text-secondary">KHÔNG GIAN ĐIỀU HÀNH</ModeratorText>
        </span>
      </div>

      <nav className="mt-6 flex flex-col gap-1.5" aria-label={labels.navigationLabel}>
        <ModeratorText className="mb-1 px-3 text-[10px] font-bold text-mod-text-low">MENU CHÍNH</ModeratorText>
        {sidebarItems.map((item) => {
          const isActive = activeSection === item.id;
          const Icon = item.icon;
          return (
            <a
              key={item.id}
              href={`#${item.id}`}
              onClick={(event) => {
                event.preventDefault();
                onNavigate(item.id);
              }}
              aria-current={isActive ? "location" : undefined}
              className={`relative flex min-h-11 items-center gap-[11px] rounded-[10px] px-3 text-sm no-underline transition-colors hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mod-primary ${isActive ? "bg-mod-canvas-accent font-bold text-mod-text" : "font-semibold text-mod-text-secondary"}`}
            >
              {isActive ? <span aria-hidden="true" className="absolute bottom-2.5 left-0 top-2.5 w-[3px] rounded-full bg-mod-primary" /> : null}
              <Icon size={18} color={isActive ? "var(--modPrimary)" : "var(--modTextSecondary)"} weight={isActive ? "fill" : "regular"} aria-hidden={true} />
              {item.label}
            </a>
          );
        })}
      </nav>

      <div className="mt-5 flex flex-col gap-[11px] rounded-[13px] border border-mod-border bg-mod-canvas-accent p-3.5">
        <div className="flex items-center gap-2"><span className="size-2 rounded-full bg-mod-success" /><ModeratorText className="text-[10px] font-bold text-mod-text">BẢN XEM TRƯỚC</ModeratorText></div>
        <ModeratorText className="text-xs leading-[18px] text-mod-text-secondary">Bảng điều khiển đang dùng dữ liệu minh họa.</ModeratorText>
        <Button variant="ghost" className="h-8 justify-between px-0 text-xs font-bold text-mod-primary hover:bg-transparent hover:text-mod-primary-hover" onClick={onPreview} aria-label="Xem trạng thái dữ liệu minh họa">
          Xem chi tiết<ArrowUpRight size={15} />
        </Button>
      </div>

      <div className="mt-auto flex flex-col gap-4">
        <Separator className="bg-mod-border" />
        <div className="flex items-center gap-[11px] px-1">
          <span className="grid size-[38px] place-items-center rounded-full border border-mod-border bg-mod-surface-glass"><UsersThree size={17} color="var(--modTextSecondary)" aria-hidden="true" /></span>
          <span className="flex min-w-0 flex-1 flex-col gap-0.5">
            <ModeratorText className="truncate text-sm font-bold text-mod-text">{labels.profileName}</ModeratorText>
            <ModeratorText className="text-xs text-mod-text-secondary">{labels.roleName}</ModeratorText>
          </span>
        </div>
        <a href="/" className="flex min-h-10 items-center gap-2 rounded-md px-2.5 text-xs font-semibold text-mod-text-secondary no-underline hover:bg-mod-canvas-accent focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-mod-primary">
          <ArrowUpRight size={15} aria-hidden="true" /><span>Mở trang Sử Ký</span>
        </a>
      </div>
    </>
  );
}

function scrollDashboardSection(section: DashboardSection) {
  const scrollContainer = document.querySelector<HTMLElement>(".mod-main-content");
  const target = document.getElementById(section);
  if (!scrollContainer || !target) return;

  const targetTop = scrollContainer.scrollTop + target.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  scrollContainer.scrollTo({ top: targetTop, behavior: reducedMotion ? "auto" : "smooth" });
}

function DashboardLoadError() {
  return (
    <section className="max-w-xl rounded-xl border border-mod-border bg-mod-surface p-5 text-sm text-mod-text-secondary" role="alert">
      <h1 className="text-base font-bold text-mod-text">Chưa tải được bảng điều khiển</h1>
      <p className="mt-2">Khung điều hướng vẫn dùng được. Bạn có thể tải lại trang để thử lại.</p>
      <button className="mt-3 font-semibold text-mod-primary underline" onClick={() => window.location.reload()}>
        Thử tải lại
      </button>
    </section>
  );
}

export function SharedDashboard({ role }: { role: DashboardRole }) {
  const labels = roleLabels[role];
  const [activeSection, setActiveSection] = useState<DashboardSection>("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState("");

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const showToast = useCallback((message: string) => setToast(message), []);
  const handleDashboardReady = useCallback(() => {
    const section = sidebarItems.find((item) => item.id === window.location.hash.slice(1));
    if (!section) return;

    setActiveSection(section.id);
    window.requestAnimationFrame(() => scrollDashboardSection(section.id));
  }, []);
  const navigateToSection = (section: DashboardSection) => {
    setActiveSection(section);
    scrollDashboardSection(section);

    const nextUrl = new URL(window.location.href);
    nextUrl.hash = section;
    window.history.replaceState(window.history.state, "", nextUrl);
    setDrawerOpen(false);
  };
  const previewData = () => showToast("Dữ liệu dashboard là bản minh họa, chưa kết nối dịch vụ thật.");

  return (
    <div className="mod-layout-root font-sans text-mod-text">
      <div className="mod-layout-shell">
        <aside className="mod-sidebar" aria-label={labels.navigationLabel}>
          <SidebarContents role={role} activeSection={activeSection} onNavigate={navigateToSection} onPreview={previewData} />
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
                <SheetContent id={`${role}-mobile-navigation`} side="left" className="mod-dashboard-sheet w-[286px] max-w-[88vw] flex-col gap-[18px] overflow-y-auto bg-mod-surface p-[18px]">
                  <SheetHeader className="pr-8">
                  <SheetTitle className="font-sans text-base">{labels.mobileNavigationTitle}</SheetTitle>
                  </SheetHeader>
                  <SidebarContents
                    role={role}
                    activeSection={activeSection}
                    onNavigate={navigateToSection}
                    onPreview={() => {
                      setDrawerOpen(false);
                      previewData();
                    }}
                  />
                </SheetContent>
              </Sheet>

              <div className="flex min-w-0 flex-col gap-1">
                <div className="flex items-center gap-1.5">
                  <ModeratorText className="truncate text-xs text-mod-text-secondary">Workspace</ModeratorText>
                  <ModeratorText className="text-xs text-mod-text-low">/</ModeratorText>
                  <ModeratorText className="truncate text-xs font-bold text-mod-text">Tổng quan</ModeratorText>
                </div>
                <ModeratorText className="mod-header-description text-xs text-mod-text-low">{labels.headerDescription}</ModeratorText>
              </div>
            </div>

            <TooltipProvider>
              <div className="flex shrink-0 items-center gap-2">
                <UtilityButton label="Tìm kiếm" onClick={() => showToast("Tìm kiếm trong dashboard chưa được bật.")}><MagnifyingGlass size={17} /></UtilityButton>
                <UtilityButton label="Thông báo" onClick={() => showToast("Bạn chưa có thông báo mới.")}><BellSimple size={17} /></UtilityButton>
                <UtilityButton label="Cài đặt" onClick={() => showToast(labels.settingsUnavailable)}><GearSix size={17} /></UtilityButton>
              </div>
            </TooltipProvider>
          </header>

          <main className="mod-main-content">
            <ChunkErrorBoundary fallback={<DashboardLoadError />}>
              <Suspense fallback={<WorkspaceContentSkeleton label={labels.loadingLabel} />}>
                <ModeratorDashboard greetingLabel={labels.greetingLabel} onToast={showToast} onReady={handleDashboardReady} />
              </Suspense>
            </ChunkErrorBoundary>
          </main>
        </div>
      </div>

      {toast ? (
        <div className="mod-toast" role="status" aria-live="polite">
          <CheckCircle size={17} color="var(--modSuccess)" weight="fill" aria-hidden={true} />
          <ModeratorText className="flex-1 text-xs font-semibold text-white">{toast}</ModeratorText>
        </div>
      ) : null}
    </div>
  );
}
