import { Button } from "@/shared/components/ui/button";
import { TableRow, TableCell, TableHead } from "@/shared/components/ui/table";
import { Fragment, useState } from "react";
import { LibraryContent } from "@/features/historical-library/components/LibraryContent";
import { LibraryStatusBadge } from "@/features/historical-library/components/LibraryStatusBadge";
import { useWorkspaceData } from "@/features/moderator/WorkspaceData";
import { EmptyTableRow, InteractiveTableRow, ModeratorTable, tableAction, tableCell } from "@/features/moderator/components/ModeratorTable";
import { ModeratorSectionPanel } from "@/features/moderator/components/ModeratorSectionPanel";
import { ModeratorListToolbar } from "@/features/moderator/components/ModeratorListToolbar";
import type { ModeratorSection } from "@/features/moderator/types";

export function ModeratorLibraryFeaturePage({ section }: { section: Extract<ModeratorSection, "events" | "sources" | "pending" | "schedule"> }) {
  const { periods } = useWorkspaceData();
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");
  const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");
  const allEvents = periods.flatMap((period) => period.stages.flatMap((stage) => stage.events.map((event) => ({ event, period, stage }))));
  const allSources = allEvents.flatMap(({ event, period, stage }) => event.sources.map((source) => ({ source, event, period, stage })));
  const eventRows = allEvents.filter(({ event, period, stage }) => (section !== "pending" || event.status !== "complete") && (statusFilter === "all" || event.status === statusFilter) && [event.name, period.name, stage.name, event.timeLabel].join(" ").toLocaleLowerCase("vi-VN").includes(normalizedQuery));
  const sourceRows = allSources.filter(({ source, event, period }) => (periodFilter === "all" || period.id === periodFilter) && [source.title, source.meta, event.name].join(" ").toLocaleLowerCase("vi-VN").includes(normalizedQuery));
  const title = section === "events" ? "Sự kiện" : section === "sources" ? "Nguồn tư liệu" : section === "pending" ? "Cần xử lý" : "Lịch phát hành";
  return <section className="flex w-full flex-col gap-5 font-moderator">
    <header className="border-b border-mod-border pb-4">
      <h1 className="text-2xl font-bold tracking-tight text-mod-text">{title}</h1><p className="mt-1 text-sm text-mod-text-secondary">{section === "sources" ? "Nguồn tư liệu và nội dung lịch sử liên quan." : section === "schedule" ? "Theo dõi các podcast được xếp lịch phát hành." : "Chọn hàng sự kiện để mở nội dung và nguồn tư liệu ngay trong bảng."}</p>
    </header>
    <ModeratorSectionPanel eyebrow={section === "schedule" ? "XUẤT BẢN" : "THƯ VIỆN LỊCH SỬ"} title={section === "events" ? "Danh sách sự kiện" : section === "sources" ? "Danh mục nguồn tư liệu" : section === "pending" ? "Nội dung cần xử lý" : "Lịch phát hành podcast"} summary={section === "sources" ? `${sourceRows.length} nguồn tư liệu` : section === "schedule" ? "0 podcast được lên lịch" : `${eventRows.length} sự kiện`} toolbar={<ModeratorListToolbar searchLabel={"Tìm kiếm " + title.toLocaleLowerCase("vi-VN")} searchValue={query} onSearchChange={setQuery} filters={section === "sources" ? [{ id: "period", label: "Thời kỳ", value: periodFilter, onValueChange: setPeriodFilter, options: [{ value: "all", label: "Tất cả thời kỳ" }, ...periods.map((period) => ({ value: period.id, label: period.name }))] }] : section === "schedule" ? [] : [{ id: "status", label: "Trạng thái", value: statusFilter, onValueChange: setStatusFilter, options: [{ value: "all", label: "Tất cả trạng thái" }, ...(section === "pending" ? [{ value: "draft", label: "Bản nháp" }, { value: "missing_source", label: "Thiếu nguồn" }, { value: "needs_review", label: "Cần kiểm tra" }] : [{ value: "draft", label: "Bản nháp" }, { value: "missing_source", label: "Thiếu nguồn" }, { value: "needs_review", label: "Cần kiểm tra" }, { value: "complete", label: "Đã hoàn thiện" }])] }]} />}>
    {section === "events" || section === "pending" ? <ModeratorTable embedded caption={title} columns={["Sự kiện", "Thời kỳ / Giai đoạn", "Mốc thời gian", "Nguồn", "Podcast", "Trạng thái", "Cập nhật"]}>
      {eventRows.map(({ event, period, stage }) => <Fragment key={event.id}>
        <InteractiveTableRow onActivate={() => setSelectedEventId(selectedEventId === event.id ? null : event.id)} expanded={selectedEventId === event.id}>
          <TableHead scope="row" className={tableCell + " min-w-60"}><Button variant="ghost" type="button" className={tableAction} aria-expanded={selectedEventId === event.id} onClick={() => setSelectedEventId(selectedEventId === event.id ? null : event.id)}>{event.name}</Button></TableHead>
          <TableCell className={tableCell + " min-w-56"}><span className="block font-medium text-mod-text">{period.name}</span><span className="mt-1 block text-xs">{stage.name}</span></TableCell>
          <TableCell className={tableCell}>{event.timeLabel}</TableCell><TableCell className={tableCell}>{event.sources.length}</TableCell><TableCell className={tableCell}>{event.podcastCount}</TableCell><TableCell className={tableCell}><LibraryStatusBadge status={event.status} compact /></TableCell><TableCell className={tableCell + " whitespace-nowrap"}>{event.updatedAt}</TableCell>
        </InteractiveTableRow>
        {selectedEventId === event.id ? <TableRow><TableCell colSpan={7} className="bg-mod-canvas-accent/30 p-5"><LibraryContent selected={{ type: "event", node: event, event, period, stage }} /></TableCell></TableRow> : null}
      </Fragment>)}
      {!eventRows.length ? <EmptyTableRow columns={7}>Không có sự kiện phù hợp.</EmptyTableRow> : null}
    </ModeratorTable> : null}
    {section === "sources" ? <ModeratorTable embedded caption="Danh mục nguồn tư liệu" columns={["Nguồn tư liệu", "Thông tin trích dẫn", "Sự kiện", "Thời kỳ / Giai đoạn"]}>
      {sourceRows.map(({ source, event, period, stage }) => <TableRow key={event.id + "-" + source.id}><TableHead scope="row" className={tableCell + " font-semibold text-mod-text"}>{source.title}</TableHead><TableCell className={tableCell}>{source.meta}</TableCell><TableCell className={tableCell}>{event.name}</TableCell><TableCell className={tableCell}>{period.name}<span className="mt-1 block text-xs">{stage.name}</span></TableCell></TableRow>)}
      {!sourceRows.length ? <EmptyTableRow columns={4}>Không có nguồn tư liệu phù hợp.</EmptyTableRow> : null}
    </ModeratorTable> : null}
    {section === "schedule" ? <ModeratorTable embedded caption="Lịch phát hành podcast" columns={["Podcast", "Series", "Ngày phát hành", "Trạng thái"]}><EmptyTableRow columns={4}>Chưa có lịch phát hành. Lịch sẽ hiển thị khi podcast được lên lịch.</EmptyTableRow></ModeratorTable> : null}
    </ModeratorSectionPanel>
  </section>;
}



