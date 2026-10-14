import { useState } from "react";
import {
  Article,
  Books,
  ChartBar,
  Gear,
  List,
  ListChecks,
  Scroll,
  Users,
} from "@phosphor-icons/react";
import { Button } from "@/shared/components/ui/button";
import { Separator } from "@/shared/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/shared/components/ui/sheet";
import brandLogo from "@/public/brand-su-ky-viet-nam.png";
import { AccountProfile } from "@/features/auth";
import type { AdminSection } from "./adminService";
import { OverviewPanel } from "./OverviewPanel";
import { UsersPanel } from "./UsersPanel";
import { ContentPanel } from "./ContentPanel";
import { CatalogPanel } from "./CatalogPanel";
import { ConfigPanel } from "./ConfigPanel";
import { AuditPanel } from "./AuditPanel";
import { MissionsPanel } from "./MissionsPanel";

const sections = [
  { id: "overview", label: "Tổng quan", icon: ChartBar },
  { id: "users", label: "Tài khoản", icon: Users },
  { id: "catalog", label: "Danh mục", icon: Books },
  { id: "content", label: "Nội dung", icon: Article },
  { id: "missions", label: "Nhiệm vụ", icon: ListChecks },
  { id: "configs", label: "Cấu hình", icon: Gear },
  { id: "audit", label: "Nhật ký", icon: Scroll },
] as const;

function Sidebar({
  active,
  onSelect,
}: {
  active: AdminSection;
  onSelect: (value: AdminSection) => void;
}) {
  return (
    <>
      <img src={brandLogo} alt="Sử Ký Việt Nam" className="h-auto w-[170px]" />
      <p className="mt-2 px-1 text-[10px] font-bold text-ink-soft">
        KHÔNG GIAN QUẢN TRỊ
      </p>
      <nav className="mt-6 flex flex-col gap-1.5" aria-label="Điều hướng admin">
        {sections.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => onSelect(id)}
            className={`relative flex min-h-11 items-center gap-3 rounded-lg px-3 text-left text-sm font-semibold ${active === id ? "bg-paper-deep text-ink" : "text-ink-soft hover:bg-paper-deep/50"}`}
          >
            <Icon
              size={18}
              weight={active === id ? "fill" : "regular"}
              className={active === id ? "text-vermilion" : ""}
            />
            {label}
          </button>
        ))}
      </nav>
      <div className="mt-auto space-y-4">
        <Separator className="bg-line" />
        <AccountProfile variant="admin" />
      </div>
    </>
  );
}

function Content({ section }: { section: AdminSection }) {
  if (section === "users") return <UsersPanel />;
  if (section === "catalog") return <CatalogPanel />;
  if (section === "content") return <ContentPanel />;
  if (section === "missions") return <MissionsPanel />;
  if (section === "configs") return <ConfigPanel />;
  if (section === "audit") return <AuditPanel />;
  return <OverviewPanel />;
}

export function AdminWorkspace() {
  const [section, setSection] = useState<AdminSection>("overview");
  const [drawer, setDrawer] = useState(false);
  const current = sections.find((item) => item.id === section)!;
  const select = (value: AdminSection) => {
    setSection(value);
    setDrawer(false);
  };
  return (
    <div className="mod-layout-root font-sans text-ink">
      <div className="mod-layout-shell">
        <aside className="mod-sidebar">
          <Sidebar active={section} onSelect={select} />
        </aside>
        <div className="mod-main-column">
          <header className="mod-header">
            <div className="flex items-center gap-3">
              <Sheet open={drawer} onOpenChange={setDrawer}>
                <SheetTrigger asChild>
                  <Button
                    variant="outline"
                    size="icon"
                    className="mod-mobile-only"
                  >
                    <List size={18} />
                  </Button>
                </SheetTrigger>
                <SheetContent
                  side="left"
                  className="flex w-[286px] flex-col bg-paper-soft p-5"
                >
                  <SheetHeader>
                    <SheetTitle>Quản trị Sử Ký</SheetTitle>
                  </SheetHeader>
                  <Sidebar active={section} onSelect={select} />
                </SheetContent>
              </Sheet>
              <div>
                <p className="text-xs text-ink-soft">
                  Admin / <strong>{current.label}</strong>
                </p>
                <p className="text-xs text-ink-soft">
                  Không gian quản trị hệ thống Sử Ký
                </p>
              </div>
            </div>
          </header>
          <main className="mod-main-content">
            <Content section={section} />
          </main>
        </div>
      </div>
    </div>
  );
}
