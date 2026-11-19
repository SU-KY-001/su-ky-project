import { useDeferredValue, useState } from "react";
import { AdminUsersView } from "./AdminUsersView";
import { AdminUserActionDialog, AdminUserDialog, type AdminUserFormValue } from "./AdminUserDialog";
import { useAdminUserActions, useAdminUsers } from "../hooks/useAdminUsers";
import type { AdminUserRecord, AdminUserRole } from "../services/adminUserService";
import { Button } from "@/shared/components/ui/button";
import { CardBadge } from "@/shared/components/dashboard/CardBadge";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { notify } from "@/shared/lib/notifications";

type PendingAction = { user: AdminUserRecord; action: "ban" | "unban" | "delete" } | null;

export function AdminUsers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [searchField, setSearchField] = useState<"name" | "email">("name");
  const [role, setRole] = useState<"" | AdminUserRole>("");
  const [formOpen, setFormOpen] = useState(false);
  const [selected, setSelected] = useState<AdminUserRecord | null>(null);
  const [editing, setEditing] = useState<AdminUserRecord | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingAction>(null);
  const limit = 10;
  const query = useAdminUsers({ page, limit, searchValue: deferredSearch || undefined, searchField, role: role || undefined });
  const actions = useAdminUserActions();
  const busy = actions.create.isPending || actions.update.isPending || actions.ban.isPending || actions.unban.isPending || actions.remove.isPending;

  async function save(value: AdminUserFormValue) {
    if (editing) {
      await actions.update.mutateAsync({ id: editing.id, name: value.name, email: value.email, role: value.role, previousRole: editing.role });
      notify.success({ title: "Đã cập nhật người dùng", description: value.name });
      return;
    }
    await actions.create.mutateAsync({ name: value.name, email: value.email, password: value.password ?? "", role: value.role });
    notify.success({ title: "Đã tạo người dùng", description: value.name });
  }

  async function confirmAction() {
    if (!pendingAction) return;
    if (pendingAction.action === "ban") await actions.ban.mutateAsync({ id: pendingAction.user.id, reason: "Tạm khóa bởi quản trị viên" });
    else if (pendingAction.action === "unban") await actions.unban.mutateAsync(pendingAction.user.id);
    else await actions.remove.mutateAsync(pendingAction.user.id);
    const title = pendingAction.action === "delete" ? "Đã xóa tài khoản" : pendingAction.action === "ban" ? "Đã khóa tài khoản" : "Đã mở khóa tài khoản";
    notify.success({ title, description: pendingAction.user.name });
  }

  if (query.isPending) return <div className="ui-skeleton min-h-[520px] rounded-[16px]" aria-label="Đang tải người dùng" />;
  if (query.isError) return <div role="alert" className="rounded-[16px] border border-mod-danger/25 bg-mod-surface p-6"><h1 className="font-bold text-mod-text">Không tải được danh sách người dùng</h1><p className="mt-2 text-sm text-mod-text-secondary">{query.error.message}</p></div>;

  return (
    <>
      <AdminUsersView users={query.data.items} page={query.data.page} limit={query.data.limit} total={query.data.total} search={search} searchField={searchField} role={role} busy={busy} onSearchChange={(value) => { setSearch(value); setPage(1); }} onSearchFieldChange={(value) => { setSearchField(value); setPage(1); }} onRoleChange={(value) => { setRole(value); setPage(1); }} onPageChange={setPage} onCreate={() => { setEditing(null); setFormOpen(true); }} onDetail={setSelected} />
      <Dialog open={Boolean(selected)} onOpenChange={(open) => { if (!open) setSelected(null); }}>
        <DialogContent className="max-h-[calc(100dvh-2rem)] max-w-[560px] gap-0 overflow-y-auto border-mod-border bg-mod-surface p-0 font-moderator sm:p-0">
          <div className="h-20 border-b border-mod-primary/20 bg-mod-primary/15" aria-hidden="true" />
          {selected ? <div className="px-5 pb-5 sm:px-7 sm:pb-7">
            <div className="relative -mt-10 grid size-20 place-items-center overflow-hidden rounded-full border-4 border-mod-surface bg-mod-primary/10 text-2xl font-bold text-mod-primary">
              <span aria-hidden="true">{selected.name.trim().charAt(0).toLocaleUpperCase("vi-VN") || "?"}</span>
              {selected.image ? <img src={selected.image} alt="" className="absolute inset-0 size-full object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} /> : null}
            </div>
            <DialogHeader className="mt-4 pr-0">
              <DialogTitle className="break-words text-xl text-mod-text">{selected.name}</DialogTitle>
              <DialogDescription className="break-all text-mod-text-secondary">{selected.email}</DialogDescription>
              <span className="sr-only">Chi tiết người dùng</span>
            </DialogHeader>
            <dl className="mt-6 border-t border-mod-border text-sm">
              <div className="grid gap-2 border-b border-mod-border py-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
                <dt className="font-semibold text-mod-text-secondary">Họ và tên</dt><dd className="min-w-0 break-words font-medium text-mod-text">{selected.name}</dd>
              </div>
              <div className="grid gap-2 border-b border-mod-border py-4 sm:grid-cols-[150px_minmax(0,1fr)] sm:items-center">
                <dt className="font-semibold text-mod-text-secondary">Email</dt><dd className="min-w-0 break-all text-mod-text">{selected.email}</dd>
              </div>
              <div className="grid gap-4 border-b border-mod-border py-4 sm:grid-cols-2 sm:gap-6">
                <div className="grid content-start gap-2">
                  <dt className="font-semibold text-mod-text-secondary">Vai trò</dt><dd><CardBadge type="name">{selected.role === "user" ? "Người dùng" : selected.role === "moderator" ? "Moderator" : "Admin"}</CardBadge></dd>
                </div>
                <div className="grid content-start gap-2">
                  <dt className="font-semibold text-mod-text-secondary">Trạng thái</dt><dd><CardBadge type="status" tone={selected.banned ? "danger" : "success"}>{selected.banned ? "Đã khóa" : "Đang hoạt động"}</CardBadge></dd>
                </div>
              </div>
            </dl>
            <DialogFooter className="mt-5 justify-between gap-3">
              <Button type="button" variant="outline" disabled={busy} className="border-mod-danger/25 bg-mod-danger/5 text-mod-danger hover:bg-mod-danger/10 hover:text-mod-danger" onClick={() => { setPendingAction({ user: selected, action: "delete" }); setSelected(null); }}>Xóa tài khoản</Button>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" disabled={busy} onClick={() => { setPendingAction({ user: selected, action: selected.banned ? "unban" : "ban" }); setSelected(null); }}>{selected.banned ? "Mở khóa" : "Khóa tài khoản"}</Button>
                <Button type="button" disabled={busy} className="bg-mod-primary text-white hover:bg-mod-primary/90" onClick={() => { setEditing(selected); setSelected(null); setFormOpen(true); }}>Chỉnh sửa</Button>
              </div>
            </DialogFooter>
          </div> : null}
        </DialogContent>
      </Dialog>
      <AdminUserDialog open={formOpen} user={editing} busy={busy} onOpenChange={setFormOpen} onSubmit={save} />
      <AdminUserActionDialog open={Boolean(pendingAction)} user={pendingAction?.user ?? null} action={pendingAction?.action ?? "ban"} busy={busy} onOpenChange={(open) => { if (!open) setPendingAction(null); }} onConfirm={confirmAction} />
    </>
  );
}
