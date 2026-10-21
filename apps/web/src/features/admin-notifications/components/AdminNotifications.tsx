import { useState, type FormEvent } from "react";
import type { ReleaseReassignmentTicket, ReleaseReassignmentTicketStatus } from "@repo/shared";
import { ArrowRight, CheckCircle, Eye, Ticket, XCircle } from "@phosphor-icons/react";
import { errorMessage } from "@/lib/apiError";
import { CardBadge, cardBadgeToneForStatus } from "@/shared/components/dashboard/CardBadge";
import { DashboardHeader } from "@/shared/components/dashboard/DashboardOverview";
import {
  DashboardDataTable,
  DashboardEmptyTableRow,
  dashboardTableCell,
} from "@/shared/components/dashboard/DashboardDataTable";
import { DashboardTableCard } from "@/shared/components/dashboard/DashboardTableCard";
import { Button } from "@/shared/components/ui/button";
import { DashboardRowActions } from "@/shared/components/dashboard/DashboardRowActions";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/shared/components/ui/dialog";
import { Label } from "@/shared/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { TableCell, TableRow } from "@/shared/components/ui/table";
import { Textarea } from "@/shared/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useAdminTickets } from "../hooks/useAdminTickets";

type ModeratorOption = { id: string; name: string; email: string };
type TicketStatusFilter = ReleaseReassignmentTicketStatus | "";

const statusCopy: Record<ReleaseReassignmentTicketStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Đã từ chối",
  CANCELLED: "Moderator đã hủy",
};

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(value);
}

export function AdminNotificationsView({
  tickets,
  moderators,
  status,
  busy,
  onStatusChange,
  onApprove,
  onReject,
}: {
  tickets: ReleaseReassignmentTicket[];
  moderators: ModeratorOption[];
  status: TicketStatusFilter;
  busy: boolean;
  onStatusChange: (status: TicketStatusFilter) => void;
  onApprove: (ticket: ReleaseReassignmentTicket, replacementModeratorId: string) => Promise<unknown> | unknown;
  onReject: (ticket: ReleaseReassignmentTicket, reason: string) => Promise<unknown> | unknown;
}) {
  const [activeTicket, setActiveTicket] = useState<ReleaseReassignmentTicket | null>(null);
  const [action, setAction] = useState<"approve" | "reject" | null>(null);
  const [replacementModeratorId, setReplacementModeratorId] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const openDetail = (ticketItem: ReleaseReassignmentTicket) => {
    setActiveTicket(ticketItem);
    setAction(null);
    setFormError(null);
  };
  const closeDetail = () => {
    setActiveTicket(null);
    setFormError(null);
  };

  const openAction = (ticketItem: ReleaseReassignmentTicket, nextAction: "approve" | "reject") => {
    setActiveTicket(ticketItem);
    setAction(nextAction);
    setReplacementModeratorId("");
    setReason("");
    setFormError(null);
  };
  const closeAction = () => {
    setActiveTicket(null);
    setAction(null);
    setFormError(null);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!activeTicket || !action) return;
    if (action === "approve" && !replacementModeratorId) {
      setFormError("Chọn một Moderator thay thế trước khi duyệt.");
      return;
    }
    if (action === "reject" && reason.trim().length < 3) {
      setFormError("Nhập lý do từ chối ít nhất 3 ký tự.");
      return;
    }
    try {
      if (action === "approve") await onApprove(activeTicket, replacementModeratorId);
      else await onReject(activeTicket, reason.trim());
      closeAction();
    } catch (error) {
      setFormError(errorMessage(error));
    }
  };
  const excludedModeratorIds = new Set([
    activeTicket?.requestedById,
    ...(activeTicket?.schedule.assignments.filter(({ removedAt }) => removedAt === null).map(({ moderatorId }) => moderatorId) ?? []),
  ]);
  const replacementOptions = moderators.filter(({ id }) => !excludedModeratorIds.has(id));

  const toolbar = (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-xs leading-5 text-mod-text-secondary">Ticket mới được ưu tiên để Admin xử lý trước.</p>
      <Select value={status || "ALL"} onValueChange={(value) => onStatusChange(value === "ALL" ? "" : value as TicketStatusFilter)}>
        <SelectTrigger aria-label="Lọc trạng thái ticket" className="h-10 w-full border-mod-border bg-mod-canvas sm:w-52"><SelectValue /></SelectTrigger>
        <SelectContent>
          <SelectItem value="ALL">Tất cả trạng thái</SelectItem>
          <SelectItem value="PENDING">Chờ duyệt</SelectItem>
          <SelectItem value="APPROVED">Đã chuyển giao</SelectItem>
          <SelectItem value="REJECTED">Đã từ chối</SelectItem>
          <SelectItem value="CANCELLED">Moderator đã hủy</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div data-admin-notifications="true" className="flex flex-col gap-6 font-moderator">
      <DashboardHeader
        eyebrow="TRUNG TÂM ĐIỀU HÀNH"
        title="Thông báo & ticket"
        description="Duyệt ticket và phân công người thay thế mà không làm gián đoạn lịch phát hành."
      />
      <DashboardTableCard
        title="Ticket"
        description="Chỉ khi Admin duyệt và chọn nhân sự mới, nhiệm vụ mới được chuyển giao."
        summary={`${tickets.length} ticket`}
        toolbar={toolbar}
      >
        <DashboardDataTable
          embedded
          caption="Danh sách ticket từ Moderator"
          columns={["Người gửi", "Nhiệm vụ", "Hạn sản xuất", "Trạng thái", "Thao tác"]}
          columnWidths={["20%", "30%", "20%", "15%", "15%"]}
          minWidth={860}
        >
          {tickets.length ? tickets.map((ticketItem) => (
            <TableRow key={ticketItem.id} className="border-mod-border hover:bg-mod-canvas-accent/40">
              <TableCell className={dashboardTableCell}>
                <p className="font-semibold">{ticketItem.requestedBy.name}</p>
              </TableCell>
              <TableCell className={cn(dashboardTableCell, "font-semibold")}>{ticketItem.schedule.title}</TableCell>
              <TableCell className={cn(dashboardTableCell, "text-sm tabular-nums text-mod-text-secondary")}>
                {formatDateTime(ticketItem.schedule.productionDeadline)}
              </TableCell>
              <TableCell className={dashboardTableCell}>
                <CardBadge type="status" tone={cardBadgeToneForStatus(ticketItem.status)}>{statusCopy[ticketItem.status]}</CardBadge>
              </TableCell>
              <TableCell className={dashboardTableCell}>
                <DashboardRowActions label={ticketItem.schedule.title} actions={[{ id: "detail", label: "Xem chi tiết", icon: Eye, onSelect: () => openDetail(ticketItem) }]} />
              </TableCell>
            </TableRow>
          )) : (
            <DashboardEmptyTableRow columns={5}>Không có ticket phù hợp với bộ lọc hiện tại.</DashboardEmptyTableRow>
          )}
        </DashboardDataTable>
      </DashboardTableCard>

      <Dialog open={Boolean(activeTicket && !action)} onOpenChange={(open) => !open && closeDetail()}>
        <DialogContent className="max-w-2xl border-mod-border bg-mod-surface font-moderator text-mod-text">
          <DialogHeader>
            <DialogTitle>Chi tiết ticket</DialogTitle>
            <DialogDescription>Thông tin đầy đủ do Moderator gửi để Admin xem xét.</DialogDescription>
          </DialogHeader>
          {activeTicket ? (
            <div className="grid gap-4">
              <div className="flex items-start gap-3 rounded-[12px] bg-mod-canvas-accent px-4 py-3">
                <Ticket size={19} className="mt-0.5 shrink-0 text-mod-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-semibold">{activeTicket.schedule.title}</p>
                  <p className="mt-1 text-xs text-mod-text-secondary">Gửi lúc {formatDateTime(activeTicket.createdAt)}</p>
                </div>
                <CardBadge type="status" tone={cardBadgeToneForStatus(activeTicket.status)}>{statusCopy[activeTicket.status]}</CardBadge>
              </div>
              <dl className="grid gap-4 rounded-[12px] border border-mod-border p-4 text-sm sm:grid-cols-2">
                <div><dt className="text-xs font-medium text-mod-text-secondary">Người gửi</dt><dd className="mt-1 font-semibold">{activeTicket.requestedBy.name}</dd><dd className="mt-0.5 text-xs text-mod-text-secondary">{activeTicket.requestedBy.email}</dd></div>
                <div><dt className="text-xs font-medium text-mod-text-secondary">Podcast đang làm</dt><dd className="mt-1 font-semibold">{activeTicket.schedule.episode?.title ?? "Chưa liên kết podcast"}</dd>{activeTicket.schedule.episode ? <dd className="mt-0.5 text-xs text-mod-text-secondary">Bản {activeTicket.schedule.episode.contentRevision}</dd> : null}</div>
                <div><dt className="text-xs font-medium text-mod-text-secondary">Hạn sản xuất</dt><dd className="mt-1 font-semibold tabular-nums">{formatDateTime(activeTicket.schedule.productionDeadline)}</dd></div>
                <div><dt className="text-xs font-medium text-mod-text-secondary">Thời gian phát hành</dt><dd className="mt-1 font-semibold tabular-nums">{formatDateTime(activeTicket.schedule.scheduledAt)}</dd></div>
              </dl>
              <div className="rounded-[12px] border border-mod-border p-4">
                <p className="text-xs font-medium text-mod-text-secondary">Lý do</p>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{activeTicket.reason}</p>
              </div>
              {activeTicket.decisionReason ? (
                <div className="rounded-[12px] bg-[color-mix(in_srgb,var(--modDanger)_7%,var(--modSurface))] p-4">
                  <p className="text-xs font-medium text-mod-danger">Phản hồi của Admin</p>
                  <p className="mt-2 text-sm leading-6">{activeTicket.decisionReason}</p>
                </div>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeDetail}>Đóng</Button>
            {activeTicket?.status === "PENDING" ? (
              <>
                <Button type="button" variant="outline" disabled={busy} className="border-mod-danger/30 text-mod-danger hover:bg-mod-danger/5 hover:text-mod-danger" onClick={() => openAction(activeTicket, "reject")}><XCircle size={16} />Từ chối</Button>
                <Button type="button" disabled={busy} className="bg-mod-primary text-white hover:bg-mod-primary/90" onClick={() => openAction(activeTicket, "approve")}><CheckCircle size={16} />Duyệt ticket</Button>
              </>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={Boolean(activeTicket && action)} onOpenChange={(open) => !open && closeAction()}>
        <DialogContent className="border-mod-border bg-mod-surface font-moderator text-mod-text">
          <DialogHeader>
            <DialogTitle>{action === "approve" ? "Phân công người thay thế" : "Từ chối ticket"}</DialogTitle>
            <DialogDescription>
              {action === "approve"
                ? "Việc duyệt sẽ đóng phân công hiện tại và chuyển nhiệm vụ sang Moderator mới."
                : "Moderator sẽ nhận được lý do để chủ động xử lý bước tiếp theo."}
            </DialogDescription>
          </DialogHeader>
          {activeTicket ? (
            <div className="flex items-center gap-3 rounded-[12px] bg-mod-canvas-accent px-4 py-3 text-sm">
              <Ticket size={18} className="shrink-0 text-mod-primary" aria-hidden="true" />
              <div className="min-w-0"><p className="truncate font-semibold">{activeTicket.schedule.title}</p><p className="mt-0.5 text-xs text-mod-text-secondary">{activeTicket.requestedBy.name}</p></div>
              <ArrowRight size={16} className="ml-auto shrink-0 text-mod-text-muted" aria-hidden="true" />
            </div>
          ) : null}
          <form id="admin-ticket-action" onSubmit={submit} className="grid gap-4">
            {action === "approve" ? (
              <div className="grid gap-2">
                <Label htmlFor="replacement-moderator">Moderator thay thế</Label>
                <Select value={replacementModeratorId} onValueChange={setReplacementModeratorId}>
                  <SelectTrigger id="replacement-moderator" aria-label="Moderator thay thế" className="border-mod-border bg-mod-canvas"><SelectValue placeholder="Chọn nhân sự tiếp nhận" /></SelectTrigger>
                  <SelectContent>{replacementOptions.map((moderator) => <SelectItem key={moderator.id} value={moderator.id}>{moderator.name} · {moderator.email}</SelectItem>)}</SelectContent>
                </Select>
                {!replacementOptions.length ? <p className="text-xs text-mod-danger">Không có Moderator khác đang khả dụng.</p> : null}
              </div>
            ) : (
              <div className="grid gap-2">
                <Label htmlFor="ticket-rejection-reason">Lý do từ chối</Label>
                <Textarea id="ticket-rejection-reason" value={reason} onChange={(event) => setReason(event.target.value)} rows={4} className="resize-none border-mod-border bg-mod-canvas" placeholder="Nêu rõ lý do để Moderator biết cách xử lý" />
              </div>
            )}
            {formError ? <p role="alert" className="text-sm font-medium text-mod-danger">{formError}</p> : null}
          </form>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={closeAction}>Đóng</Button>
            <Button
              type="submit"
              form="admin-ticket-action"
              disabled={busy || (action === "approve" && !replacementOptions.length)}
              className={cn(action === "reject" ? "bg-mod-danger text-white hover:bg-mod-danger/90" : "bg-mod-primary text-white hover:bg-mod-primary/90")}
            >
              {action === "approve" ? "Duyệt & chuyển giao" : "Xác nhận từ chối"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function AdminNotifications() {
  const [status, setStatus] = useState<TicketStatusFilter>("PENDING");
  const state = useAdminTickets(status);
  if (state.tickets.isPending || state.moderators.isPending)
    return <div className="ui-skeleton min-h-[420px] rounded-[16px]" aria-label="Đang tải ticket" />;
  if (state.tickets.isError || state.moderators.isError)
    return <p role="alert" className="rounded-[16px] border border-mod-danger/25 bg-mod-surface p-6 text-sm text-mod-danger">Không tải được danh sách ticket. Vui lòng thử lại sau.</p>;
  return (
    <AdminNotificationsView
      tickets={state.tickets.data.items}
      moderators={state.moderators.data.items}
      status={status}
      busy={state.busy}
      onStatusChange={setStatus}
      onApprove={(ticketItem, replacementModeratorId) => state.approve.mutateAsync({ ticketId: ticketItem.id, replacementModeratorId })}
      onReject={(ticketItem, reason) => state.reject.mutateAsync({ ticketId: ticketItem.id, reason })}
    />
  );
}
