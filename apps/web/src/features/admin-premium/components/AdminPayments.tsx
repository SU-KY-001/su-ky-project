import { useDeferredValue, useState } from "react";
import { Button } from "@/shared/components/ui/button";
import { DashboardFilterToolbar, DashboardSearchInput } from "@/shared/components/dashboard/DashboardFilterToolbar";
import { DatePicker } from "@/shared/components/ui/date-picker";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { TableCell, TableRow } from "@/shared/components/ui/table";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { DashboardDataTable, DashboardEmptyTableRow, dashboardTableCell } from "@/shared/components/dashboard/DashboardDataTable";
import { DashboardPagination } from "@/shared/components/dashboard/DashboardPagination";
import { DashboardRowActions } from "@/shared/components/dashboard/DashboardRowActions";
import { DashboardTableCard } from "@/shared/components/dashboard/DashboardTableCard";
import { useAdminPaymentList, type PaymentKind } from "../hooks/useAdminPayments";
import type { PaymentFilter } from "../services/adminPaymentService";
import { PaymentDetail } from "./PaymentDetail";
import { paymentDate, paymentLabels, paymentMoney, paymentReasons } from "./paymentPresentation";

const orderColumns = ["Mã đơn", "Người mua", "Gói", "Số tiền", "Trạng thái", "Ngày tạo", "Thao tác"];
const transactionColumns = ["Mã giao dịch", "Nội dung", "Số tiền", "Trạng thái", "Thời gian nhận", "Thao tác"];

export function AdminPayments({ kind }: { kind: PaymentKind }) {
  const isOrders = kind === "orders";
  const [filter, setFilter] = useState<PaymentFilter>({ q: "", status: "", from: "", to: "", page: 1, limit: 10 });
  const [selected, setSelected] = useState<{ kind: PaymentKind; id: string } | null>(null);
  const q = useDeferredValue(filter.q);
  const validDates = !filter.from || !filter.to || filter.from <= filter.to;
  const { orders, transactions } = useAdminPaymentList(kind, { ...filter, q: q.trim() }, validDates);
  const query = isOrders ? orders : transactions;
  const columns = isOrders ? orderColumns : transactionColumns;
  const title = isOrders ? "Danh sách đơn hàng" : "Danh sách giao dịch";
  const statuses = isOrders ? ["pending", "paid", "needs_review", "rejected"] : ["unmatched", "matched", "needs_review", "ignored"];
  const update = (patch: Partial<PaymentFilter>) => setFilter((previous) => ({ ...previous, ...patch, page: 1 }));

  return (
    <DashboardTableCard
      title={title}
      description={isOrders
        ? "Lọc đơn theo người mua, trạng thái hoặc ngày tạo để kiểm tra chi tiết thanh toán."
        : "Tra cứu tiền đã nhận và xem giao dịch nào đã khớp với đơn hàng."}
      summary={query.data ? `${query.data.total} ${isOrders ? "đơn" : "giao dịch"}` : undefined}
      toolbar={<DashboardFilterToolbar>
        <DashboardSearchInput label="Tìm kiếm" value={filter.q} maxLength={255} placeholder={isOrders ? "Mã đơn, tên hoặc email" : "Mã giao dịch, nội dung hoặc người mua"} onChange={({ target }) => update({ q: target.value })} />
        <label className="grid gap-1 text-sm font-medium">
          Trạng thái
          <Select value={filter.status || "all"} onValueChange={(status) => update({ status: status === "all" ? "" : status })}>
            <SelectTrigger aria-label="Trạng thái thanh toán" className="min-w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả</SelectItem>
              {statuses.map((status) => <SelectItem key={status} value={status}>{paymentLabels[status]}</SelectItem>)}
            </SelectContent>
          </Select>
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Từ ngày
          <DatePicker value={filter.from} onChange={(from) => update({ from })} ariaLabel="Thanh toán từ ngày" placeholder="Chọn từ ngày" clearable />
        </label>
        <label className="grid gap-1 text-sm font-medium">
          Đến ngày
          <DatePicker value={filter.to} onChange={(to) => update({ to })} ariaLabel="Thanh toán đến ngày" placeholder="Chọn đến ngày" clearable />
        </label>
      </DashboardFilterToolbar>}
      footer={query.data && <DashboardPagination
        page={query.data.page} limit={query.data.limit} total={query.data.total}
        itemLabel={isOrders ? "đơn" : "giao dịch"}
        onPageChange={(page) => setFilter((previous) => ({ ...previous, page }))}
      />}
    >
      {query.isError && query.data ? <Button variant="outline" onClick={() => void query.refetch()}>Tải lại dữ liệu</Button> : null}
      <DashboardDataTable embedded caption={title} columns={columns} minWidth={920}>
        {!validDates ? <DashboardEmptyTableRow columns={columns.length}>Ngày kết thúc phải từ ngày bắt đầu trở đi.</DashboardEmptyTableRow>
          : query.isPending ? <DashboardEmptyTableRow columns={columns.length}>Đang tải dữ liệu thanh toán…</DashboardEmptyTableRow>
          : !query.data ? <DashboardEmptyTableRow columns={columns.length}><p>Không tải được dữ liệu thanh toán.</p><Button variant="outline" onClick={() => void query.refetch()}>Thử lại</Button></DashboardEmptyTableRow>
          : !query.data.items.length ? <DashboardEmptyTableRow columns={columns.length}>Không có kết quả phù hợp.</DashboardEmptyTableRow>
          : isOrders ? orders.data?.items.map((row) => (
            <TableRow key={row.id}>
              <TableCell className={dashboardTableCell}>{row.transferContent.length > 16 ? `${row.transferContent.slice(0, 8)}…${row.transferContent.slice(-4)}` : row.transferContent}</TableCell>
              <TableCell className={dashboardTableCell}>{row.user.name}</TableCell>
              <TableCell className={dashboardTableCell}><CardBadge type="name" tone="info">{row.planName}</CardBadge></TableCell>
              <TableCell className={`${dashboardTableCell} text-right tabular-nums`}>{paymentMoney.format(row.priceVnd)}</TableCell>
              <TableCell className={dashboardTableCell}><PaymentBadge status={row.status} /></TableCell>
              <TableCell className={dashboardTableCell}>{paymentDate.format(row.createdAt)}</TableCell>
              <TableCell className={dashboardTableCell}><DashboardRowActions label={row.transferContent} actions={[{ id: "detail", label: "Xem chi tiết", onSelect: () => setSelected({ kind, id: row.id }) }]} /></TableCell>
            </TableRow>
          )) : transactions.data?.items.map((row) => (
            <TableRow key={row.id}>
              <TableCell className={dashboardTableCell}>{row.referenceCode ?? row.externalId}</TableCell>
              <TableCell className={dashboardTableCell}><div className="max-w-64 whitespace-normal wrap-anywhere">{row.content || "—"}</div></TableCell>
              <TableCell className={`${dashboardTableCell} text-right tabular-nums`}>{paymentMoney.format(row.amount)}</TableCell>
              <TableCell className={dashboardTableCell}>
                <PaymentBadge status={row.status} />
                {row.reason ? <div className="mt-1 text-xs text-mod-text-secondary">{paymentReasons[row.reason] ?? row.reason}</div> : null}
              </TableCell>
              <TableCell className={dashboardTableCell}>{paymentDate.format(row.transactionAt)}</TableCell>
              <TableCell className={dashboardTableCell}><DashboardRowActions label={row.referenceCode ?? row.externalId} actions={[{ id: "detail", label: "Xem chi tiết", onSelect: () => setSelected({ kind, id: row.id }) }]} /></TableCell>
            </TableRow>
          ))}
      </DashboardDataTable>
      {selected ? <PaymentDetail key={selected.id} {...selected} onOpen={setSelected} onClose={() => setSelected(null)} /> : null}
    </DashboardTableCard>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const tone = status === "paid" || status === "matched" ? "success" : status === "needs_review" ? "warning" : "neutral";
  return <CardBadge type="status" tone={tone}>{paymentLabels[status] ?? status}</CardBadge>;
}
