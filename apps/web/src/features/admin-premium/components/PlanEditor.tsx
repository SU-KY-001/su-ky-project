import { zodResolver } from "@hookform/resolvers/zod";
import { AdminPlanFormSchema, type AdminMembershipPlan, type AdminPlanForm, type AdminPlanPatch } from "@repo/shared";
import { Controller, useForm } from "react-hook-form";
import { isApiError } from "@/lib/apiError";
import { Button } from "@/shared/components/ui/button";
import { Checkbox } from "@/shared/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { notify } from "@/shared/lib/notifications";
import { useSaveAdminPlan } from "../hooks/useAdminPlans";

const fields = [
  { name: "name", label: "Tên gói", type: "text", maxLength: 100 },
  { name: "priceVnd", label: "Giá bán (đồng)", type: "number" },
  { name: "durationDays", label: "Thời hạn (ngày)", type: "number" },
] as const;

export function PlanEditor({ plan, onClose }: { plan: AdminMembershipPlan; onClose: () => void }) {
  const save = useSaveAdminPlan();
  const form = useForm<AdminPlanForm>({
    resolver: zodResolver(AdminPlanFormSchema),
    defaultValues: AdminPlanFormSchema.parse(plan),
  });
  const { errors, dirtyFields } = form.formState;

  const submit = form.handleSubmit(async (input) => {
    if (input.isPurchasable && (input.priceVnd <= 0 || input.durationDays <= 0)) {
      form.setError(input.priceVnd <= 0 ? "priceVnd" : "durationDays", { message: "Gói mở bán cần giá và thời hạn lớn hơn 0." });
      return;
    }
    const patch: AdminPlanPatch = {
      ...(dirtyFields.name && { name: input.name }),
      ...(dirtyFields.priceVnd && { priceVnd: input.priceVnd }),
      ...(dirtyFields.durationDays && { durationDays: input.durationDays }),
      ...(dirtyFields.isPurchasable && { isPurchasable: input.isPurchasable }),
      ...(input.isPurchasable && !plan.isActive && { isActive: true }),
    };
    try {
      await save.mutateAsync({ code: plan.code, patch });
      notify.success({ title: "Đã cập nhật gói" });
      onClose();
    } catch (error) {
      const description = isApiError(error) && error.is("PLAN_NOT_PURCHASABLE")
        ? "Kiểm tra giá và thời hạn trước khi mở bán."
        : "Kiểm tra kết nối và thử lại.";
      notify.error({ title: "Không lưu được gói", description });
    }
  });

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !save.isPending) onClose(); }}>
      <DialogContent variant="dashboard" className="max-h-[90dvh] max-w-lg overflow-y-auto font-moderator">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa gói tháng</DialogTitle>
          <DialogDescription>Giá và thời hạn được lưu vào mỗi đơn khi người dùng mua gói.</DialogDescription>
        </DialogHeader>
        <form className="grid gap-5" onSubmit={submit} noValidate>
          <fieldset disabled={save.isPending} className="grid gap-4 sm:grid-cols-2">
            {fields.map(({ name, label, type, ...constraints }) => (
              <label key={name} className="grid gap-1.5 text-sm font-medium">
                {label}
                <Input
                  type={type}
                  {...constraints}
                  min={type === "number" ? 0 : undefined}
                  aria-invalid={Boolean(errors[name])}
                  aria-describedby={errors[name] ? `plan-${name}-error` : undefined}
                  {...form.register(name, { valueAsNumber: type === "number" })}
                />
                {errors[name] ? <span id={`plan-${name}-error`} className="text-mod-danger">{errors[name]?.message}</span> : null}
              </label>
            ))}
            <label className="flex items-center gap-2 text-sm font-medium sm:col-span-2">
              <Controller
                name="isPurchasable"
                control={form.control}
                render={({ field }) => (
                  <Checkbox
                    name={field.name}
                    ref={field.ref}
                    checked={field.value}
                    onCheckedChange={(checked) => field.onChange(checked === true)}
                    onBlur={field.onBlur}
                    disabled={save.isPending}
                  />
                )}
              />
              Mở bán cho người dùng
            </label>
          </fieldset>
          <DialogFooter>
            <Button type="button" variant="outline" disabled={save.isPending} onClick={onClose}>Quay lại</Button>
            <Button type="submit" disabled={save.isPending || !form.formState.isDirty}>
              {save.isPending ? "Đang lưu…" : "Lưu gói"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
