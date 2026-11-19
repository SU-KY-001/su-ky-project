import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { useState } from "react";
import { Controller, useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ExperiencePolicyInputSchema, type ExperiencePolicy } from "@repo/shared";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { TableCell, TableRow } from "@/shared/components/ui/table";
import { DashboardDataTable, DashboardEmptyTableRow, dashboardTableCell } from "@/shared/components/dashboard/DashboardDataTable";
import { DashboardRowActions } from "@/shared/components/dashboard/DashboardRowActions";
import { DashboardTableCard } from "@/shared/components/dashboard/DashboardTableCard";
import { notify } from "@/shared/lib/notifications";
import { useAdminPolicies, useSaveAdminPolicy } from "../hooks/useAdminPolicies";

const names = { podcast: "Nghe podcast", quiz: "Làm quiz", exhibition: "Tham quan triển lãm 3D" };
const modes = {
  free_limited: "Giới hạn lượt Free",
  free_unlimited: "Miễn phí không giới hạn",
  premium_only: "Chỉ Premium",
};
const columns = ["Tính năng", "Quyền của tài khoản Free", "Số lượt Free mỗi ngày", "Thao tác"];
const formSchema = z.object({
  mode: z.enum(["free_limited", "free_unlimited", "premium_only"]),
  dailyQuota: z.number().optional(),
});

export function AdminExperiencePolicies() {
  const policies = useAdminPolicies();
  const [selected, select] = useState<ExperiencePolicy | null>(null);
  return (
    <DashboardTableCard title="Cấu hình quyền sử dụng" description="Premium sử dụng không giới hạn. Lượt Free đặt lại lúc 00:00 giờ Việt Nam; cấu hình mới áp dụng từ lần bắt đầu tiếp theo.">
      <DashboardDataTable embedded caption="Chính sách truy cập tính năng" columns={columns} minWidth={720}>
        {policies.isPending ? <DashboardEmptyTableRow columns={columns.length}>Đang tải chính sách…</DashboardEmptyTableRow>
          : !policies.data ? <DashboardEmptyTableRow columns={columns.length}><p>Không tải được chính sách.</p><Button variant="outline" onClick={() => void policies.refetch()}>Thử lại</Button></DashboardEmptyTableRow>
          : policies.data.length ? policies.data.map((policy) => (
            <TableRow key={policy.feature}>
              <TableCell className={dashboardTableCell}>{names[policy.feature]}</TableCell>
              <TableCell className={dashboardTableCell}>{modes[policy.mode]}</TableCell>
              <TableCell className={dashboardTableCell}>{policy.dailyQuota === null ? "—" : `${policy.dailyQuota} lượt/ngày`}</TableCell>
              <TableCell className={dashboardTableCell}><DashboardRowActions label={names[policy.feature]} actions={[{ id: "edit", label: "Chỉnh sửa", onSelect: () => select(policy) }]} /></TableCell>
            </TableRow>
          )) : <DashboardEmptyTableRow columns={columns.length}>Chưa có chính sách truy cập.</DashboardEmptyTableRow>}
      </DashboardDataTable>
      {selected ? <PolicyEditor key={selected.feature} policy={selected} close={() => select(null)} /> : null}
    </DashboardTableCard>
  );
}

function PolicyEditor({ policy, close }: { policy: ExperiencePolicy; close: () => void }) {
  const save = useSaveAdminPolicy(policy.feature);
  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    shouldUnregister: true,
    defaultValues: { mode: policy.mode, dailyQuota: policy.dailyQuota ?? undefined },
  });
  const mode = form.watch("mode");
  const submit = form.handleSubmit(async ({ mode, dailyQuota }) => {
    const result = ExperiencePolicyInputSchema.safeParse({ mode, dailyQuota: mode === "free_limited" ? dailyQuota : null });
    if (!result.success) {
      form.setError("dailyQuota", { message: "Nhập số lượt mỗi ngày lớn hơn 0." });
      return;
    }
    try {
      await save.mutateAsync(result.data);
      notify.success({ title: "Đã cập nhật chính sách" });
      close();
    } catch {
      notify.error({ title: "Không lưu được chính sách", description: "Kiểm tra kết nối rồi thử lại." });
    }
  });
  return (
    <Dialog open onOpenChange={(open) => { if (!open && !save.isPending) close(); }}>
      <DialogContent variant="dashboard" className="font-moderator">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa quyền truy cập</DialogTitle>
          <DialogDescription>{names[policy.feature]} · Cấu hình cho tài khoản Free.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-4" onSubmit={submit} noValidate>
          <label className="grid gap-1 text-sm font-semibold">Quyền của tài khoản Free
            <Controller name="mode" control={form.control} render={({ field }) => (
              <Select disabled={save.isPending} value={field.value} onValueChange={field.onChange}>
                <SelectTrigger ref={field.ref} onBlur={field.onBlur} aria-label="Quyền của tài khoản Free"><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(modes).map(([value, label]) => <SelectItem key={value} value={value}>{label}</SelectItem>)}</SelectContent>
              </Select>
            )} />
          </label>
          {mode === "free_limited" ? <label className="grid gap-1 text-sm font-medium">Số lượt Free mỗi ngày
            <Input type="number" min={1} disabled={save.isPending} aria-invalid={Boolean(form.formState.errors.dailyQuota)} {...form.register("dailyQuota", { setValueAs: (value: string) => value ? Number(value) : undefined })} />
            {form.formState.errors.dailyQuota ? <span role="alert" className="text-mod-danger">{form.formState.errors.dailyQuota.message}</span> : null}
          </label> : null}
          <DialogFooter>
            <Button type="button" variant="outline" disabled={save.isPending} onClick={close}>Quay lại</Button>
            <Button type="submit" disabled={save.isPending}>{save.isPending ? "Đang lưu…" : "Lưu cấu hình"}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
