import { Button } from "@/shared/components/ui/button";
import { TableRow, TableCell, TableHead } from "@/shared/components/ui/table";
import { Fragment, useState } from "react";
import { CaretDown, CaretRight, Plus } from "@phosphor-icons/react";
import { useWorkspaceData } from "@/features/moderator/WorkspaceData";
import { notify, dashboardDraftNotice } from "@/shared/lib/notifications";
import { EmptyTableRow, InteractiveTableRow, ModeratorTable, branchAction, primaryAction, tableAction, tableCell } from "@/features/moderator/components/ModeratorTable";
import { ModeratorSectionPanel } from "@/features/moderator/components/ModeratorSectionPanel";
import { ModeratorListToolbar } from "@/features/moderator/components/ModeratorListToolbar";
import { CreatePodcastPage, type PodcastDraft } from "@/features/podcast-production/CreatePodcastPage";

const dateFormatter = new Intl.DateTimeFormat("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });

export function PodcastProductionPage() {
  const { series, setSeries, episodes, setEpisodes, periods, setPeriods } = useWorkspaceData();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [creating, setCreating] = useState(false);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => new Set(series.map((item) => item.id)));
  const [selectedEpisodeId, setSelectedEpisodeId] = useState<string | null>(null);
  const normalizedQuery = query.trim().toLocaleLowerCase("vi-VN");
  const groups = series.map((item) => ({ series: item, episodes: episodes.filter((episode) => episode.seriesId === item.id && (statusFilter === "all" || (statusFilter === "published" ? Boolean(episode.publishedAt) : !episode.publishedAt)) && [item.name, episode.name, String(episode.episodeNumber)].join(" ").toLocaleLowerCase("vi-VN").includes(normalizedQuery)) }))
    .filter((group) => group.episodes.length || (statusFilter === "all" && group.series.name.toLocaleLowerCase("vi-VN").includes(normalizedQuery)));
  const toggle = (id: string) => setCollapsed((current) => { const next = new Set(current); if (next.has(id)) next.delete(id); else next.add(id); return next; });
  const submit = (draft: PodcastDraft) => {
    if (draft.kind === "series") {
      const id = crypto.randomUUID();
      setSeries((current) => [...current, { id, name: draft.name, description: draft.description, eventId: draft.eventId }]);
      setCollapsed((current) => new Set(current).add(id));
    } else {
      const number = Math.max(0, ...episodes.filter((episode) => episode.seriesId === draft.seriesId).map((episode) => episode.episodeNumber)) + 1;
      setEpisodes((current) => [...current, { id: crypto.randomUUID(), seriesId: draft.seriesId, name: draft.name, description: draft.description, script: draft.script, episodeNumber: number, publishedAt: null, duration: null }]);
      setSeries((current) => current.map((item) => item.id === draft.seriesId && !item.eventId ? { ...item, eventId: draft.eventId } : item));
      setPeriods((current) => current.map((period) => ({ ...period, stages: period.stages.map((stage) => ({ ...stage, events: stage.events.map((event) => event.id === draft.eventId ? { ...event, podcastCount: event.podcastCount + 1 } : event) })) })));
      setCollapsed((current) => { const next = new Set(current); next.delete(draft.seriesId); return next; });
    }
    setQuery("");
    setStatusFilter("all");
    setCreating(false);
    notify.success({ title: `Đã tạo bản nháp ${draft.kind === "series" ? "series" : "tập podcast"} “${draft.name}”.`, description: dashboardDraftNotice });
  };
  if (creating) return <CreatePodcastPage series={series} periods={periods} onBack={() => setCreating(false)} onSubmit={submit} />;
  return <section className="flex w-full flex-col gap-5 font-moderator">
    <header className="border-b border-mod-border pb-4">
      <h1 className="text-2xl font-bold tracking-tight text-mod-text">Sản xuất podcast</h1><p className="mt-1 text-sm text-mod-text-secondary">Quản lý series và các tập podcast trong từng nhánh.</p>
    </header>
    <ModeratorSectionPanel eyebrow="SẢN XUẤT PODCAST" title="Danh sách series và tập podcast" summary={`${groups.length} series · ${groups.reduce((total, group) => total + group.episodes.length, 0)} tập`} toolbar={<ModeratorListToolbar searchLabel="Tìm series hoặc tập podcast" searchValue={query} onSearchChange={setQuery} filters={[{ id: "status", label: "Trạng thái", value: statusFilter, onValueChange: setStatusFilter, options: [{ value: "all", label: "Tất cả trạng thái" }, { value: "draft", label: "Bản nháp" }, { value: "published", label: "Đã phát hành" }] }]} actions={<Button type="button" onClick={() => setCreating(true)} className={primaryAction}><Plus size={17} aria-hidden="true" />Tạo podcast</Button>} />}>
    <ModeratorTable embedded caption="Series và các tập podcast" columns={["Series / Tập podcast", "Số tập", "Ngày phát hành", "Thời lượng", "Trạng thái"]} columnWidths={["44%", "12%", "16%", "12%", "16%"]} minWidth={960}>
      {groups.map((group) => {
        const Icon = collapsed.has(group.series.id) ? CaretRight : CaretDown;
        const event = periods.flatMap((period) => period.stages.flatMap((stage) => stage.events)).find((item) => item.id === group.series.eventId);
        return <Fragment key={group.series.id}>
          <InteractiveTableRow onActivate={() => toggle(group.series.id)} expanded={!collapsed.has(group.series.id)}>
            <TableHead scope="row" className={tableCell + " min-w-80"}><Button variant="ghost" type="button" className={branchAction} aria-expanded={!collapsed.has(group.series.id)} onClick={() => toggle(group.series.id)}><Icon size={16} aria-hidden="true" />{group.series.name}</Button>{event ? <span className="mt-1 block text-xs font-normal text-mod-text-secondary">{event.name}</span> : null}{group.series.description ? <span className="mt-1 block text-xs font-normal text-mod-text-secondary">{group.series.description}</span> : null}</TableHead>
            <TableCell className={tableCell}>{episodes.filter((episode) => episode.seriesId === group.series.id).length}</TableCell><TableCell className={tableCell}>—</TableCell><TableCell className={tableCell}>—</TableCell><TableCell className={tableCell}>Series</TableCell>
          </InteractiveTableRow>
          {!collapsed.has(group.series.id) ? group.episodes.length ? group.episodes.map((episode) => <Fragment key={episode.id}>
            <InteractiveTableRow onActivate={() => setSelectedEpisodeId(selectedEpisodeId === episode.id ? null : episode.id)} expanded={selectedEpisodeId === episode.id}><TableHead scope="row" className={tableCell + " pl-10"}><Button variant="ghost" type="button" className={tableAction} aria-expanded={selectedEpisodeId === episode.id} onClick={() => setSelectedEpisodeId(selectedEpisodeId === episode.id ? null : episode.id)}>{episode.name}</Button></TableHead><TableCell className={tableCell + " tabular-nums"}>Tập {episode.episodeNumber}</TableCell><TableCell className={tableCell + " whitespace-nowrap"}>{episode.publishedAt ? dateFormatter.format(new Date(episode.publishedAt + "T12:00:00")) : "—"}</TableCell><TableCell className={tableCell}>{episode.duration ?? "—"}</TableCell><TableCell className={tableCell}><span className={episode.publishedAt ? "rounded-full bg-mod-success/10 px-2.5 py-1 text-xs font-semibold text-mod-success" : "rounded-full bg-mod-canvas-accent px-2.5 py-1 text-xs font-semibold text-mod-text-secondary"}>{episode.publishedAt ? "Đã phát hành" : "Bản nháp"}</span></TableCell></InteractiveTableRow>
            {selectedEpisodeId === episode.id ? <TableRow><TableCell colSpan={5} className="bg-mod-canvas-accent/30 p-5"><h2 className="font-bold text-mod-text">{episode.name}</h2><p className="mt-2 whitespace-pre-wrap text-sm text-mod-text-secondary">{episode.description || "Chưa có mô tả."}</p><h3 className="mt-4 text-sm font-semibold text-mod-text">Kịch bản</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-mod-text-secondary">{episode.script || "Chưa có kịch bản."}</p></TableCell></TableRow> : null}
          </Fragment>) : <EmptyTableRow columns={5}>Series này chưa có tập podcast phù hợp.</EmptyTableRow> : null}
        </Fragment>;
      })}
      {!groups.length ? <EmptyTableRow columns={5}>Không tìm thấy series hoặc episode phù hợp.</EmptyTableRow> : null}
    </ModeratorTable>
    </ModeratorSectionPanel>
  </section>;
}



