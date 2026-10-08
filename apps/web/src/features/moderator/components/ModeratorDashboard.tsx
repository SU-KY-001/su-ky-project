import { useEffect, useState, type ReactNode } from "react";
import "@fontsource/manrope/400.css";
import "@fontsource/manrope/500.css";
import "@fontsource/manrope/600.css";
import "@fontsource/manrope/700.css";
import "@fontsource/manrope/800.css";
import {
  ArrowClockwise,
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
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { moderatorMockDataLabel, moderatorOverviewMock } from "../data";
import type { ModeratorQuickActionIcon } from "../types";
import { AreaChartPanel } from "./AreaChartPanel";
import { IntegrationStatusCard } from "./IntegrationStatusCard";
import { MetricCard } from "./MetricCard";
import { ModeratorText } from "./ModeratorText";
import { QuickActions } from "./QuickActions";

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

function DashboardActionButton({ label, icon, onClick, primary = false }: { label: string; icon: ReactNode; onClick: () => void; primary?: boolean }) {
  return (
    <Button variant={primary ? "default" : "outline"} className={primary ? "min-h-11 rounded-[10px] bg-mod-primary px-[15px] text-white hover:bg-mod-primary-hover" : "min-h-11 rounded-[10px] border-mod-border bg-mod-surface px-[15px] text-mod-text-muted hover:border-mod-primary hover:bg-mod-surface-glass"} onClick={onClick}>
      {icon}{label}
    </Button>
  );
}

function SidebarContents({ activeSection, onNavigate, onPreview }: { activeSection: DashboardSection; onNavigate: (section: DashboardSection) => void; onPreview: () => void }) {
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

export function ModeratorDashboard() {
  const [activeSection, setActiveSection] = useState<DashboardSection>("overview");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [toast, setToast] = useState("");
  const [today] = useState(() => new Date());

  useEffect(() => {
    if (!toast) return undefined;
    const timeout = window.setTimeout(() => setToast(""), 3200);
    return () => window.clearTimeout(timeout);
  }, [toast]);

  const showToast = (message: string) => setToast(message);
  const navigateToSection = (section: DashboardSection) => {
    setActiveSection(section);
    const scrollContainer = document.querySelector<HTMLElement>(".mod-main-content");
    const target = document.getElementById(section);
    if (scrollContainer && target) {
      const targetTop = scrollContainer.scrollTop + target.getBoundingClientRect().top - scrollContainer.getBoundingClientRect().top;
      const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      scrollContainer.scrollTo({ top: targetTop, behavior: reducedMotion ? "auto" : "smooth" });
    }
    const nextUrl = new URL(window.location.href);
    nextUrl.hash = section;
    window.history.replaceState(window.history.state, "", nextUrl);
    setDrawerOpen(false);
  };
  const refreshMockData = () => showToast("Đã cập nhật dữ liệu minh họa.");

  const formattedDate = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(today);
  const currentDate = `${formattedDate.slice(0, 1).toLocaleUpperCase("vi-VN")}${formattedDate.slice(1)}`;

  return (
    <div className="mod-layout-root font-moderator text-mod-text">
      <div className="mod-layout-shell">
        <aside className="mod-sidebar" aria-label="Điều hướng moderator">
          <SidebarContents activeSection={activeSection} onNavigate={navigateToSection} onPreview={() => showToast("Dữ liệu dashboard là bản minh họa, chưa kết nối dịch vụ thật.")} />
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
                  <SidebarContents
                    activeSection={activeSection}
                    onNavigate={navigateToSection}
                    onPreview={() => {
                      setDrawerOpen(false);
                      showToast("Dữ liệu dashboard là bản minh họa, chưa kết nối dịch vụ thật.");
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
                <ModeratorText className="mod-header-description text-xs text-mod-text-low">Không gian điều hành nội dung Sử Ký</ModeratorText>
              </div>
            </div>

            <TooltipProvider>
              <div className="flex shrink-0 items-center gap-2">
                <UtilityButton label="Tìm kiếm" onClick={() => showToast("Tìm kiếm trong dashboard chưa được bật.")}><MagnifyingGlass size={17} /></UtilityButton>
                <UtilityButton label="Thông báo" onClick={() => showToast("Bạn chưa có thông báo mới.")}><BellSimple size={17} /></UtilityButton>
                <UtilityButton label="Cài đặt" onClick={() => showToast("Thiết lập moderator chưa khả dụng trong bản xem trước.")}><GearSix size={17} /></UtilityButton>
              </div>
            </TooltipProvider>
          </header>

          <main className="mod-main-content">
            <section id="overview" className="flex flex-col gap-[21px]">
              <div className="flex flex-wrap items-end justify-between gap-[18px]">
                <div className="flex min-w-[245px] flex-1 flex-col gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <ModeratorText className="text-xs font-bold text-mod-text-secondary">{currentDate}</ModeratorText>
                    <span className="flex items-center gap-1.5 rounded-full border border-mod-border bg-mod-surface px-2 py-1">
                      <span className="size-1.5 rounded-full bg-mod-primary" />
                      <ModeratorText className="text-xs font-semibold text-mod-text-secondary">{moderatorMockDataLabel}</ModeratorText>
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <ModeratorText className="text-sm font-semibold text-mod-text-muted">{moderatorOverviewMock.greeting}, {moderatorOverviewMock.moderatorLabel}</ModeratorText>
                    <ModeratorText as="h1" className="text-3xl font-extrabold leading-tight tracking-tight text-mod-text max-[620px]:text-2xl">Tổng quan nội dung</ModeratorText>
                  </div>
                  <ModeratorText className="text-sm text-mod-text-secondary">Theo dõi thư viện lịch sử, lượt nghe và hoạt động của Sử Ký.</ModeratorText>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <DashboardActionButton label="Làm mới" icon={<ArrowClockwise size={16} color="var(--modTextMuted)" aria-hidden={true} />} onClick={refreshMockData} />
                  <DashboardActionButton label="Tạo nội dung" icon={<Plus size={17} color="white" weight="bold" aria-hidden={true} />} onClick={() => showToast("Mở bản xem trước tạo nội dung. Dữ liệu chưa được lưu.")} primary />
                </div>
              </div>

              <div className="mod-metric-grid">
                {moderatorOverviewMock.metrics.map((metric) => <MetricCard key={metric.id} metric={metric} />)}
              </div>
            </section>

            <section id="analytics" className="flex flex-col gap-[15px]">
              <div className="flex items-end justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <ModeratorText as="h2" className="text-lg font-extrabold tracking-tight text-mod-text">Phân tích hoạt động</ModeratorText>
                  <ModeratorText className="text-xs text-mod-text-secondary">Tổng hợp minh họa trong sáu tháng gần nhất.</ModeratorText>
                </div>
                <span className="flex shrink-0 items-center gap-1.5 rounded-[9px] border border-mod-border bg-mod-surface px-2.5 py-2">
                  <CheckCircle size={14} color="var(--modSuccess)" weight="fill" aria-hidden={true} />
                  <ModeratorText className="text-xs font-semibold text-mod-text-secondary">6 tháng</ModeratorText>
                </span>
              </div>
              <div className="mod-chart-grid">
                {moderatorOverviewMock.charts.map((chart) => <AreaChartPanel key={chart.id} chart={chart} />)}
              </div>
            </section>

            <section id="integrations" className="flex flex-col gap-[15px]">
              <div className="flex flex-col gap-1">
                <ModeratorText as="h2" className="text-lg font-extrabold tracking-tight text-mod-text">Kết nối dữ liệu</ModeratorText>
                <ModeratorText className="text-xs text-mod-text-secondary">Trạng thái các dịch vụ phân tích bên ngoài.</ModeratorText>
              </div>
              <div className="mod-integration-grid">
                {moderatorOverviewMock.integrations.map((integration) => <IntegrationStatusCard key={integration.id} integration={integration} />)}
              </div>
            </section>

            <section id="quick-actions" className="flex flex-col gap-[15px]">
              <div className="flex flex-col gap-1">
                <ModeratorText as="h2" className="text-lg font-extrabold tracking-tight text-mod-text">Thao tác nhanh</ModeratorText>
                <ModeratorText className="text-xs text-mod-text-secondary">Lối tắt cho các loại nội dung chính trong thư viện.</ModeratorText>
              </div>
              <QuickActions items={moderatorOverviewMock.quickActions} onAction={(id) => {
                const action = moderatorOverviewMock.quickActions.find((item) => item.id === id);
                if (action) showToast(quickActionCopy[action.icon]);
              }} />
            </section>
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
