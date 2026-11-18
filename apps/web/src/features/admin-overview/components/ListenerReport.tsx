import type { ReactNode } from "react";
import type { AdminListeningReport, AdminListeningReportQuery } from "@repo/shared";
import { DashboardMetricStrip } from "@/shared/components/dashboard/DashboardOverview";
import { DashboardTableCard } from "@/shared/components/dashboard/DashboardTableCard";
import { DashboardDataTable, DashboardEmptyTableRow, dashboardTableCell } from "@/shared/components/dashboard/DashboardDataTable";
import { TableCell, TableRow } from "@/shared/components/ui/table";
import { Button } from "@/shared/components/ui/button";
import { useListeningReport } from "../hooks/useListeningReport";
import { ListeningChart } from "./ListeningChart";
import { errorMessage } from "@/lib/apiError";
import { Users } from "@phosphor-icons/react/dist/icons/Users";
import { Headphones } from "@phosphor-icons/react/dist/icons/Headphones";
import { Clock } from "@phosphor-icons/react/dist/icons/Clock";
import { CheckCircle } from "@phosphor-icons/react/dist/icons/CheckCircle";

const count = (value: number): string => value.toLocaleString("vi-VN");
export const listeningHours = (ms: number): string => (ms / 3_600_000).toLocaleString("vi-VN", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

export function ListenerReport({ period, aside }: { period: AdminListeningReportQuery; aside: ReactNode }): ReactNode {
  const query = useListeningReport(period);
  if (query.isPending) return <div role="status" aria-label="Đang tải báo cáo người nghe" className="grid gap-4"><div className="ui-skeleton h-32 rounded-xl" /><div className="ui-skeleton h-64 rounded-xl" /><div className="ui-skeleton h-48 rounded-xl" /><span className="sr-only">Đang tải báo cáo người nghe</span></div>;
  if (query.isError) return <div className="admin-overview-panel p-6"><h2 className="text-base font-semibold">Chưa tải được báo cáo người nghe</h2><p className="my-3 text-sm text-mod-text-secondary">{errorMessage(query.error)}</p><Button variant="outline" className="admin-overview-outline" onClick={() => void query.refetch()}>Thử lại</Button></div>;
  return <ListenerReportView report={query.data} aside={aside} />;
}

export function ListenerReportView({ report, aside }: { report: AdminListeningReport; aside?: ReactNode }): ReactNode {
  const { summary } = report;
  return <div className="grid gap-5">
    <div className="admin-listening-primary">
    <DashboardMetricStrip variant="icon" metrics={[
      { id: "listeners", label: "Số người nghe", value: count(summary.uniqueListeners), icon: Users, tone: "primary" },
      { id: "listens", label: "Lượt nghe được tính", value: count(summary.validListens), icon: Headphones, tone: "info" },
      { id: "duration", label: "Tổng thời lượng nghe", value: <>{listeningHours(summary.listeningMs)}<small className="ml-1.5 text-xs font-normal tracking-normal">giờ</small></>, icon: Clock, tone: "warning" },
      { id: "completions", label: "Lượt hoàn thành tập", value: count(summary.completedEpisodes), icon: CheckCircle, tone: "success" },
    ]} />
        <section className="admin-listening-main-panel admin-overview-panel p-5">
          <div className="admin-overview-panel-heading"><div><h2>Hoạt động nghe</h2></div><span className="admin-overview-meta">GMT+7</span></div>
          <ListeningChart key={`${report.from}/${report.to}`} daily={report.daily} weekly={report.weekly} monthly={report.monthly} from={report.from} to={report.to} />
          {summary.validListens === 0 ? <p className="mt-2 text-xs text-mod-text-secondary">Chưa có lượt nghe được tính trong khoảng thời gian này.</p> : null}
        </section>
    </div>
    <div className="admin-listening-secondary">
        <DashboardTableCard title="Top 5 câu chuyện / tập" description="Xếp theo lượt nghe được tính; một người có thể nghe nhiều phiên." className="admin-overview-table">
          <DashboardDataTable embedded caption="Top 5 tập được nghe nhiều nhất" columns={["Câu chuyện / tập", "Lượt nghe", "Người nghe", "Thời lượng"]} columnWidths={["46%", "18%", "18%", "18%"]} minWidth={540}>
            {report.topEpisodes.length ? report.topEpisodes.map((episode, index) => <TableRow key={episode.episodeId} className="border-mod-border">
              <TableCell className={dashboardTableCell}><div className="flex gap-3"><span className="pt-0.5 text-xs tabular-nums text-mod-text-secondary">{index + 1}</span><div><p className="font-semibold text-mod-text">{episode.title}</p><p className="mt-1 text-xs text-mod-text-secondary">{episode.seriesTitle}</p></div></div></TableCell>
              <TableCell className={`${dashboardTableCell} text-right tabular-nums`}>{count(episode.validListens)}</TableCell>
              <TableCell className={`${dashboardTableCell} text-right tabular-nums`}>{count(episode.uniqueListeners)}</TableCell>
              <TableCell className={`${dashboardTableCell} text-right tabular-nums`}>{listeningHours(episode.listeningMs)} giờ</TableCell>
            </TableRow>) : <DashboardEmptyTableRow columns={4}>Chưa có tập được tính lượt nghe trong kỳ này.</DashboardEmptyTableRow>}
          </DashboardDataTable>
        </DashboardTableCard>
      {aside ? <aside className="admin-listening-secondary-aside" aria-label="Thông tin vận hành">{aside}</aside> : null}
    </div>
  </div>;
}
