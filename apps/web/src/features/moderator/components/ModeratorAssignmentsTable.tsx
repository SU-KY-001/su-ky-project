import { useState } from "react";
import { Eye } from "@phosphor-icons/react/dist/icons/Eye";
import { PaperPlaneTilt } from "@phosphor-icons/react/dist/icons/PaperPlaneTilt";
import { cn } from "@/lib/utils";
import { CardBadge, type CardBadgeTone } from "@/shared/components/dashboard/CardBadge";
import { DashboardHeader } from "@/shared/components/dashboard/DashboardOverview";
import { DashboardTableCard } from "@/shared/components/dashboard/DashboardTableCard";
import { DashboardDataTable, DashboardEmptyTableRow, dashboardTableCell } from "@/shared/components/dashboard/DashboardDataTable";
import { DashboardPagination } from "@/shared/components/dashboard/DashboardPagination";
import { DashboardRowActions } from "@/shared/components/dashboard/DashboardRowActions";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { TableCell, TableRow } from "@/shared/components/ui/table";
import { ConfirmationDialog } from "@/shared/components/common/ConfirmationDialog";
import { useConfirmationDialog } from "@/shared/hooks/useConfirmationDialog";
import type { AssignableEpisodeSummary, ModeratorAssignmentSummary } from "./ModeratorAssignments";
import { matchesVietnamDate, ModeratorDeadlineToolbar } from "./ModeratorDeadlineToolbar";

type AssignmentStatus = "NOT_STARTED" | "IN_PROGRESS" | "IN_REVIEW" | "CHANGES_REQUESTED" | "COMPLETED";

const labels: Record<AssignmentStatus, string> = {
  NOT_STARTED: "Chưa bắt đầu",
  IN_PROGRESS: "Đang thực hiện",
  IN_REVIEW: "Chờ duyệt",
  CHANGES_REQUESTED: "Cần chỉnh sửa",
  COMPLETED: "Hoàn thành",
};

const tones: Record<AssignmentStatus, CardBadgeTone> = {
  NOT_STARTED: "neutral", IN_PROGRESS: "info", IN_REVIEW: "info", CHANGES_REQUESTED: "warning", COMPLETED: "success",
};

function currentReview(item: ModeratorAssignmentSummary) {
  const episode = item.episode;
  return episode ? item.reviews.find((review) => review.episodeId === episode.id && review.revision === episode.contentRevision && review.status !== "WITHDRAWN") : undefined;
}

function pendingReview(item: ModeratorAssignmentSummary) {
  return item.reviews.find((review) => review.episodeId === item.episode?.id && review.status === "IN_REVIEW");
}

function assignmentStatus(item: ModeratorAssignmentSummary): AssignmentStatus {
  if (!item.episode) return "NOT_STARTED";
  const review = currentReview(item);
  if (review?.status === "IN_REVIEW" || review?.status === "CHANGES_REQUESTED") return review.status;
  if (review?.status === "APPROVED") return "COMPLETED";
  return "IN_PROGRESS";
}

const dateFormat = new Intl.DateTimeFormat("vi-VN", { dateStyle: "short", timeStyle: "short", timeZone: "Asia/Ho_Chi_Minh" });

export function ModeratorAssignmentsView({ assignments, assignableEpisodes = [], onLinkEpisode = () => undefined,
  onSubmitReview, onWithdrawReview = () => undefined, linkingId, submittingId, withdrawingId, loadFailed = false, onRetry,
}: {
  assignments: ModeratorAssignmentSummary[];
  assignableEpisodes?: AssignableEpisodeSummary[];
  onLinkEpisode?: (scheduleId: string, episodeId: string) => void;
  onSubmitReview: (scheduleId: string, revision: number, episodeId?: string) => void;
  onWithdrawReview?: (scheduleId: string, reviewId: string) => void;
  linkingId?: string | null;
  submittingId?: string | null;
  withdrawingId?: string | null;
  loadFailed?: boolean;
  onRetry?: () => void;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [deadlineDate, setDeadlineDate] = useState("");
  const [releaseDate, setReleaseDate] = useState("");
  const [page, setPage] = useState(1);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEpisodeId, setSelectedEpisodeId] = useState("");
  const { requestConfirmation, confirmation } = useConfirmationDialog();
  const relevant = assignments.filter((item) => item.status !== "CANCELLED");
  const selected = relevant.find((item) => item.id === selectedId);
  const filtered = relevant.filter((item) => item.title.toLocaleLowerCase("vi").includes(search.trim().toLocaleLowerCase("vi")) &&
    (status === "all" || assignmentStatus(item) === status) &&
    matchesVietnamDate(item.productionDeadline, deadlineDate) &&
    matchesVietnamDate(item.scheduledAt, releaseDate))
    .sort((a, b) => b.productionDeadline.getTime() - a.productionDeadline.getTime());
  const limit = 10;
  const currentPage = Math.min(page, Math.max(1, Math.ceil(filtered.length / limit)));
  const items = filtered.slice((currentPage - 1) * limit, currentPage * limit);
  const canSubmit = (item: ModeratorAssignmentSummary): boolean => Boolean(item.episode) &&
    !["RELEASED", "CANCELLED", "PUBLISHING"].includes(item.status) && !pendingReview(item) && !currentReview(item);
  const canLinkPodcast = Boolean(selected && !pendingReview(selected) && ["SCHEDULED", "BLOCKED", "FAILED", "READY_TO_PUBLISH"].includes(selected.status) && (!selected.episode || canSubmit(selected)));
  const previousEpisodeId = selected?.episode?.id ?? selected?.reviews.find((review) => review.status === "WITHDRAWN")?.episodeId;
  const podcastValue = selectedEpisodeId || (assignableEpisodes.some((episode) => episode.id === previousEpisodeId) ? previousEpisodeId : "") || "";
  const showStatus = (item: ModeratorAssignmentSummary) => {
    const key = assignmentStatus(item);
    return <CardBadge type="status" tone={tones[key]}>{labels[key]}</CardBadge>;
  };
  const submitButton = (item: ModeratorAssignmentSummary) => canSubmit(item) && item.episode ? (
    <Button type="button" size="sm" disabled={submittingId === item.id} onClick={() => onSubmitReview(item.id, item.episode!.contentRevision)}>
      <PaperPlaneTilt size={16} />{submittingId === item.id ? "Đang gửi…" : "Gửi duyệt"}
    </Button>
  ) : null;

  return <div className="flex min-w-0 flex-col gap-6 font-moderator">
    <DashboardHeader eyebrow="SẢN XUẤT PODCAST" title="Nhiệm vụ của tôi" description="Quản lý nội dung được phân công, hạn sản xuất và tiến độ kiểm duyệt." />
    <DashboardTableCard title="Nhiệm vụ được phân công" description="Hoàn thiện podcast và gửi phiên bản hiện tại để kiểm duyệt."
      summary={`${relevant.length} nhiệm vụ`}
      toolbar={<ModeratorDeadlineToolbar search={search} onSearchChange={(value) => { setSearch(value); setPage(1); }} searchLabel="Tìm nhiệm vụ" status={status} onStatusChange={(value) => { setStatus(value); setPage(1); }} statusLabel="Lọc trạng thái nhiệm vụ" statusOptions={Object.entries(labels).map(([value, label]) => ({ value, label }))} deadlineDate={deadlineDate} onDeadlineChange={(value) => { setDeadlineDate(value); setPage(1); }} releaseDate={releaseDate} onReleaseChange={(value) => { setReleaseDate(value); setPage(1); }} />}
      footer={<DashboardPagination page={currentPage} limit={limit} total={filtered.length} itemLabel="nhiệm vụ" onPageChange={setPage} />}>
      <DashboardDataTable embedded caption="Danh sách nhiệm vụ của tôi" columns={["Nhiệm vụ", "Podcast", "Hạn sản xuất", "Lịch phát hành", "Trạng thái", "Thao tác"]}
        columnWidths={["25%", "17%", "15%", "15%", "15%", "13%"]} minWidth={1050}>
        {loadFailed ? <DashboardEmptyTableRow columns={6}><Button variant="outline" onClick={onRetry}>Tải lại nhiệm vụ</Button></DashboardEmptyTableRow> : items.length ? items.map((item) => (
          <TableRow key={item.id} className="border-mod-border hover:bg-mod-canvas-accent/40">
            <TableCell className={cn(dashboardTableCell, "font-semibold leading-6 [overflow-wrap:anywhere]")}>{item.title}</TableCell>
            <TableCell className={dashboardTableCell}><p className="text-sm leading-5 [overflow-wrap:anywhere]">{item.episode ? item.episode.title ?? "Đã liên kết podcast" : "Chưa liên kết podcast"}</p></TableCell>
            <TableCell className={cn(dashboardTableCell, "text-xs leading-5 tabular-nums")}>{dateFormat.format(item.productionDeadline)}</TableCell>
            <TableCell className={cn(dashboardTableCell, "text-xs leading-5 tabular-nums")}>{dateFormat.format(item.scheduledAt)}</TableCell>
            <TableCell className={dashboardTableCell}>{showStatus(item)}</TableCell>
            <TableCell className={dashboardTableCell}>
              <DashboardRowActions label={item.title} actions={[{ id: "detail", label: "Xem chi tiết", icon: Eye, onSelect: () => { setSelectedId(item.id); setSelectedEpisodeId(""); } }]} />
            </TableCell>
          </TableRow>
        )) : <DashboardEmptyTableRow columns={6}>{relevant.length ? "Không có nhiệm vụ phù hợp với bộ lọc." : "Chưa có nhiệm vụ đang mở. Các lịch được Admin phân công sẽ xuất hiện tại đây."}</DashboardEmptyTableRow>}
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
          {selected.episode && !canLinkPodcast ? <div className="space-y-3 border-t border-mod-border pt-4"><p className="text-sm">Podcast đã liên kết: <span className="font-semibold">{selected.episode.title ?? "Podcast"}</span></p>
          </div> : null}
          {canLinkPodcast ? <section className="space-y-3 border-t border-mod-border pt-4">
            <label htmlFor="assignment-episode" className="text-sm font-semibold">Podcast nháp của bạn</label>
            <Select value={podcastValue} onValueChange={setSelectedEpisodeId}><SelectTrigger id="assignment-episode" aria-label="Podcast nháp của bạn"><SelectValue placeholder="Chọn podcast để thực hiện" /></SelectTrigger>
              <SelectContent>{assignableEpisodes.map((episode) => <SelectItem key={episode.id} value={episode.id}>{episode.seriesTitle}: {episode.title}</SelectItem>)}</SelectContent></Select>
            {!assignableEpisodes.length ? <p className="text-xs leading-5 text-mod-text-secondary">Hãy tạo podcast nháp trong mục Sản xuất podcast trước.</p> : null}
          </section> : null}
        </div> : null}
        <DialogFooter><Button variant="outline" onClick={() => setSelectedId(null)}>Đóng</Button>
          {selected && pendingReview(selected) && !["RELEASED", "CANCELLED", "PUBLISHING"].includes(selected.status) ? <Button type="button" className="bg-mod-primary text-white hover:bg-mod-primary/90" disabled={withdrawingId === selected.id} onClick={() => { const review = pendingReview(selected); if (!review) return; void requestConfirmation({ title: "Thu hồi bản gửi?", description: `Podcast của nhiệm vụ “${selected.title}” sẽ rời hàng chờ duyệt. Podcast sẽ được gỡ khỏi nhiệm vụ. Bạn cần chọn và gắn lại podcast trước khi gửi duyệt.`, confirmLabel: "Xác nhận thu hồi" }).then((confirmed) => { if (confirmed) { setSelectedEpisodeId(""); onWithdrawReview(selected.id, review.id); } }); }}>{withdrawingId === selected.id ? "Đang thu hồi…" : "Thu hồi bản gửi"}</Button> : null}
          {selected && canLinkPodcast && (!selected.episode || Boolean(podcastValue && podcastValue !== selected.episode.id)) ? <Button type="button" disabled={!podcastValue || submittingId === selected.id} onClick={() => { const podcast = assignableEpisodes.find((episode) => episode.id === podcastValue); if (podcast) onSubmitReview(selected.id, podcast.contentRevision, podcast.id); }}><PaperPlaneTilt size={16} />{submittingId === selected.id ? "Đang gửi…" : "Gửi duyệt"}</Button> : selected ? submitButton(selected) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
    <ConfirmationDialog {...confirmation} />
  </div>;
}
