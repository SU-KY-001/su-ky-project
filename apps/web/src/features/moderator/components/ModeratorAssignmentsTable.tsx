import { useState } from "react";
import { Eye } from "@phosphor-icons/react/dist/icons/Eye";
import { LinkSimple } from "@phosphor-icons/react/dist/icons/LinkSimple";
import { MagnifyingGlass } from "@phosphor-icons/react/dist/icons/MagnifyingGlass";
import { PaperPlaneTilt } from "@phosphor-icons/react/dist/icons/PaperPlaneTilt";
import { cn } from "@/lib/utils";
import { CardBadge, cardBadgeToneForStatus } from "@/shared/components/dashboard/CardBadge";
import { DashboardHeader } from "@/shared/components/dashboard/DashboardOverview";
import { DashboardTableCard } from "@/shared/components/dashboard/DashboardTableCard";
import { DashboardDataTable, DashboardEmptyTableRow, dashboardTableCell } from "@/shared/components/dashboard/DashboardDataTable";
import { DashboardPagination } from "@/shared/components/dashboard/DashboardPagination";
import { DashboardRowActions } from "@/shared/components/dashboard/DashboardRowActions";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { TableCell, TableRow } from "@/shared/components/ui/table";
import { ReviewHistory } from "@/features/release-review/ReviewHistory";
import type { AssignableEpisodeSummary, ModeratorAssignmentSummary } from "./ModeratorAssignments";

const labels: Record<string, string> = {
  SCHEDULED: "Đang sản xuất", READY_TO_PUBLISH: "Đã duyệt, chờ phát hành",
  PUBLISHING: "Đang phát hành", RELEASED: "Đã hoàn thành", BLOCKED: "Cần xử lý",
  FAILED: "Phát hành thất bại", CANCELLED: "Đã hủy", IN_REVIEW: "Chờ kiểm duyệt",
  CHANGES_REQUESTED: "Cần chỉnh sửa",
};

function assignmentStatus(item: ModeratorAssignmentSummary): string {
  if (["SCHEDULED", "BLOCKED", "FAILED"].includes(item.status)) {
    const review = item.reviews[0];
    if (review && review.revision === item.episode?.contentRevision && ["IN_REVIEW", "CHANGES_REQUESTED"].includes(review.status)) return review.status;
  }
  return item.status;
}

const dateFormat = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

export function ModeratorAssignmentsView({ assignments, assignableEpisodes = [], onLinkEpisode = () => undefined,
  onSubmitReview, linkingId, submittingId, loadFailed = false, onRetry,
}: {
  assignments: ModeratorAssignmentSummary[];
  assignableEpisodes?: AssignableEpisodeSummary[];
  onLinkEpisode?: (scheduleId: string, episodeId: string) => void;
  onSubmitReview: (scheduleId: string, revision: number) => void;
  linkingId?: string | null;
  submittingId?: string | null;
  loadFailed?: boolean;
  onRetry?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState("");
  const selected = assignments.find((item) => item.id === selectedId);
  const filtered = assignments.filter((item) => item.title.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")) &&
    (status === "all" || assignmentStatus(item) === status));
  const limit = 10;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / limit)));
  const items = filtered.slice((currentPage - 1) * limit, currentPage * limit);
  const canSubmit = (item: ModeratorAssignmentSummary): boolean => Boolean(item.episode) &&
    ["SCHEDULED", "BLOCKED", "FAILED"].includes(item.status) && item.reviews[0]?.status !== "IN_REVIEW";
  const showStatus = (item: ModeratorAssignmentSummary) => {
    const key = assignmentStatus(item);
    return <CardBadge type="status" tone={cardBadgeToneForStatus(key)}>{labels[key] ?? key}</CardBadge>;
  };
  const submitButton = (item: ModeratorAssignmentSummary) => canSubmit(item) && item.episode ? (
    <Button type="button" size="sm" disabled={submittingId === item.id} onClick={() => onSubmitReview(item.id, item.episode!.contentRevision)}>
      <PaperPlaneTilt size={16} />{submittingId === item.id ? "Đang gửi…" : "Gửi duyệt"}
    </Button>
  ) : null;

  return <div className="flex min-w-0 flex-col gap-6 font-moderator">
    <DashboardHeader eyebrow="SẢN XUẤT PODCAST" title="Nhiệm vụ của tôi" description="Quản lý nội dung được phân công, hạn sản xuất và tiến độ kiểm duyệt." />
    <DashboardTableCard title="Nhiệm vụ được phân công" description="Hoàn thiện podcast và gửi phiên bản hiện tại để kiểm duyệt."
      summary={`${assignments.length} nhiệm vụ`}
      toolbar={<div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_240px]">
        <label className="relative"><span className="sr-only">Tìm nhiệm vụ</span><MagnifyingGlass size={17} className="absolute left-3 top-1/2 -translate-y-1/2 text-mod-text-muted" />
          <Input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Tìm nhiệm vụ" className="border-mod-border bg-mod-surface pl-9" />
        </label>
        <Select value={status} onValueChange={(value) => { setStatus(value); setPage(1); }}><SelectTrigger aria-label="Lọc trạng thái nhiệm vụ"><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="all">Tất cả trạng thái</SelectItem>{Object.entries(labels).map(([key, label]) => <SelectItem key={key} value={key}>{label}</SelectItem>)}</SelectContent>
        </Select>
      </div>}
      footer={<DashboardPagination page={currentPage} limit={limit} total={filtered.length} itemLabel="nhiệm vụ" onPageChange={setPage} />}>
      <DashboardDataTable embedded caption="Danh sách nhiệm vụ của tôi" columns={["Nhiệm vụ", "Podcast", "Hạn sản xuất", "Lịch phát hành", "Trạng thái", "Thao tác"]}
        columnWidths={["25%", "17%", "15%", "15%", "15%", "13%"]} minWidth={1050}>
        {loadFailed ? <DashboardEmptyTableRow columns={6}><Button variant="outline" onClick={onRetry}>Tải lại nhiệm vụ</Button></DashboardEmptyTableRow> : items.length ? items.map((item) => (
          <TableRow key={item.id} className="border-mod-border hover:bg-mod-canvas-accent/40">
            <TableCell className={cn(dashboardTableCell, "font-semibold leading-6 [overflow-wrap:anywhere]")}>{item.title}</TableCell>
            <TableCell className={dashboardTableCell}><p className="text-sm leading-5 [overflow-wrap:anywhere]">{item.episode ? item.episode.title ?? "Đã liên kết podcast" : "Chưa liên kết podcast"}</p>{item.episode ? <p className="mt-1 text-xs text-mod-text-secondary">Phiên bản {item.episode.contentRevision}</p> : null}</TableCell>
            <TableCell className={cn(dashboardTableCell, "text-xs leading-5 tabular-nums")}>{dateFormat.format(item.productionDeadline)}</TableCell>
            <TableCell className={cn(dashboardTableCell, "text-xs leading-5 tabular-nums")}>{dateFormat.format(item.scheduledAt)}</TableCell>
            <TableCell className={dashboardTableCell}>{showStatus(item)}</TableCell>
            <TableCell className={dashboardTableCell}>
              <DashboardRowActions label={item.title} actions={[{ id: "detail", label: "Xem chi tiết", icon: Eye, onSelect: () => { setSelectedId(item.id); setSelectedEpisodeId(""); } }]} />
            </TableCell>
          </TableRow>
        )) : <DashboardEmptyTableRow columns={6}>{assignments.length ? "Không có nhiệm vụ phù hợp với bộ lọc." : "Chưa có nhiệm vụ đang mở. Các lịch được Admin phân công sẽ xuất hiện tại đây."}</DashboardEmptyTableRow>}
      </DashboardDataTable>
    </DashboardTableCard>
    <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelectedId(null); }}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-xl flex-col overflow-hidden border-mod-border bg-mod-surface font-moderator text-mod-text">
        <DialogHeader><DialogTitle>Chi tiết nhiệm vụ</DialogTitle><DialogDescription>{selected?.title}</DialogDescription></DialogHeader>
        {selected ? <div className="mod-scrollbar-hidden min-h-0 space-y-5 overflow-y-auto">
          {showStatus(selected)}
          <dl className="grid gap-4 text-sm sm:grid-cols-2"><div><dt className="text-mod-text-secondary">Hạn sản xuất</dt><dd className="mt-1 font-semibold tabular-nums">{dateFormat.format(selected.productionDeadline)}</dd></div>
            <div><dt className="text-mod-text-secondary">Lịch phát hành</dt><dd className="mt-1 font-semibold tabular-nums">{dateFormat.format(selected.scheduledAt)}</dd></div></dl>
          {selected.reviews[0]?.status === "CHANGES_REQUESTED" && selected.reviews[0].reviewNote ? <section className="border-t border-mod-border pt-4"><h3 className="text-sm font-semibold">Nhận xét kiểm duyệt</h3><p className="mt-2 whitespace-pre-wrap text-sm leading-6">{selected.reviews[0].reviewNote}</p></section> : null}
          <ReviewHistory reviews={selected.reviews.filter((review) => review.status === "APPROVED")} />
          {selected.episode ? <p className="border-t border-mod-border pt-4 text-sm">Podcast đã liên kết · Phiên bản {selected.episode.contentRevision}</p> : <section className="space-y-3 border-t border-mod-border pt-4">
            <label htmlFor="assignment-episode" className="text-sm font-semibold">Podcast nháp của bạn</label>
            <Select value={selectedEpisodeId} onValueChange={setSelectedEpisodeId}><SelectTrigger id="assignment-episode" aria-label="Podcast nháp của bạn"><SelectValue placeholder="Chọn podcast để thực hiện" /></SelectTrigger>
              <SelectContent>{assignableEpisodes.map((episode) => <SelectItem key={episode.id} value={episode.id}>{episode.seriesTitle}: {episode.title}</SelectItem>)}</SelectContent></Select>
            {!assignableEpisodes.length ? <p className="text-xs leading-5 text-mod-text-secondary">Hãy tạo podcast nháp trong mục Sản xuất podcast trước.</p> : null}
          </section>}
        </div> : null}
        <DialogFooter><Button variant="outline" onClick={() => setSelectedId(null)}>Đóng</Button>
          {selected && !selected.episode ? <Button disabled={!selectedEpisodeId || linkingId === selected.id} onClick={() => onLinkEpisode(selected.id, selectedEpisodeId)}><LinkSimple size={16} />{linkingId === selected.id ? "Đang gắn…" : "Gắn podcast"}</Button> : null}
          {selected ? submitButton(selected) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  </div>;
}
