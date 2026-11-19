import { useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { AdminGrantMembershipSchema, AdminRevokeMembershipSchema, type AdminMember } from "@repo/shared";
import { isApiError } from "@/lib/apiError";
import { ConfirmationDialog } from "@/shared/components/common/ConfirmationDialog";
import { useConfirmationDialog } from "@/shared/hooks/useConfirmationDialog";
import { Button } from "@/shared/components/ui/button";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Textarea } from "@/shared/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { notify } from "@/shared/lib/notifications";
import { useAdminPlans } from "../hooks/useAdminPlans";
import { useChangeAdminMember } from "../hooks/useAdminMembers";

export function MemberEditor({ member, onClose }: { member: AdminMember; onClose: () => void }) {
  const [action, setAction] = useState<"grant" | "revoke">("grant");
  const plans = useAdminPlans();
  const monthly = plans.data?.find((plan) => plan.code === "monthly" && plan.isActive && plan.durationDays > 0);
  const change = useChangeAdminMember();
  const { confirmation, requestConfirmation } = useConfirmationDialog();
  const lastGrant = useRef<{ body: string; key: string } | undefined>(undefined);
  const form = useForm({
    defaultValues: { reason: "" },
  });
  const { errors, isSubmitting } = form.formState;
  const submit = (action: "grant" | "revoke") => form.handleSubmit(async ({ reason }) => {
    form.clearErrors();
    const parsed = action === "grant"
      ? AdminGrantMembershipSchema.safeParse({ planCode: monthly?.code, reason })
      : AdminRevokeMembershipSchema.safeParse({ reason });
    if (!parsed.success) {
      form.setError("reason", { message: action === "revoke" ? "Nhập lý do thu hồi từ 10 ký tự." : "Nhập lý do cấp Premium từ 3 ký tự." });
      return;
    }
    try {
      if (action === "grant") {
        if (!monthly) return;
        const body = { planCode: monthly.code, reason: parsed.data.reason };
        const signature = JSON.stringify(body);
        if (lastGrant.current?.body !== signature) lastGrant.current = { body: signature, key: crypto.randomUUID() };
        await change.mutateAsync({ action, userId: member.userId, body, idempotencyKey: lastGrant.current.key });
      } else {
        const confirmed = await requestConfirmation({
          title: "Xác nhận thu hồi Premium",
          description: `${member.name} (${member.email}) sẽ trở về Free và các kỳ Premium còn lại sẽ bị thu hồi.`,
          confirmLabel: "Thu hồi Premium",
          destructive: true,
        });
        if (!confirmed) return;
        await change.mutateAsync({ action, userId: member.userId, body: { reason } });
      }
      notify.success({ title: action === "grant" ? "Đã cấp Premium" : "Đã thu hồi Premium" });
      onClose();
    } catch (error) {
      if (isApiError(error)) {
        if (error.is("PLAN_NOT_PURCHASABLE")) {
          form.setError("reason", { message: "Gói tháng hiện không thể cấp." });
          return;
        }
        if (error.is("STACK_LIMIT_REACHED")) {
          form.setError("reason", { message: "Thời hạn sau khi cấp sẽ vượt giới hạn cộng dồn." });
          return;
        }
      }
      notify.error({ title: "Không cập nhật được thành viên", description: "Kiểm tra dữ liệu hiện tại và thử lại." });
    }
  });

  return (
    <>
      <Dialog open onOpenChange={(open) => { if (!open && !isSubmitting) onClose(); }}>
        <DialogContent variant="dashboard" className="flex max-h-[calc(100dvh-2rem)] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:p-0" showCloseButton={!isSubmitting}>
          <DialogHeader className="shrink-0 border-b border-mod-border px-5 py-5 sm:px-6">
            <DialogTitle>Chi tiết thành viên</DialogTitle>
            <DialogDescription>Thông tin tài khoản và quản lý quyền Premium.</DialogDescription>
          </DialogHeader>
          <div className="grid min-h-0 gap-6 overflow-y-auto p-5 sm:p-6">
          <section className="min-w-0">
          <h3 className="mb-4 text-base font-semibold">Thông tin thành viên</h3>
          <dl className="grid gap-x-8 gap-y-4 text-sm sm:grid-cols-2 [&_dt]:mb-1 [&_dt]:font-semibold [&_dt]:text-mod-text [&_dd]:font-normal [&_dd]:text-mod-text-secondary [&_dd]:wrap-anywhere">
            <div><dt>Tên tài khoản</dt><dd>{member.name}</dd></div>
            <div><dt>Email</dt><dd>{member.email}</dd></div>
            <div><dt>Trạng thái</dt><dd><CardBadge type="status" tone={member.status === "active" ? "success" : "neutral"}>{member.status === "active" ? "Premium" : "Free"}</CardBadge></dd></div>
            <div><dt>Gói thành viên</dt><dd>{member.planName ?? "—"}</dd></div>
            <div><dt>Nguồn cấp</dt><dd>{member.source === "admin" ? "Admin cấp" : member.source === "payment" ? "Thanh toán" : "—"}</dd></div>
            <div><dt>Ngày bắt đầu</dt><dd>{member.startsAt?.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) ?? "—"}</dd></div>
            <div><dt>Ngày hết hạn</dt><dd>{member.expiresAt?.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) ?? "—"}</dd></div>
            <div><dt>Thời điểm thu hồi</dt><dd>{member.revokedAt?.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" }) ?? "Chưa thu hồi"}</dd></div>
            {member.revokeReason ? <div className="sm:col-span-2"><dt>Lý do thu hồi</dt><dd>{member.revokeReason}</dd></div> : null}
          </dl>
          </section>
          <section className="grid min-w-0 gap-4 border-t border-mod-border pt-5" aria-label="Quản lý Premium">
            <h3 className="text-base font-semibold">Quản lý Premium</h3>
            <label className="grid gap-1.5 text-sm font-semibold">Thao tác
              <Select value={action} disabled={isSubmitting} onValueChange={(value) => {
                if (value === "grant" || value === "revoke") { setAction(value); form.clearErrors(); }
              }}>
                <SelectTrigger aria-label="Thao tác thành viên" className="w-full max-w-64"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="grant">Cấp Premium</SelectItem>
                  {member.status === "active" ? <SelectItem value="revoke">Thu hồi Premium</SelectItem> : null}
                </SelectContent>
              </Select>
            </label>
            {action === "grant" ? <p className="text-sm text-mod-text-secondary">{plans.isPending ? "Đang tải gói tháng…" : monthly ? `Cấp gói ${monthly.name} với thời hạn ${monthly.durationDays} ngày.` : "Gói tháng hiện chưa thể cấp."}</p> : null}
            {action === "grant" && plans.isError ? <Button type="button" variant="outline" onClick={() => void plans.refetch()}>Tải lại gói</Button> : null}
            <label className="grid gap-1.5 text-sm font-medium">
              Lý do
              <Textarea rows={4} maxLength={500} disabled={isSubmitting} aria-invalid={Boolean(errors.reason)} {...form.register("reason")} />
              {errors.reason ? <span role="alert" className="text-mod-danger">{errors.reason.message}</span> : null}
            </label>
          </section>
          </div>
            <DialogFooter className="shrink-0 border-t border-mod-border px-5 py-4 sm:px-6">
              <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>Quay lại</Button>
              <Button type="button" variant={action === "revoke" ? "destructive" : "default"} disabled={isSubmitting || (action === "grant" && !monthly)} onClick={submit(action)}>
                {change.isPending ? "Đang xử lý…" : action === "grant" ? "Cấp Premium" : "Tiếp tục thu hồi"}
              </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <ConfirmationDialog {...confirmation} />
    </>
  );
}
