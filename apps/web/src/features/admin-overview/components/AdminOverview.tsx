import { useState, type ReactNode } from "react";
import { ArrowsClockwise } from "@phosphor-icons/react/dist/icons/ArrowsClockwise";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { ListenerReport } from "./ListenerReport";
import { calendarReportPeriod, ReportPeriodPicker } from "./ReportPeriodPicker";
import { ReleaseOverview, ReleaseSnapshot } from "./ReleaseOverview";
import { PremiumOverview, PremiumQuickLinks } from "./PremiumOverview";
import type { OverviewArea, OverviewDestination } from "../types";
import type { AdminListeningReportQuery } from "@repo/shared";
import "../adminOverview.css";

const areas: Array<{ id: OverviewArea; label: string }> = [{ id: "listeners", label: "Người nghe & nội dung" }, { id: "releases", label: "Phát hành podcast" }, { id: "premium", label: "Premium & doanh thu" }];

export function AdminOverview({ onNavigate }: { onNavigate: (section: OverviewDestination) => void }): ReactNode {
  const [area, setArea] = useState<OverviewArea>("listeners");
  const [period, setPeriod] = useState(() => calendarReportPeriod("month"));
  const queryClient = useQueryClient();
  return <AdminOverviewFrame area={area} onAreaChange={setArea} period={period} onPeriodChange={setPeriod} onRefresh={() => {
    void queryClient.invalidateQueries({ queryKey: ["admin-listening-report"] });
    void queryClient.invalidateQueries({ queryKey: ["admin-releases"] });
  }}>
    {area === "listeners" ? <ListenerReport period={period} aside={<><ReleaseSnapshot onNavigate={onNavigate} /><PremiumQuickLinks onNavigate={onNavigate} /></>} /> : area === "releases" ? <ReleaseOverview onNavigate={onNavigate} /> : <PremiumOverview onNavigate={onNavigate} />}
  </AdminOverviewFrame>;
}

function AdminOverviewFrame({ area, onAreaChange, period, onPeriodChange, onRefresh, children }: {
  area: OverviewArea;
  onAreaChange: (area: OverviewArea) => void;
  period: AdminListeningReportQuery;
  onPeriodChange: (period: AdminListeningReportQuery) => void;
  onRefresh: () => void;
  children: ReactNode;
}): ReactNode {
  return <div className="admin-overview" data-admin-overview="true">
    <header className="admin-overview-header"><div><p className="admin-overview-eyebrow">Không gian quản trị</p><h1>Tổng quan điều hành</h1><p>Theo dõi người nghe, nhịp phát hành và thành viên Premium.</p></div><div className="flex flex-wrap items-center gap-2">
      {area === "listeners" ? <ReportPeriodPicker value={period} onChange={onPeriodChange} /> : null}
      {area !== "premium" ? <Button variant="outline" size="icon" className="admin-overview-outline size-14" aria-label="Làm mới số liệu" title="Làm mới số liệu" onClick={onRefresh}><ArrowsClockwise size={16} /></Button> : null}
    </div></header>
    <div role="tablist" aria-label="Khu vực tổng quan" className="admin-overview-tabs">{areas.map((tab, index) => <button type="button" key={tab.id} id={`overview-tab-${tab.id}`} role="tab" aria-selected={area === tab.id} aria-controls={`overview-panel-${tab.id}`} tabIndex={area === tab.id ? 0 : -1} onClick={() => onAreaChange(tab.id)} onKeyDown={(event) => {
      if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
      event.preventDefault();
      const next = event.key === "Home" ? 0 : event.key === "End" ? areas.length - 1 : (index + (event.key === "ArrowRight" ? 1 : -1) + areas.length) % areas.length;
      const target = areas[next];
      if (target) { onAreaChange(target.id); document.getElementById(`overview-tab-${target.id}`)?.focus(); }
    }}>{tab.label}</button>)}</div>
    <section id={`overview-panel-${area}`} role="tabpanel" aria-labelledby={`overview-tab-${area}`} className="min-w-0">
      {children}
    </section>
  </div>;
}
