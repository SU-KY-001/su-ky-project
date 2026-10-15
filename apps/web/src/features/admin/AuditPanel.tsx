import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/shared/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { adminService } from "./adminService";
import { State, SectionTitle } from "./AdminPrimitives";

export function AuditPanel() {
  const [action, setAction] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const audit = useQuery({
    queryKey: ["admin", "audit", action, from, to],
    queryFn: () =>
      adminService.audit({
        action,
        from: from || undefined,
        to: to ? `${to}T23:59:59.999Z` : undefined,
      }),
  });
  return (
    <div className="space-y-5">
      <SectionTitle
        title="Nhật ký quản trị"
        description="Lịch sử thao tác của Admin và Moderator; dữ liệu chỉ đọc."
      />
      <div className="flex flex-wrap gap-3">
        <Input
          className="max-w-xs"
          value={action}
          onChange={(e) => setAction(e.target.value)}
          placeholder="Lọc theo hành động"
        />
        <Input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
        />
        <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
      </div>
      {audit.isPending ? (
        <State>Đang tải nhật ký…</State>
      ) : audit.error ? (
        <State>{audit.error.message}</State>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-mod-border bg-mod-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Thời gian</TableHead>
                <TableHead>Người thực hiện</TableHead>
                <TableHead>Hành động</TableHead>
                <TableHead>Đối tượng</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {audit.data.items.map((item) => (
                <TableRow key={item.id}>
                  <TableCell>
                    {item.createdAt.toLocaleString("vi-VN")}
                  </TableCell>
                  <TableCell>
                    {item.actor?.name ?? "Hệ thống"}
                    <span className="block text-xs text-mod-text-secondary">
                      {item.actor?.email}
                    </span>
                  </TableCell>
                  <TableCell className="font-medium">{item.action}</TableCell>
                  <TableCell>
                    {item.resourceType}
                    <span className="block max-w-52 truncate text-xs text-mod-text-secondary">
                      {item.resourceId}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
