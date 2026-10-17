import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AdminUsersView } from "./AdminUsersView";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

it("groups row actions into one accessible menu", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () => {
    root?.render(
      <AdminUsersView
        users={[{
          id: "user-1",
          name: "Nguyễn Minh Anh",
          email: "minhanh@example.org",
          emailVerified: true,
          image: null,
          role: "moderator",
          banned: false,
          banReason: null,
          banExpires: null,
          createdAt: new Date("2026-10-10T08:00:00.000Z"),
          updatedAt: new Date("2026-10-11T08:00:00.000Z"),
        }]}
        page={1}
        limit={10}
        total={1}
        search=""
        searchField="name"
        role=""
        busy={false}
        onSearchChange={mock(() => undefined)}
        onSearchFieldChange={mock(() => undefined)}
        onRoleChange={mock(() => undefined)}
        onPageChange={mock(() => undefined)}
        onCreate={mock(() => undefined)}
        onEdit={mock(() => undefined)}
        onToggleBan={mock(() => undefined)}
        onDelete={mock(() => undefined)}
      />,
    );
  });

  expect(host.querySelector('[data-dashboard-table-card="true"]')).not.toBeNull();
  expect(host.textContent).toContain("Quản lý người dùng");
  expect(host.textContent).toContain("Tạo người dùng");
  expect(host.textContent).toContain("Nguyễn Minh Anh");
  expect(host.textContent).toContain("Moderator");
  expect(host.textContent).toContain("Đang hoạt động");
  expect(host.textContent).toContain("Thao tác");
  expect(host.querySelector('button[aria-label="Mở thao tác cho Nguyễn Minh Anh"]')).not.toBeNull();
  expect(host.querySelectorAll('button[aria-label*="Nguyễn Minh Anh"]')).toHaveLength(1);
  const actionTrigger = host.querySelector<HTMLButtonElement>('button[aria-label="Mở thao tác cho Nguyễn Minh Anh"]')!;
  await act(async () => {
    actionTrigger.focus();
    actionTrigger.dispatchEvent(new KeyboardEvent("keydown", { bubbles: true, key: "ArrowDown" }));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  expect(document.body.textContent).toContain("Chỉnh sửa");
  expect(document.body.textContent).toContain("Khóa tài khoản");
  expect(document.body.textContent).toContain("Xóa tài khoản");
  expect(host.querySelector('nav[aria-label="Phân trang"]')).not.toBeNull();
});
