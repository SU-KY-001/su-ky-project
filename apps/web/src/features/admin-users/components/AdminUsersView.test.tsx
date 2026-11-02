import { afterEach, expect, it, mock } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { AdminUsersView } from "./AdminUsersView";

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});

it("opens the selected user directly from the shared detail button", async () => {
  const onDetail = mock((_user: { id: string }) => undefined);
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
        onDetail={onDetail}
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
  const detail = host.querySelector<HTMLButtonElement>('button[aria-label="Xem chi tiết Nguyễn Minh Anh"]');
  expect(detail).not.toBeNull();
  await act(async () => detail?.click());
  expect(onDetail).toHaveBeenCalledTimes(1);
  expect(onDetail.mock.calls[0]?.[0]?.id).toBe("user-1");
  expect(host.querySelector('nav[aria-label="Phân trang"]')).not.toBeNull();
});
