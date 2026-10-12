import { TableRow, TableCell, TableHead } from "@/shared/components/ui/table";
import { Fragment, useState } from "react";
import { CaretDown, CaretRight, Plus } from "@phosphor-icons/react";
import type { HistoricalEvent, HistoricalPeriod, HistoricalStage, LibraryStatus } from "../types";
import { notify, dashboardDraftNotice } from "@/shared/lib/notifications";
import { useWorkspaceData } from "@/features/moderator/WorkspaceData";
import { EmptyTableRow, InteractiveTableRow, ModeratorTable, branchAction, primaryAction, tableAction, tableCell } from "@/features/moderator/components/ModeratorTable";
import { createSessionEvent, createSessionPeriod, createSessionStage } from "../model";
import { CreateHistoricalContentDialog, type HistoricalDraft } from "./CreateHistoricalContentDialog";
import { Dialog, DialogTrigger } from "@/shared/components/ui/dialog";
import { Button } from "@/shared/components/ui/button";
import { LibraryContent } from "./LibraryContent";
import { LibraryStatusBadge } from "./LibraryStatusBadge";
import { ModeratorSectionPanel } from "@/features/moderator/components/ModeratorSectionPanel";
import { ModeratorListToolbar } from "@/features/moderator/components/ModeratorListToolbar";

type HistoryKindFilter = "all" | "period" | "stage" | "event";
type HistoryStatusFilter = "all" | LibraryStatus;

function matchesHistoryItem(item: HistoricalPeriod | HistoricalStage | HistoricalEvent, kind: HistoryKindFilter, itemKind: Exclude<HistoryKindFilter, "all">, status: HistoryStatusFilter, query: string): boolean {
  if (kind !== "all" && kind !== itemKind) return false;
  if (status !== "all" && item.status !== status) return false;
  return !query || `${item.name} ${item.timeLabel}`.toLocaleLowerCase("vi-VN").includes(query);
}

export function HistoricalLibraryWorkspace() {
  const { periods, setPeriods } = useWorkspaceData();
  const [creating, setCreating] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [manuallyCollapsed, setManuallyCollapsed] = useState<Set<string>>(new Set());
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [kindFilter, setKindFilter] = useState<HistoryKindFilter>("all");
  const [statusFilter, setStatusFilter] = useState<HistoryStatusFilter>("all");
  const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");
  const hasFilters = Boolean(normalizedQuery) || kindFilter !== "all" || statusFilter !== "all";
  const filteredPeriods = periods.flatMap((period) => {
    const stages = period.stages.flatMap((stage) => {
      const events = stage.events.filter((event) => matchesHistoryItem(event, kindFilter, "event", statusFilter, normalizedQuery));
      const stageMatches = matchesHistoryItem(stage, kindFilter, "stage", statusFilter, normalizedQuery);
      const includeStage = kindFilter === "period" ? false : kindFilter === "stage" ? stageMatches : kindFilter === "event" ? events.length > 0 : stageMatches || events.length > 0;
      return includeStage ? [{ ...stage, events: kindFilter === "stage" ? [] : events }] : [];
    });
    const periodMatches = matchesHistoryItem(period, kindFilter, "period", statusFilter, normalizedQuery);
    const includePeriod = kindFilter === "period" ? periodMatches : kindFilter === "all" ? periodMatches || stages.length > 0 : stages.length > 0;
    return includePeriod ? [{ ...period, stages: kindFilter === "period" ? [] : stages }] : [];
  });
  const visibleStageCount = filteredPeriods.reduce((total, period) => total + period.stages.length, 0);
  const visibleEventCount = filteredPeriods.reduce((total, period) => total + period.stages.reduce((stageTotal, stage) => stageTotal + stage.events.length, 0), 0);
  const autoExpandPeriods = hasFilters && kindFilter !== "period";
  const autoExpandStages = hasFilters && (kindFilter === "all" || kindFilter === "event");
  const updateQuery = (value: string) => { setQuery(value); setManuallyCollapsed(new Set()); };
  const updateKindFilter = (value: string) => {
    if (value === "all" || value === "period" || value === "stage" || value === "event") { setKindFilter(value); setManuallyCollapsed(new Set()); }
  };
  const updateStatusFilter = (value: string) => {
    if (value === "all" || value === "draft" || value === "missing_source" || value === "needs_review" || value === "complete") { setStatusFilter(value); setManuallyCollapsed(new Set()); }
  };
  const toggle = (id: string, autoOpen = false) => {
    if (autoOpen) { setManuallyCollapsed((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; }); return; }
    setExpanded((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  };
  const submit = (draft: HistoricalDraft) => {
    const input = { name: draft.name, timeLabel: draft.timeLabel, summary: draft.summary };
    if (draft.kind === "period") {
      const period = createSessionPeriod(input);
      setPeriods((current) => [...current, period]);
      setExpanded((current) => new Set([...current, period.id]));
    } else if (draft.kind === "stage") {
      const stage = createSessionStage(input);
      setPeriods((current) => current.map((period) => period.id === draft.periodId ? { ...period, stages: [...period.stages, stage] } : period));
      setExpanded((current) => new Set([...current, draft.periodId, stage.id]));
    } else {
      const event = createSessionEvent(input);
      setPeriods((current) => current.map((period) => period.id === draft.periodId ? { ...period, stages: period.stages.map((stage) => stage.id === draft.stageId ? { ...stage, events: [...stage.events, event] } : stage) } : period));
      setExpanded((current) => new Set([...current, draft.periodId, draft.stageId]));
      setSelectedEventId(event.id);
    }
    setCreating(false);
    const kindLabel = draft.kind === "period" ? "thời kỳ" : draft.kind === "stage" ? "giai đoạn" : "sự kiện";
    notify.success({ title: `Đã tạo bản nháp ${kindLabel} “${draft.name}”.`, description: dashboardDraftNotice });
  };
  return <Dialog open={creating} onOpenChange={setCreating}><section className="flex w-full flex-col gap-5 font-moderator [overflow-anchor:none]">
    <header className="border-b border-mod-border pb-4">
      <div><h1 className="text-2xl font-bold tracking-tight text-mod-text">Dòng lịch sử</h1><p className="mt-1 text-sm text-mod-text-secondary">Mở từng nhánh để xem thời kỳ, giai đoạn và sự kiện trong cùng một bảng.</p></div>
    </header>
    <ModeratorSectionPanel eyebrow="THƯ VIỆN LỊCH SỬ" title="Danh sách dòng lịch sử" summary={`${filteredPeriods.length} thời kỳ · ${visibleStageCount} giai đoạn · ${visibleEventCount} sự kiện`} toolbar={<ModeratorListToolbar searchLabel="Tìm trong dòng lịch sử" searchValue={query} onSearchChange={updateQuery} filters={[
      { id: "kind", label: "Loại nội dung", value: kindFilter, onValueChange: updateKindFilter, options: [{ value: "all", label: "Tất cả loại" }, { value: "period", label: "Thời kỳ" }, { value: "stage", label: "Giai đoạn" }, { value: "event", label: "Sự kiện" }] },
      { id: "status", label: "Trạng thái", value: statusFilter, onValueChange: updateStatusFilter, options: [{ value: "all", label: "Tất cả trạng thái" }, { value: "draft", label: "Bản nháp" }, { value: "missing_source", label: "Thiếu nguồn" }, { value: "needs_review", label: "Cần kiểm tra" }, { value: "complete", label: "Đã hoàn thiện" }] },
    ]} actions={<DialogTrigger asChild><Button type="button" className={primaryAction}><Plus size={17} aria-hidden="true" />Tạo nội dung</Button></DialogTrigger>} />}>
    <ModeratorTable embedded caption="Dòng lịch sử theo thời kỳ, giai đoạn và sự kiện" columns={["Nội dung", "Loại", "Mốc thời gian", "Nguồn", "Podcast", "Trạng thái"]} columnWidths={["33%", "9%", "24%", "8%", "8%", "18%"]} minWidth={1040}>
      {filteredPeriods.map((period) => {
        const periodOpen = autoExpandPeriods ? period.stages.length > 0 && !manuallyCollapsed.has(period.id) : expanded.has(period.id);
        const periodEvents = periods.find((item) => item.id === period.id)?.stages.flatMap((stage) => stage.events) ?? [];
        return <Fragment key={period.id}>
          <InteractiveTableRow onActivate={() => toggle(period.id, autoExpandPeriods)} expanded={periodOpen}>
            <TableHead scope="row" className={tableCell + " min-w-[320px] text-mod-text"}><BranchButton name={period.name} open={periodOpen} onClick={() => toggle(period.id, autoExpandPeriods)} /></TableHead>
            <TableCell className={tableCell}>Thời kỳ</TableCell><TableCell className={tableCell}>{period.timeLabel}</TableCell><TableCell className={tableCell}>{periodEvents.reduce((sum, event) => sum + event.sources.length, 0)}</TableCell><TableCell className={tableCell}>{periodEvents.reduce((sum, event) => sum + event.podcastCount, 0)}</TableCell><TableCell className={tableCell}><LibraryStatusBadge status={period.status} compact /></TableCell>
          </InteractiveTableRow>
          {periodOpen ? period.stages.length ? period.stages.map((stage) => {
            const stageOpen = autoExpandStages ? stage.events.length > 0 && !manuallyCollapsed.has(stage.id) : expanded.has(stage.id);
            const stageEvents = periods.flatMap((item) => item.stages).find((item) => item.id === stage.id)?.events ?? [];
            return <Fragment key={stage.id}>
            <InteractiveTableRow onActivate={() => toggle(stage.id, autoExpandStages)} expanded={stageOpen}>
              <TableHead scope="row" className={tableCell + " pl-10 text-mod-text"}><BranchButton name={stage.name} open={stageOpen} onClick={() => toggle(stage.id, autoExpandStages)} /></TableHead>
              <TableCell className={tableCell}>Giai đoạn</TableCell><TableCell className={tableCell}>{stage.timeLabel}</TableCell><TableCell className={tableCell}>{stageEvents.reduce((sum, event) => sum + event.sources.length, 0)}</TableCell><TableCell className={tableCell}>{stageEvents.reduce((sum, event) => sum + event.podcastCount, 0)}</TableCell><TableCell className={tableCell}><LibraryStatusBadge status={stage.status} compact /></TableCell>
            </InteractiveTableRow>
            {stageOpen ? stage.events.length ? stage.events.map((event) => <Fragment key={event.id}>
              <InteractiveTableRow onActivate={() => setSelectedEventId(selectedEventId === event.id ? null : event.id)} expanded={selectedEventId === event.id}>
                <TableHead scope="row" className={tableCell + " pl-16"}><Button variant="ghost" type="button" className={tableAction} aria-expanded={selectedEventId === event.id} onClick={() => setSelectedEventId(selectedEventId === event.id ? null : event.id)}>{event.name}</Button></TableHead>
                <TableCell className={tableCell}>Sự kiện</TableCell><TableCell className={tableCell}>{event.timeLabel}</TableCell><TableCell className={tableCell}>{event.sources.length}</TableCell><TableCell className={tableCell}>{event.podcastCount}</TableCell><TableCell className={tableCell}><LibraryStatusBadge status={event.status} compact /></TableCell>
              </InteractiveTableRow>
              {selectedEventId === event.id ? <TableRow><TableCell colSpan={6} className="bg-mod-canvas-accent/30 p-5"><LibraryContent selected={{ type: "event", node: event, event, period, stage }} /></TableCell></TableRow> : null}
            </Fragment>) : <EmptyTableRow columns={6}>{hasFilters ? "Không có sự kiện phù hợp." : "Giai đoạn này chưa có sự kiện."}</EmptyTableRow> : null}
          </Fragment>}) : <EmptyTableRow columns={6}>{hasFilters ? "Không có giai đoạn phù hợp." : "Thời kỳ này chưa có giai đoạn."}</EmptyTableRow> : null}
        </Fragment>;
      })}
      {!filteredPeriods.length ? <EmptyTableRow columns={6}>{hasFilters ? "Không tìm thấy nội dung phù hợp." : "Chưa có nội dung lịch sử."}</EmptyTableRow> : null}
    </ModeratorTable>
    </ModeratorSectionPanel>
  </section>{creating ? <CreateHistoricalContentDialog periods={periods} onBack={() => setCreating(false)} onSubmit={submit} /> : null}</Dialog>;
}

function BranchButton({ name, open, onClick }: { name: string; open: boolean; onClick: () => void }) {
  const Icon = open ? CaretDown : CaretRight;
  return <Button variant="ghost" type="button" aria-expanded={open} onClick={onClick} className={branchAction}><Icon size={16} className="mt-0.5 shrink-0 text-mod-text-low" aria-hidden="true" /><span>{name}</span></Button>;
}




