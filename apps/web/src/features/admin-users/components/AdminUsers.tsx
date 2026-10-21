import { useDeferredValue, useState } from "react";
import { AdminUsersView } from "./AdminUsersView";
import { AdminUserActionDialog, AdminUserDialog, type AdminUserFormValue } from "./AdminUserDialog";
import { useAdminUserActions, useAdminUsers } from "../hooks/useAdminUsers";
import type { AdminUserRecord, AdminUserRole } from "../services/adminUserService";
import { notify } from "@/shared/lib/notifications";

type PendingAction = { user: AdminUserRecord; action: "ban" | "unban" | "delete" } | null;

export function AdminUsers() {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search.trim());
  const [searchField, setSearchField] = useState<"name" | "email">("name");
  const [role, setRole] = useState<"" | AdminUserRole>("");
  const [formOpen, setFormOpen] = useState(false);
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
      <AdminUsersView users={query.data.items} page={query.data.page} limit={query.data.limit} total={query.data.total} search={search} searchField={searchField} role={role} busy={busy} onSearchChange={(value) => { setSearch(value); setPage(1); }} onSearchFieldChange={(value) => { setSearchField(value); setPage(1); }} onRoleChange={(value) => { setRole(value); setPage(1); }} onPageChange={setPage} onCreate={() => { setEditing(null); setFormOpen(true); }} onEdit={(user) => { setEditing(user); setFormOpen(true); }} onToggleBan={(user) => setPendingAction({ user, action: user.banned ? "unban" : "ban" })} onDelete={(user) => setPendingAction({ user, action: "delete" })} />
      <AdminUserDialog open={formOpen} user={editing} busy={busy} onOpenChange={setFormOpen} onSubmit={save} />
      <AdminUserActionDialog open={Boolean(pendingAction)} user={pendingAction?.user ?? null} action={pendingAction?.action ?? "ban"} busy={busy} onOpenChange={(open) => { if (!open) setPendingAction(null); }} onConfirm={confirmAction} />
    </>
  );
}
