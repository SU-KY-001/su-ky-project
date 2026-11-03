import { useState, type ReactElement } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import type { ExhibitionSummary } from "@repo/shared";
import { Plus } from "@phosphor-icons/react/dist/icons/Plus";
import { moderatorExhibitionPath } from "@/features/moderator/paths";
import { ModeratorListToolbar } from "@/features/moderator/components/ModeratorListToolbar";
import { DashboardHeader } from "@/shared/components/dashboard/DashboardOverview";
import { DashboardTableCard } from "@/shared/components/dashboard/DashboardTableCard";
import { DashboardDataTable, DashboardEmptyTableRow, dashboardTableCell } from "@/shared/components/dashboard/DashboardDataTable";
import { DashboardRowActions } from "@/shared/components/dashboard/DashboardRowActions";
import { DashboardPagination } from "@/shared/components/dashboard/DashboardPagination";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { TableCell, TableRow } from "@/shared/components/ui/table";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { ConfirmationDialog } from "@/shared/components/common/ConfirmationDialog";
import { useConfirmationDialog } from "@/shared/hooks/useConfirmationDialog";
import { notify } from "@/shared/lib/notifications";
import { exhibitionService } from "../services/exhibitionService";

export function ExhibitionList(): ReactElement {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { requestConfirmation, confirmation } = useConfirmationDialog();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<"all" | "published" | "unpublished">("all");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<ExhibitionSummary | null>(null);
  const query = useQuery({ queryKey: ["exhibitions", search, status, page], queryFn: () => exhibitionService.list(search, status, page) });
  const publish = useMutation({ mutationFn: (row: ExhibitionSummary) => exhibitionService.publish(row.id, row.revision), onSuccess: () => { setSelected(null); void queryClient.invalidateQueries({ queryKey: ["exhibitions"] }); notify.success({ title: "Đã công khai triển lãm" }); }, onError: error => notify.error({ title: "Không thể công khai", description: error.message }) });
  const confirmPublish = async (): Promise<void> => { if (!selected) return; if (await requestConfirmation({ title: "Công khai triển lãm?", description: `Bản đã lưu của “${selected.title}” sẽ được khách truy cập qua liên kết công khai.`, confirmLabel: "Công khai" })) publish.mutate(selected); };
  const create = (): void => { void navigate(moderatorExhibitionPath.create); };
  return <div className="flex min-w-0 flex-col gap-6 font-moderator">
    <DashboardHeader title="Triển lãm 3D" description="Tạo và quản lý những không gian kể chuyện lịch sử." />
    {query.isError ? <div role="alert" className="rounded-lg border border-mod-border bg-mod-surface p-6"><p>Không thể tải triển lãm: {query.error.message}</p><Button variant="outline" onClick={() => void query.refetch()}>Thử lại</Button></div> : <DashboardTableCard title="Triển lãm của bạn" description="Chọn một triển lãm để tiếp tục biên tập." summary={<Button onClick={create}><Plus />Tạo triển lãm</Button>} toolbar={<ModeratorListToolbar searchLabel="Tìm triển lãm" searchValue={search} onSearchChange={value => { setSearch(value); setPage(1); }} filters={[{ id: "exhibition-status", label: "Trạng thái", value: status, onValueChange: value => { if (value === "all" || value === "published" || value === "unpublished") setStatus(value); setPage(1); }, options: [{ value: "all", label: "Tất cả trạng thái" }, { value: "unpublished", label: "Bản nháp" }, { value: "published", label: "Đã công khai" }] }]} />} footer={<DashboardPagination page={page} limit={10} total={query.data?.total ?? 0} itemLabel="triển lãm" onPageChange={setPage} />}>
      <DashboardDataTable embedded caption="Danh sách triển lãm" columns={["Tên triển lãm", "Số chương", "Điểm trưng bày", "Trạng thái", "Cập nhật", "Thao tác"]}>
        {query.data?.items.map(row => <TableRow key={row.id}><TableCell className={dashboardTableCell}>{row.title}</TableCell><TableCell className={dashboardTableCell}>{row.chapterCount}</TableCell><TableCell className={dashboardTableCell}>{row.itemCount}</TableCell><TableCell className={dashboardTableCell}><CardBadge type="status" tone={row.publicationStatus === "PUBLISHED" ? "success" : "neutral"}>{row.publicationStatus === "PUBLISHED" ? "Đã công khai" : "Bản nháp"}</CardBadge></TableCell><TableCell className={dashboardTableCell}>{new Date(row.updatedAt).toLocaleDateString("vi-VN")}</TableCell><TableCell className={dashboardTableCell}><DashboardRowActions label={row.title} actions={[{ id: "detail", label: "Xem chi tiết", onSelect: () => setSelected(row) }]} /></TableCell></TableRow>)}
        {!query.data?.items.length && <DashboardEmptyTableRow columns={6}>{query.isPending ? "Đang tải triển lãm…" : "Chưa có triển lãm phù hợp."}</DashboardEmptyTableRow>}
      </DashboardDataTable>
    </DashboardTableCard>}
    <Dialog open={!!selected} onOpenChange={open => { if (!open) setSelected(null); }}><DialogContent className="border-mod-border bg-mod-surface font-moderator text-mod-text sm:max-w-xl"><DialogHeader><DialogTitle>{selected?.title}</DialogTitle><DialogDescription>Chi tiết triển lãm · {selected?.chapterCount} phòng · {selected?.itemCount} tranh</DialogDescription></DialogHeader>{selected?.publicationStatus === "PUBLISHED" && <a className="text-sm text-mod-primary underline" href={`/trien-lam/${encodeURIComponent(selected.slug)}`} target="_blank" rel="noreferrer">Mở triển lãm công khai</a>}<DialogFooter className="gap-2 border-t border-mod-border pt-4"><Button variant="outline" onClick={() => selected && navigate(moderatorExhibitionPath.preview(selected.id))}>Xem thử</Button><Button variant="outline" disabled={publish.isPending} onClick={() => void confirmPublish()}>Công khai</Button><Button onClick={() => selected && navigate(moderatorExhibitionPath.edit(selected.id))}>Chỉnh sửa</Button></DialogFooter></DialogContent></Dialog><ConfirmationDialog {...confirmation} />
  </div>;
}
