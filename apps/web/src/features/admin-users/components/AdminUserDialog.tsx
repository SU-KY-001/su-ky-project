import { useEffect, useState, type FormEvent } from "react";
import type { AdminUserRecord, AdminUserRole } from "../services/adminUserService";
import { Button } from "@/shared/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/shared/components/ui/dialog";
import { Input } from "@/shared/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";

export interface AdminUserFormValue {
  name: string;
  email: string;
  password?: string;
  role: AdminUserRole;
}

function isRole(value: string): value is AdminUserRole {
  return value === "user" || value === "moderator" || value === "admin";
}

export function AdminUserDialog({ open, user, busy, onOpenChange, onSubmit }: {
  open: boolean;
  user: AdminUserRecord | null;
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (value: AdminUserFormValue) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<AdminUserRole>("user");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!open) return;
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setPassword("");
    setRole(user?.role ?? "user");
    setError("");
  }, [open, user]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const normalizedName = name.trim();
    const normalizedEmail = email.trim();
    if (!normalizedName || !normalizedEmail) return setError("Vui lòng nhập đầy đủ tên và email.");
    if (!user && password.length < 8) return setError("Mật khẩu phải có ít nhất 8 ký tự.");
    setError("");
    try {
      await onSubmit({ name: normalizedName, email: normalizedEmail, password: user ? undefined : password, role });
      onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Không thể lưu người dùng.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent className="max-w-[560px] border-mod-border bg-mod-surface font-moderator">
        <DialogHeader><DialogTitle>{user ? "Chỉnh sửa người dùng" : "Tạo người dùng"}</DialogTitle><DialogDescription>{user ? "Cập nhật thông tin và vai trò của tài khoản." : "Tạo tài khoản mới để cấp quyền truy cập hệ thống."}</DialogDescription></DialogHeader>
        <form className="grid gap-4" onSubmit={submit}>
          <label className="grid gap-1.5 text-sm font-semibold text-mod-text">Họ và tên<Input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" className="h-10 border-mod-border" /></label>
          <label className="grid gap-1.5 text-sm font-semibold text-mod-text">Email<Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" className="h-10 border-mod-border" /></label>
          {!user ? <label className="grid gap-1.5 text-sm font-semibold text-mod-text">Mật khẩu<Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" className="h-10 border-mod-border" /></label> : null}
          <label className="grid gap-1.5 text-sm font-semibold text-mod-text">Vai trò<Select value={role} onValueChange={(value) => { if (isRole(value)) setRole(value); }}><SelectTrigger className="h-10 border-mod-border"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="user">Người dùng</SelectItem><SelectItem value="moderator">Moderator</SelectItem><SelectItem value="admin">Admin</SelectItem></SelectContent></Select></label>
          {error ? <p role="alert" className="text-sm text-mod-danger">{error}</p> : null}
          <DialogFooter className="mt-2 border-t border-mod-border pt-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Hủy</Button><Button type="submit" disabled={busy} className="bg-mod-primary text-white hover:bg-mod-primary/90">{busy ? "Đang lưu..." : "Lưu thay đổi"}</Button></DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function AdminUserActionDialog({ open, user, action, busy, onOpenChange, onConfirm }: {
  open: boolean;
  user: AdminUserRecord | null;
  action: "ban" | "unban" | "delete";
  busy: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => Promise<void>;
}) {
  const [error, setError] = useState("");
  const title = action === "delete" ? "Xóa tài khoản" : action === "ban" ? "Khóa tài khoản" : "Mở khóa tài khoản";
  const description = action === "delete"
    ? "Tài khoản có dữ liệu lịch sử có thể không thể xóa. Trong trường hợp đó, hãy khóa tài khoản để bảo toàn dữ liệu vận hành."
    : action === "ban" ? "Người dùng sẽ không thể đăng nhập cho đến khi được mở khóa." : "Người dùng sẽ có thể đăng nhập lại ngay sau thao tác này.";
  async function confirm() {
    setError("");
    try { await onConfirm(); onOpenChange(false); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Không thể hoàn tất thao tác."); }
  }
  return (
    <Dialog open={open} onOpenChange={busy ? undefined : onOpenChange}>
      <DialogContent className="max-w-[500px] border-mod-border bg-mod-surface font-moderator">
        <DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{description}</DialogDescription></DialogHeader>
        <div className="rounded-lg border border-mod-border bg-mod-canvas p-3"><p className="font-semibold text-mod-text">{user?.name}</p><p className="mt-1 text-xs text-mod-text-secondary">{user?.email}</p></div>
        {error ? <p role="alert" className="text-sm text-mod-danger">{error}</p> : null}
        <DialogFooter className="border-t border-mod-border pt-4"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Hủy</Button><Button type="button" variant={action === "delete" ? "destructive" : "default"} onClick={confirm} disabled={busy} className={action === "delete" ? undefined : "bg-mod-primary text-white hover:bg-mod-primary/90"}>{busy ? "Đang xử lý..." : title}</Button></DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
