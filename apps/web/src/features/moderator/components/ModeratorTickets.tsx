import { useState, type FormEvent } from "react";
import type { ReleaseReassignmentTicket, ReleaseScheduleRecord } from "@repo/shared";
import { ArrowCounterClockwise, PencilSimple, Plus, Ticket } from "@phosphor-icons/react";
import { errorMessage } from "@/lib/apiError";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
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
import { useModeratorTickets } from "../hooks/useReleaseTickets";
import { useConfirmationDialog } from "@/shared/hooks/useConfirmationDialog";
import { ConfirmationDialog } from "@/shared/components/common/ConfirmationDialog";
import { notify } from "@/shared/lib/notifications";

const statusPresentation: Record<ReleaseReassignmentTicket["status"], { label: string; tone: "warning" | "success" | "danger" | "neutral" }> = {
  PENDING: { label: "Chờ Admin duyệt", tone: "warning" },
  APPROVED: { label: "Đã chuyển giao", tone: "success" },
  REJECTED: { label: "Đã từ chối", tone: "danger" },
  CANCELLED: { label: "Đã tự hủy", tone: "neutral" },
};

function formatDateTime(value: Date): string {
  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(value);
}

export function ModeratorTicketsView({
  tickets,
  assignments,
  busy,
  onCreate,
  onEdit,
  onCancel,
}: {
  tickets: ReleaseReassignmentTicket[];
  assignments: ReleaseScheduleRecord[];
  busy: boolean;
  onCreate: (scheduleId: string, reason: string) => Promise<unknown> | unknown;
  onEdit: (ticket: ReleaseReassignmentTicket, reason: string) => Promise<unknown> | unknown;
  onCancel: (ticket: ReleaseReassignmentTicket) => Promise<boolean> | boolean;
}) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<"create" | "detail" | "edit">("create");
  const [selectedTicket, setSelectedTicket] = useState<ReleaseReassignmentTicket | null>(null);
  const [scheduleId, setScheduleId] = useState("");
  const [reason, setReason] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const openCreate = () => {
    setDialogMode("create");
    setSelectedTicket(null);
    setScheduleId(assignments[0]?.id ?? "");
    setReason("");
    setFormError(null);
    setDialogOpen(true);
  };
  const openDetail = (ticketItem: ReleaseReassignmentTicket) => {
    setDialogMode("detail");
    setSelectedTicket(ticketItem);
    setScheduleId(ticketItem.scheduleId);
    setReason(ticketItem.reason);
    setFormError(null);
    setDialogOpen(true);
  };
  const startEditing = () => {
    if (!selectedTicket || selectedTicket.status !== "PENDING") return;
    setDialogMode("edit");
    setFormError(null);
  };
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!scheduleId || reason.trim().length < 10) {
      setFormError("Chọn nhiệm vụ và nhập lý do ít nhất 10 ký tự.");
      return;
    }
    try {
      if (dialogMode === "edit" && selectedTicket) {
        await onEdit(selectedTicket, reason.trim());
      }
      else await onCreate(scheduleId, reason.trim());
      setDialogOpen(false);
    } catch (error) {
      setFormError(errorMessage(error));
    }
  };

  return (
    <div className="flex flex-col gap-6 font-moderator">
      <DashboardHeader
        eyebrow="HỖ TRỢ TIẾN ĐỘ"
        title="Ticket"
        description="Báo sớm khi bạn không thể tiếp tục nhiệm vụ. Phân công chỉ thay đổi sau khi Admin duyệt."
        actions={<Button type="button" onClick={openCreate} disabled={busy || !assignments.length} className="bg-mod-primary text-white hover:bg-mod-primary/90"><Plus size={17} />Tạo ticket</Button>}
      />
      <DashboardTableCard
        title="Ticket đã gửi"
        description="Theo dõi quyết định của Admin và lý do phản hồi cho từng nhiệm vụ."
        summary={`${tickets.length} ticket`}
      >
        <DashboardDataTable
          embedded
          caption="Danh sách ticket"
          columns={["Nhiệm vụ", "Podcast nháp", "Mốc thời gian", "Lý do", "Trạng thái", "Thao tác"]}
          columnWidths={["18%", "16%", "18%", "24%", "14%", "10%"]}
          minWidth={1120}
        >
          {tickets.length ? tickets.map((ticketItem) => {
            const presentation = statusPresentation[ticketItem.status];
            return (
              <TableRow key={ticketItem.id} className="border-mod-border hover:bg-mod-canvas-accent/40">
                <TableCell className={cn(dashboardTableCell, "font-semibold")}>{ticketItem.schedule.title}</TableCell>
                <TableCell className={dashboardTableCell}>{ticketItem.schedule.episode?.title ?? "Chưa liên kết"}</TableCell>
                <TableCell className={cn(dashboardTableCell, "text-xs leading-5 text-mod-text-secondary")}>
                  <span className="block">Hạn: {formatDateTime(ticketItem.schedule.productionDeadline)}</span>
                  <span className="block">Phát hành: {formatDateTime(ticketItem.schedule.scheduledAt)}</span>
                </TableCell>
                <TableCell className={cn(dashboardTableCell, "max-w-[280px]")}>
                  <p className="line-clamp-3 text-sm leading-5">{ticketItem.reason}</p>
                  {ticketItem.decisionReason ? <p className="mt-2 text-xs font-medium text-mod-danger">Admin: {ticketItem.decisionReason}</p> : null}
                </TableCell>
                <TableCell className={dashboardTableCell}><CardBadge type="status" tone={presentation.tone}>{presentation.label}</CardBadge></TableCell>
                <TableCell className={dashboardTableCell}>
                  <DashboardRowActions
                    label={ticketItem.schedule.title}
                    disabled={busy}
                    actions={[
                      {
                        id: "detail",
                        label: "Xem chi tiết",
                        onSelect: () => openDetail(ticketItem),
                      },
                    ]}
                  />
                </TableCell>
              </TableRow>
            );
          }) : <DashboardEmptyTableRow columns={6}>Bạn chưa gửi ticket nào.</DashboardEmptyTableRow>}
        </DashboardDataTable>
      </DashboardTableCard>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="border-mod-border bg-mod-surface font-moderator text-mod-text">
          <DialogHeader>
            <DialogTitle>
              {dialogMode === "detail"
                ? "Chi tiết ticket"
                : dialogMode === "edit"
                  ? "Cập nhật ticket"
                  : "Báo không thể tiếp tục nhiệm vụ"}
            </DialogTitle>
            <DialogDescription>
              {dialogMode === "detail"
                ? "Theo dõi nội dung đã gửi và quyết định của Admin."
                : "Ghi rõ tình huống để Admin có đủ thông tin bố trí người thay thế."}
            </DialogDescription>
          </DialogHeader>
          {dialogMode === "detail" && selectedTicket ? (
            <>
              <div className="grid gap-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="font-semibold text-mod-text">{selectedTicket.schedule.title}</p>
                  <CardBadge
                    type="status"
                    tone={statusPresentation[selectedTicket.status].tone}
                  >
                    {statusPresentation[selectedTicket.status].label}
                  </CardBadge>
                </div>
                <dl className="grid gap-4 text-sm sm:grid-cols-2">
                  <div>
                    <dt className="text-mod-text-secondary">Podcast nháp</dt>
                    <dd className="mt-1 font-semibold text-mod-text">
                      {selectedTicket.schedule.episode?.title ?? "Chưa liên kết"}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-mod-text-secondary">Hạn sản xuất</dt>
                    <dd className="mt-1 font-semibold tabular-nums text-mod-text">
                      {formatDateTime(selectedTicket.schedule.productionDeadline)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-mod-text-secondary">Lịch phát hành</dt>
                    <dd className="mt-1 font-semibold tabular-nums text-mod-text">
                      {formatDateTime(selectedTicket.schedule.scheduledAt)}
                    </dd>
                  </div>
                </dl>
                <section className="border-t border-mod-border pt-4">
                  <h3 className="text-sm font-semibold text-mod-text">Lý do</h3>
                  <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-mod-text-secondary">
                    {selectedTicket.reason}
                  </p>
                </section>
                {selectedTicket.decisionReason ? (
                  <section className="rounded-lg bg-mod-danger/5 p-4">
                    <h3 className="text-sm font-semibold text-mod-danger">Phản hồi của Admin</h3>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-mod-text">
                      {selectedTicket.decisionReason}
                    </p>
                  </section>
                ) : null}
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                  Đóng
                </Button>
                {selectedTicket.status === "PENDING" ? (
                  <>
                    <Button type="button" variant="outline" disabled={busy} onClick={startEditing}>
                      <PencilSimple size={17} aria-hidden="true" />
                      Chỉnh sửa
                    </Button>
                    <Button
                      type="button"
                      variant="destructive"
                      disabled={busy}
                      onClick={async () => {
                        if (await onCancel(selectedTicket)) setDialogOpen(false);
                      }}
                    >
                      <ArrowCounterClockwise size={17} aria-hidden="true" />
                      Hủy ticket
                    </Button>
                  </>
                ) : null}
              </DialogFooter>
            </>
          ) : (
            <>
              <form id="moderator-ticket-form" onSubmit={submit} className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="ticket-schedule">Nhiệm vụ</Label>
                  <Select value={scheduleId} onValueChange={setScheduleId} disabled={dialogMode === "edit"}>
                    <SelectTrigger id="ticket-schedule" aria-label="Nhiệm vụ cần chuyển giao" className="border-mod-border bg-mod-canvas"><SelectValue placeholder="Chọn nhiệm vụ" /></SelectTrigger>
                    <SelectContent>{assignments.map((schedule) => <SelectItem key={schedule.id} value={schedule.id}>{schedule.title}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="ticket-reason">Lý do</Label>
                  <Textarea id="ticket-reason" aria-label="Lý do không thể thực hiện" value={reason} onChange={(event) => setReason(event.target.value)} rows={5} className="resize-none border-mod-border bg-mod-canvas" placeholder="Mô tả lý do và thời điểm bạn không thể tiếp tục" />
                </div>
                {formError ? <p role="alert" className="text-sm font-medium text-mod-danger">{formError}</p> : null}
              </form>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    if (dialogMode === "edit") setDialogMode("detail");
                    else setDialogOpen(false);
                  }}
                >
                  {dialogMode === "edit" ? "Quay lại" : "Đóng"}
                </Button>
                <Button type="submit" form="moderator-ticket-form" disabled={busy} className="bg-mod-primary text-white hover:bg-mod-primary/90"><Ticket size={17} />{dialogMode === "edit" ? "Lưu thay đổi" : "Gửi ticket"}</Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function ModeratorTickets() {
  const state = useModeratorTickets();
  const { requestConfirmation, confirmation } = useConfirmationDialog();
  if (state.tickets.isPending || state.assignments.isPending)
    return <div className="ui-skeleton min-h-[420px] rounded-xl" aria-label="Đang tải ticket" />;
  if (state.tickets.isError || state.assignments.isError)
    return <p role="alert" className="text-sm font-medium text-mod-danger">Không tải được danh sách ticket. Vui lòng thử lại.</p>;
  return (
    <><ModeratorTicketsView
      tickets={state.tickets.data.items}
      assignments={state.assignments.data.items}
      busy={state.busy}
      onCreate={(scheduleId, reason) => state.create.mutateAsync({ scheduleId, reason })}
      onEdit={(ticketItem, reason) => state.update.mutateAsync({ ticketId: ticketItem.id, reason })}
      onCancel={async (ticketItem) => {
        if (!await requestConfirmation({ title: "Hủy ticket?", description: `Ticket cho “${ticketItem.schedule.title}” sẽ được đóng. Phân công hiện tại vẫn giữ nguyên.`, confirmLabel: "Hủy ticket", destructive: true })) return false;
        try {
          await state.cancel.mutateAsync(ticketItem.id);
          notify.success({ title: "Đã hủy ticket" });
          return true;
        } catch (error) {
          notify.error({ title: "Không thể hủy ticket", description: errorMessage(error) });
          return false;
        }
      }}
    /><ConfirmationDialog {...confirmation} /></>
  );
}
