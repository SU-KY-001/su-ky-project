import { useState, type FormEvent } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/shared/components/ui/table";
import { notify } from "@/shared/lib/notifications";
import { errorMessage } from "@/lib/apiError";
import { adminService } from "./adminService";
import { State, SectionTitle } from "./AdminPrimitives";

export function UsersPanel() {
  const client = useQueryClient();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [status, setStatus] = useState("");
  const users = useQuery({
    queryKey: ["admin", "users", q, role, status],
    queryFn: () =>
      adminService.users({
        q,
        role: role || undefined,
        status: status || undefined,
      }),
  });
  const change = useMutation({
    mutationFn: async (input: {
      kind: "role" | "ban" | "unban";
      id: string;
      role?: "user" | "moderator" | "admin";
    }) =>
      input.kind === "role"
        ? adminService.updateUser(input.id, { role: input.role })
        : input.kind === "ban"
          ? adminService.banUser(input.id, "Khóa bởi Admin")
          : adminService.unbanUser(input.id),
    onSuccess: async () => {
      notify.success({ title: "Đã cập nhật tài khoản." });
      await client.invalidateQueries({ queryKey: ["admin"] });
    },
    onError: (error) =>
      notify.error({
        title: "Không thể cập nhật tài khoản.",
        description: errorMessage(error),
      }),
  });
  const create = useMutation({
    mutationFn: adminService.createUser,
    onSuccess: async () => {
      notify.success({ title: "Đã tạo tài khoản." });
      await client.invalidateQueries({ queryKey: ["admin", "users"] });
    },
    onError: (error) =>
      notify.error({
        title: "Không thể tạo tài khoản.",
        description: errorMessage(error),
      }),
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    create.mutate({
      name: String(data.get("name")),
      email: String(data.get("email")),
      password: String(data.get("password")),
      role: String(data.get("role")) as "user" | "moderator" | "admin",
    });
    event.currentTarget.reset();
  };
  return (
    <div className="space-y-5">
      <SectionTitle
        title="Quản lý tài khoản"
        description="Tạo tài khoản, đổi role và kiểm soát quyền đăng nhập."
      />
      <form
        onSubmit={submit}
        className="grid gap-3 rounded-xl border border-mod-border bg-mod-surface p-4 md:grid-cols-5"
      >
        <Input required name="name" placeholder="Tên hiển thị" />
        <Input required name="email" type="email" placeholder="Email" />
        <Input
          required
          name="password"
          type="password"
          minLength={8}
          placeholder="Mật khẩu ban đầu"
        />
        <select
          name="role"
          className="rounded-md border border-mod-border bg-white px-3 text-sm"
        >
          <option value="user">User</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </select>
        <Button disabled={create.isPending}>Tạo tài khoản</Button>
      </form>
      <div className="flex flex-wrap gap-3">
        <Input
          className="max-w-sm"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Tìm tên hoặc email"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="rounded-md border border-mod-border bg-white px-3 text-sm"
        >
          <option value="">Mọi role</option>
          <option value="user">User</option>
          <option value="moderator">Moderator</option>
          <option value="admin">Admin</option>
        </select>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="rounded-md border border-mod-border bg-white px-3 text-sm"
        >
          <option value="">Mọi trạng thái</option>
          <option value="active">Đang hoạt động</option>
          <option value="banned">Đã khóa</option>
        </select>
      </div>
      {users.isPending ? (
        <State>Đang tải tài khoản…</State>
      ) : users.error ? (
        <State>{users.error.message}</State>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-mod-border bg-mod-surface">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tài khoản</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Trạng thái</TableHead>
                <TableHead>XP</TableHead>
                <TableHead>Thao tác</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.data.items.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <strong>{user.name}</strong>
                    <span className="block text-xs text-mod-text-secondary">
                      {user.email}
                    </span>
                  </TableCell>
                  <TableCell>
                    <select
                      aria-label={`Role của ${user.name}`}
                      value={user.role}
                      onChange={(e) =>
                        change.mutate({
                          kind: "role",
                          id: user.id,
                          role: e.target.value as
                            | "user"
                            | "moderator"
                            | "admin",
                        })
                      }
                      className="rounded border border-mod-border bg-white px-2 py-1"
                    >
                      <option value="user">User</option>
                      <option value="moderator">Moderator</option>
                      <option value="admin">Admin</option>
                    </select>
                  </TableCell>
                  <TableCell>
                    {user.banned ? (
                      <span className="text-mod-danger">Đã khóa</span>
                    ) : (
                      <span className="text-mod-success">Hoạt động</span>
                    )}
                  </TableCell>
                  <TableCell>{user.totalXp}</TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() =>
                        change.mutate({
                          kind: user.banned ? "unban" : "ban",
                          id: user.id,
                        })
                      }
                    >
                      {user.banned ? "Mở khóa" : "Khóa"}
                    </Button>
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
