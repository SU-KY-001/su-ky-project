import { afterAll, afterEach, beforeAll, describe, expect, it } from "bun:test";
import { testWindow } from "@/test/setup";
import { act } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { createMemoryRouter } from "react-router";
import { RouterProvider } from "react-router/dom";
import type { Root } from "react-dom/client";
import { currentUserQueryKey } from "@/shared/services/currentUserService";
import type { CurrentUser } from "@/shared/types/auth";
import { notify } from "@/shared/lib/notifications";

const originalFetch = globalThis.fetch;
let createRoot: typeof import("react-dom/client").createRoot;
let appRoutes: typeof import("@/app/router").appRoutes;
let browserRouter: typeof import("@/app/router").router;
let root: Root | undefined;
let client: QueryClient;
let router: ReturnType<typeof createMemoryRouter>;

beforeAll(async () => {
  ({ createRoot } = await import("react-dom/client"));
  ({ appRoutes, router: browserRouter } = await import("@/app/router"));
});

afterEach(async () => {
  act(() => { notify.dismiss(); });
  router?.dispose();
  act(() => { root?.unmount(); });
  client?.clear();
  globalThis.fetch = originalFetch;
  document.body.innerHTML = "";
});

afterAll(async () => {
  browserRouter?.dispose();
  await testWindow.happyDOM.abort();
});

async function mount(user: CurrentUser | null, entries: string[], cacheSession = true): Promise<void> {
  let serverUser = user;
  globalThis.fetch = Object.assign(async (input: URL | RequestInfo) => {
    if (String(input).endsWith("/api/auth/sign-out")) {
      serverUser = null;
      return Response.json({ success: true });
    }
    if (String(input).endsWith("/api/me")) {
      return serverUser ? Response.json({ user: serverUser, session: { expiresAt: "2026-12-01T00:00:00.000Z" } }) : Response.json({ error_code: "AUTH_REQUIRED", message: "No session" }, { status: 401 });
    }
    return Response.json({ error_code: "NOT_FOUND", message: "No test endpoint" }, { status: 404 });
  }, { preconnect: originalFetch.preconnect });
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  if (cacheSession) client.setQueryData(currentUserQueryKey, user);
  router = createMemoryRouter(appRoutes, { initialEntries: entries });
  const container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
  await act(async () => { root?.render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>); });
}

async function until(check: () => boolean): Promise<void> {
  const deadline = Date.now() + 3000;
  while (!check()) {
    if (Date.now() > deadline) throw new Error(`UI did not settle at ${router.state.location.pathname}: ${document.body.textContent?.slice(-500)}`);
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 10)); });
  }
}

function userFor(role: string): CurrentUser {
  return { id: `account-${role}`, name: `Tài khoản ${role}`, email: `${role}@example.com`, emailVerified: true, role };
}

describe("authentication route history", () => {
  const menu = (label: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('nav[aria-label="Điều hướng moderator"] button')).find((button) => button.textContent?.trim() === label);
  const action = (label: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('main button, [role="dialog"] button')).find((button) => button.textContent?.trim() === label);
  async function fill(label: string, value: string) {
    const field = document.querySelector<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement | HTMLButtonElement>(`[aria-label="${label}"]`);
    expect(Boolean(field)).toBe(true);
    if (field?.getAttribute("role") === "combobox") {
      await act(async () => { field.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true })); });
      await until(() => Boolean(document.querySelector('[role="listbox"]')));
      const option = Array.from(document.querySelectorAll<HTMLElement>('[role="option"]')).find((item) => item.dataset.value === value || item.textContent?.trim() === value);
      expect(Boolean(option)).toBe(true);
      await act(async () => { option?.click(); });
      return;
    }
    await act(async () => {
      if (!field) return;
      const prototype = field.tagName === "SELECT" ? HTMLSelectElement.prototype : field.tagName === "TEXTAREA" ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
      Object.getOwnPropertyDescriptor(prototype, "value")?.set?.call(field, value);
      field.dispatchEvent(new Event(field.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
    });
  }

  it("logs out from a directly loaded dashboard before the landing page is loaded", async () => {
    await mount(userFor("moderator"), ["/moderator", "/moderator"]);
    await until(() => Boolean(document.querySelector("h1")));
    const logout = document.querySelector<HTMLButtonElement>('button[aria-label="Đăng xuất"]');
    expect(Boolean(logout)).toBe(true);
    await act(async () => { logout?.click(); });
    await until(() => router.state.location.pathname === "/" && Boolean(document.querySelector('a[href="/login"]')));
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 30)); });
    expect(router.state.location.pathname).toBe("/");
    expect(document.body.textContent).toContain("Đã đăng xuất khỏi tài khoản.");
    expect(Boolean(document.querySelector('[role="dialog"]'))).toBe(false);
    await act(async () => { await router.navigate(-1); });
    await until(() => router.state.location.pathname === "/login");
    expect(Boolean(document.querySelector('[role="dialog"]'))).toBe(true);
  });

  it("creates history in a modal without replacing the table and shares the new event between menus", async () => {
    await mount(userFor("moderator"), ["/moderator"]);
    await until(() => Boolean(menu("Dòng lịch sử")));
    await act(async () => { menu("Dòng lịch sử")?.click(); });
    await until(() => document.querySelector("h1")?.textContent === "Dòng lịch sử");
    expect(Boolean(document.querySelector("main table thead"))).toBe(true);
    await act(async () => { action("Tạo nội dung")?.click(); });
    expect(document.querySelector("h1")?.textContent).toBe("Dòng lịch sử");
    expect(document.querySelector('[role="dialog"] h2')?.textContent).toBe("Tạo nội dung lịch sử");
    expect(Boolean(document.querySelector('main table'))).toBe(true);
    await fill("Loại nội dung", "event");
    await fill("Thời kỳ", "period-prehistory");
    await fill("Giai đoạn", "stage-prehistory");
    await fill("Tên nội dung", "Sự kiện kiểm tra bảng");
    await fill("Mốc thời gian", "12/10/2026");
    await fill("Mô tả", "Nội dung thuộc đúng giai đoạn được chọn.");
    await act(async () => { document.querySelector('[role="dialog"] form, main form')?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect(document.querySelector("h1")?.textContent).toBe("Dòng lịch sử");
    expect(document.querySelector("main table")?.textContent).toContain("Sự kiện kiểm tra bảng");
    expect(document.body.textContent).toContain("Đã tạo bản nháp sự kiện “Sự kiện kiểm tra bảng”.");
    expect(document.body.textContent).toContain("Bản nháp chỉ được lưu trong phiên dashboard hiện tại");
    await act(async () => { menu("Sự kiện")?.click(); });
    await until(() => document.querySelector("h1")?.textContent === "Sự kiện");
    expect(document.querySelector("main table")?.textContent).toContain("Sự kiện kiểm tra bảng");
    expect(router.state.location.pathname).toBe("/moderator");
  });

  it("reports a failed logout while retaining the signed-in account", async () => {
    await mount(userFor("moderator"), ["/moderator"]);
    await until(() => Boolean(document.querySelector('button[aria-label="Đăng xuất"]')));
    const backendFetch = globalThis.fetch;
    globalThis.fetch = Object.assign(async (input: URL | RequestInfo) => String(input).endsWith("/api/auth/sign-out")
      ? Response.json({ error_code: "SERVER_ERROR", message: "SQLSTATE internal server failure" }, { status: 503 })
      : backendFetch(input), { preconnect: originalFetch.preconnect });
    await act(async () => { document.querySelector<HTMLButtonElement>('button[aria-label="Đăng xuất"]')?.click(); });
    await until(() => Boolean(document.querySelector('[data-toast-status="error"]')));
    const notice = document.querySelector('[data-toast-status="error"]');
    expect(notice?.textContent).toContain("Chưa xác nhận được việc đăng xuất.");
    expect(notice?.textContent).toContain("Ứng dụng vẫn giữ trạng thái đăng nhập");
    expect(notice?.textContent).not.toContain("SQLSTATE");
    expect(client.getQueryData<CurrentUser | null>(currentUserQueryKey)).toEqual(userFor("moderator"));
    expect(router.state.location.pathname).toBe("/moderator");
  });

  it("opens real creation forms from overview shortcuts without a preview toast", async () => {
    await mount(userFor("moderator"), ["/moderator"]);
    await until(() => document.querySelector("h1")?.textContent?.includes("Tổng quan") ?? false);
    await act(async () => { action("Tạo nội dung")?.click(); });
    await until(() => Boolean(document.querySelector('[role="dialog"]')));
    expect(document.querySelector("h1")?.textContent).toBe("Dòng lịch sử");
    expect(Boolean(document.querySelector('[data-slot="toast"]'))).toBe(false);
    await act(async () => { action("Hủy")?.click(); });
    for (const [label, kind] of [["Tạo series", "Series"], ["Thêm tập podcast", "Tập podcast"]]) {
      await act(async () => { menu("Tổng quan")?.click(); });
      await until(() => document.querySelector("h1")?.textContent?.includes("Tổng quan") ?? false);
      const shortcut = document.querySelector<HTMLButtonElement>(`button[aria-label^="${label}."]`);
      await act(async () => { shortcut?.click(); });
      await until(() => document.querySelector("h1")?.textContent === "Tạo podcast");
      expect(document.querySelector('[aria-label="Loại podcast"]')?.textContent).toBe(kind);
      expect(Boolean(document.querySelector('[data-slot="toast"]'))).toBe(false);
    }
    expect(router.state.location.pathname).toBe("/moderator");
  });

  it("cancels the history modal and restores focus to its trigger", async () => {
    await mount(userFor("moderator"), ["/moderator"]);
    await until(() => Boolean(menu("Dòng lịch sử")));
    await act(async () => { menu("Dòng lịch sử")?.click(); });
    await until(() => document.querySelector("h1")?.textContent === "Dòng lịch sử");
    await act(async () => { action("Tạo nội dung")?.click(); });
    expect(Boolean(document.querySelector('[role="dialog"] form'))).toBe(true);
    await act(async () => { action("Hủy")?.click(); });
    expect(document.querySelector("h1")?.textContent).toBe("Dòng lịch sử");
    expect(Boolean(document.querySelector('[role="dialog"]'))).toBe(false);
    await until(() => document.activeElement === action("Tạo nội dung"));
    expect(document.activeElement === action("Tạo nội dung")).toBe(true);
    for (const label of ["Sự kiện", "Nguồn tư liệu", "Cần xử lý", "Lịch phát hành"]) {
      await act(async () => { menu(label)?.click(); });
      await until(() => document.querySelector("h1")?.textContent === label);
      expect(Boolean(document.querySelector("main table thead th[scope=col]"))).toBe(true);
    }
  });

  it("creates a period and its stage, then rejects an event without a selected parent", async () => {
    await mount(userFor("moderator"), ["/moderator"]);
    await until(() => Boolean(menu("Dòng lịch sử")));
    await act(async () => { menu("Dòng lịch sử")?.click(); });
    await until(() => document.querySelector("h1")?.textContent === "Dòng lịch sử");
    const submit = async () => { await act(async () => { document.querySelector('[role="dialog"] form, main form')?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); }); };
    await act(async () => { action("Tạo nội dung")?.click(); });
    await fill("Tên nội dung", "Thời kỳ mới");
    await fill("Mốc thời gian", "2000 – 2026");
    await fill("Mô tả", "Mô tả thời kỳ.");
    await submit();
    expect(document.querySelector("main table")?.textContent).toContain("Thời kỳ mới");
    await act(async () => { action("Tạo nội dung")?.click(); });
    await fill("Loại nội dung", "stage");
    await fill("Thời kỳ", "Thời kỳ mới");
    await fill("Tên nội dung", "Giai đoạn mới");
    await fill("Mốc thời gian", "2000 – 2010");
    await fill("Mô tả", "Mô tả giai đoạn.");
    await submit();
    expect(document.querySelector("main table")?.textContent).toContain("Giai đoạn mới");
    await act(async () => { action("Tạo nội dung")?.click(); });
    await fill("Loại nội dung", "event");
    await fill("Tên nội dung", "Sự kiện chưa chọn cha");
    await fill("Mốc thời gian", "2005");
    await fill("Mô tả", "Không được lưu khi thiếu cấp cha.");
    await submit();
    expect(document.querySelector('[role="alert"]')?.textContent).toContain("thời kỳ cha");
    expect(document.querySelector('[role="dialog"] h2')?.textContent).toBe("Tạo nội dung lịch sử");
    await fill("Thời kỳ", "Thời kỳ mới");
    await fill("Giai đoạn", "Giai đoạn mới");
    await fill("Thời kỳ", "period-prehistory");
    expect(document.querySelector('[aria-label="Giai đoạn"]')?.textContent).toContain("Chọn giai đoạn");
  });

  it("collapses historical branches inside the table and filters events", async () => {
    await mount(userFor("moderator"), ["/moderator"]);
    await until(() => Boolean(menu("Dòng lịch sử")));
    await act(async () => { menu("Dòng lịch sử")?.click(); });
    await until(() => document.querySelector("h1")?.textContent === "Dòng lịch sử");
    expect(Boolean(action("Tiền sử"))).toBe(false);
    await act(async () => { action("Tiền sử và Sơ sử")?.click(); });
    await act(async () => { action("Tiền sử")?.click(); });
    expect(Boolean(action("Hình thành văn hóa Đông Sơn"))).toBe(true);
    await act(async () => { action("Tiền sử và Sơ sử")?.click(); });
    expect(Boolean(action("Hình thành văn hóa Đông Sơn"))).toBe(false);
    await act(async () => { menu("Sự kiện")?.click(); });
    await until(() => document.querySelector("h1")?.textContent === "Sự kiện");
    await fill("Tìm kiếm sự kiện", "Đông Sơn");
    expect(document.querySelector("main table")?.textContent).toContain("Hình thành văn hóa Đông Sơn");
    expect(document.querySelector("main table")?.textContent).not.toContain("An Dương Vương xây thành Cổ Loa");
    await fill("Tìm kiếm sự kiện", "không có sự kiện này");
    expect(document.querySelector("main table")?.textContent).toContain("Không có sự kiện phù hợp");
  });

  it("toggles history from data cells without double activation or changing the parent row", async () => {
    await mount(userFor("moderator"), ["/moderator"]);
    await until(() => Boolean(menu("Dòng lịch sử")));
    await act(async () => { menu("Dòng lịch sử")?.click(); });
    await until(() => document.querySelector("h1")?.textContent === "Dòng lịch sử");
    const period = action("Tiền sử và Sơ sử");
    const row = period?.closest("tr");
    const parentText = row?.textContent;
    await act(async () => { row?.querySelector<HTMLTableCellElement>("td")?.click(); });
    expect(period?.getAttribute("aria-expanded")).toBe("true");
    expect(row?.textContent).toBe(parentText);
    expect(Boolean(action("Tiền sử"))).toBe(true);
    await act(async () => { period?.click(); });
    expect(period?.getAttribute("aria-expanded")).toBe("false");
    expect(Boolean(action("Tiền sử"))).toBe(false);
    await act(async () => { row?.querySelector<HTMLTableCellElement>("td:last-child")?.click(); });
    const stage = action("Tiền sử");
    await act(async () => { stage?.closest("tr")?.querySelector<HTMLTableCellElement>("td")?.click(); });
    const event = action("Hình thành văn hóa Đông Sơn");
    await act(async () => { event?.closest("tr")?.querySelector<HTMLTableCellElement>("td")?.click(); });
    expect(event?.getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector("h2")?.textContent).toBe("Hình thành văn hóa Đông Sơn");
    await act(async () => { event?.click(); });
    expect(event?.getAttribute("aria-expanded")).toBe("false");
    expect(Boolean(document.querySelector("h2"))).toBe(false);
  });

  it("creates a podcast series and inherits its historical event when creating an episode", async () => {
    await mount(userFor("moderator"), ["/moderator"]);
    await until(() => Boolean(menu("Sản xuất podcast")));
    await act(async () => { menu("Sản xuất podcast")?.click(); });
    await until(() => document.querySelector("h1")?.textContent === "Sản xuất podcast");
    await act(async () => { action("Tạo podcast")?.click(); });
    await fill("Tên podcast", "Series mới");
    await fill("Mô tả podcast", "Mô tả series mới.");
    await fill("Sự kiện lịch sử", "event-dong-son");
    await act(async () => { document.querySelector('[role="dialog"] form, main form')?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect(document.querySelector("main table")?.textContent).toContain("Series mới");
    await act(async () => { action("Tạo podcast")?.click(); });
    await fill("Loại podcast", "episode");
    await fill("Series", "Series mới");
    expect(document.querySelector('[aria-label="Sự kiện lịch sử"]')?.textContent).toContain("Hình thành văn hóa Đông Sơn");
    expect(document.querySelector<HTMLButtonElement>('[aria-label="Sự kiện lịch sử"]')?.disabled).toBe(true);
    await fill("Tên podcast", "Tập đầu tiên");
    await fill("Mô tả podcast", "Nội dung tập đầu tiên.");
    await fill("Kịch bản", "Kịch bản Đông Sơn.");
    await act(async () => { document.querySelector('[role="dialog"] form, main form')?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect(document.querySelector("main table")?.textContent).toContain("Tập đầu tiên");
    await act(async () => { action("Tập đầu tiên")?.click(); });
    expect(document.querySelector("main table")?.textContent).toContain("Kịch bản Đông Sơn.");
    await act(async () => { action("Series mới")?.click(); });
    expect(Boolean(action("Tập đầu tiên"))).toBe(false);
  });

  it("opens podcast branches and event details by clicking their data cells", async () => {
    await mount(userFor("moderator"), ["/moderator"]);
    await until(() => Boolean(menu("Sản xuất podcast")));
    await act(async () => { menu("Sản xuất podcast")?.click(); });
    await until(() => document.querySelector("h1")?.textContent === "Sản xuất podcast");
    const series = action("Bạch Đằng 938");
    await act(async () => { series?.closest("tr")?.querySelector<HTMLTableCellElement>("td")?.click(); });
    expect(series?.getAttribute("aria-expanded")).toBe("false");
    expect(Boolean(action("Trận thủy chiến mở đầu độc lập"))).toBe(false);
    await act(async () => { series?.click(); });
    const episode = action("Trận thủy chiến mở đầu độc lập");
    await act(async () => { episode?.closest("tr")?.querySelector<HTMLTableCellElement>("td")?.click(); });
    expect(episode?.getAttribute("aria-expanded")).toBe("true");
    await act(async () => { episode?.click(); });
    expect(episode?.getAttribute("aria-expanded")).toBe("false");
    await act(async () => { menu("Sự kiện")?.click(); });
    await until(() => document.querySelector("h1")?.textContent === "Sự kiện");
    const event = action("Hình thành văn hóa Đông Sơn");
    await act(async () => { event?.closest("tr")?.querySelector<HTMLTableCellElement>("td:last-child")?.click(); });
    expect(event?.getAttribute("aria-expanded")).toBe("true");
    expect(document.querySelector("h2")?.textContent).toBe("Hình thành văn hóa Đông Sơn");
  });

  it("creates podcast drafts on a page without publishing and retains them across menu switches", async () => {
    await mount(userFor("moderator"), ["/moderator"]);
    await until(() => Boolean(menu("Sản xuất podcast")));
    await act(async () => { menu("Sản xuất podcast")?.click(); });
    await until(() => document.querySelector("h1")?.textContent === "Sản xuất podcast");
    await act(async () => { action("Tạo podcast")?.click(); });
    expect(document.querySelector("h1")?.textContent).toBe("Tạo podcast");
    expect(Boolean(document.querySelector('[role="dialog"]'))).toBe(false);
    await fill("Loại podcast", "episode");
    await fill("Series", "series-0");
    await fill("Sự kiện lịch sử", "event-dong-son");
    await fill("Tên podcast", "Tập podcast bản nháp");
    await fill("Mô tả podcast", "Mô tả tập mới.");
    await act(async () => { document.querySelector('[role="dialog"] form, main form')?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })); });
    expect(document.querySelector("h1")?.textContent).toBe("Sản xuất podcast");
    expect(document.querySelector("main table")?.textContent).toContain("Tập podcast bản nháp");
    expect(document.querySelector("main table")?.textContent).toContain("Bản nháp");
    await act(async () => { menu("Dòng lịch sử")?.click(); });
    await until(() => document.querySelector("h1")?.textContent === "Dòng lịch sử");
    await act(async () => { menu("Sản xuất podcast")?.click(); });
    await until(() => document.querySelector("h1")?.textContent === "Sản xuất podcast");
    expect(document.querySelector("main table")?.textContent).toContain("Tập podcast bản nháp");
    expect(router.state.location.pathname).toBe("/moderator");
  });
  it("keeps the same landing page mounted when login opens and history closes it", async () => {
    await mount(null, ["/"]);
    await until(() => Boolean(document.getElementById("hero")));
    const hero = document.getElementById("hero");
    await act(async () => { await router.navigate("/login"); });
    expect(Boolean(document.querySelector('[role="dialog"]'))).toBe(true);
    expect(document.getElementById("hero") === hero).toBe(true);
    await act(async () => { await router.navigate(-1); });
    await until(() => router.state.location.pathname === "/" && !document.querySelector('[role="dialog"]'));
    expect(router.state.location.pathname).toBe("/");
    expect(Boolean(document.querySelector('[role="dialog"]'))).toBe(false);
    expect(document.getElementById("hero") === hero).toBe(true);
  });

  for (const [role, home] of [["user", "/"], ["moderator", "/moderator"], ["admin", "/admin"]]) {
    it(`redirects an authenticated ${role} away from login, including history navigation`, async () => {
      await mount(userFor(role), ["/login", home]);
      await until(() => document.body.textContent?.includes(`Tài khoản ${role}`) ?? false);
      await act(async () => { await router.navigate(-1); });
      await until(() => router.state.location.pathname === home);
      expect(Boolean(document.querySelector('[role="dialog"]'))).toBe(false);
      expect(Boolean(document.querySelector('a[href="/login"]'))).toBe(false);
    });
  }

  it("logs a user out from the header profile menu", async () => {
    await mount(userFor("user"), ["/"]);
    await until(() => Boolean(document.querySelector('[aria-label="Hồ sơ của Tài khoản user"]')));
    const trigger = document.querySelector('[aria-label="Hồ sơ của Tài khoản user"]');
    await act(async () => { trigger?.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true, button: 0, pointerType: "mouse" })); });
    await until(() => Boolean(document.querySelector('[role="menuitem"]')));
    expect(document.body.hasAttribute("data-scroll-locked")).toBe(false);
    const logout = Array.from(document.querySelectorAll('[role="menuitem"]')).find((item) => item.textContent?.includes("Đăng xuất"));
    expect(logout).toBeDefined();
    await act(async () => { logout?.dispatchEvent(new MouseEvent("click", { bubbles: true })); });
    await until(() => Boolean(document.querySelector('a[href="/login"]')));
    expect(client.getQueryData(currentUserQueryKey)).toBeNull();
    expect(Boolean(document.querySelector('[aria-label="Hồ sơ của Tài khoản user"]'))).toBe(false);
    expect(router.state.location.pathname).toBe("/");
  });

  for (const [role, home] of [["user", "/"], ["moderator", "/moderator"], ["admin", "/admin"]]) {
    it(`restores the ${role} session before deciding its homepage`, async () => {
      await mount(userFor(role), ["/"], false);
      await until(() => router.state.location.pathname === home && Boolean(client.getQueryData(currentUserQueryKey)) && Boolean(document.querySelector(home === "/" ? "#hero" : '[aria-label="Hồ sơ tài khoản"]')));
      expect(Boolean(document.getElementById("hero"))).toBe(home === "/");
    });
  }

  it("opens the moderator overview by default and changes menu content without changing its URL", async () => {
    await mount(userFor("moderator"), ["/moderator"]);
    await until(() => Boolean(document.querySelector("h1")));
    expect(document.querySelector("h1")?.textContent).toContain("Tổng quan");
    const menuButton = (label: string) => Array.from(document.querySelectorAll<HTMLButtonElement>('nav[aria-label="Điều hướng moderator"] button')).find((button) => button.textContent?.trim() === label);
    expect(menuButton("Tổng quan")?.getAttribute("aria-current")).toBe("page");
    await act(async () => { menuButton("Dòng lịch sử")?.click(); });
    await until(() => document.querySelector("h1")?.textContent === "Dòng lịch sử");
    expect(document.querySelector("h1")?.textContent).toBe("Dòng lịch sử");
    expect(menuButton("Dòng lịch sử")?.getAttribute("aria-current")).toBe("page");
    expect(menuButton("Tổng quan")?.getAttribute("aria-current")).toBeNull();
    expect(router.state.location.pathname).toBe("/moderator");
    const historyButton = (text: string) => Array.from(document.querySelectorAll<HTMLButtonElement>("main button")).find((button) => button.textContent?.includes(text));
    await act(async () => { historyButton("Tiền sử và Sơ sử")?.click(); });
    await act(async () => { action("Tiền sử")?.click(); });
    await act(async () => { historyButton("Hình thành văn hóa Đông Sơn")?.click(); });
    expect(document.querySelector("h2")?.textContent).toBe("Hình thành văn hóa Đông Sơn");
    expect(router.state.location.search).toBe("");
    await act(async () => { menuButton("Sản xuất podcast")?.click(); });
    await until(() => document.querySelector("h1")?.textContent === "Sản xuất podcast");
    expect(router.state.location.pathname).toBe("/moderator");
    await act(async () => { menuButton("Sự kiện")?.click(); });
    await until(() => document.querySelector("h1")?.textContent === "Sự kiện");
    const eventButton = Array.from(document.querySelectorAll<HTMLButtonElement>("main button")).find((button) => button.textContent?.includes("Hình thành văn hóa Đông Sơn"));
    await act(async () => { eventButton?.click(); });
    expect(document.querySelector("h2")?.textContent).toBe("Hình thành văn hóa Đông Sơn");
    expect(router.state.location.pathname).toBe("/moderator");
    expect(router.state.location.search).toBe("");
    for (const label of ["Nguồn tư liệu", "Cần xử lý", "Lịch phát hành"]) {
      await act(async () => { menuButton(label)?.click(); });
      await until(() => document.querySelector("h1")?.textContent === label);
      expect(router.state.location.pathname).toBe("/moderator");
      expect(router.state.location.search).toBe("");
    }
    await act(async () => { menuButton("Tổng quan")?.click(); });
    await until(() => document.querySelector("h1")?.textContent?.includes("Tổng quan") ?? false);
    expect(router.state.location.pathname).toBe("/moderator");
  });

  for (const [role, oldPath, home] of [["moderator", "/moderator/timeline", "/moderator"], ["admin", "/admin/users", "/admin"]]) {
    it(`canonicalizes old ${role} menu URLs to the dashboard root`, async () => {
      await mount(userFor(role), [oldPath]);
      await until(() => router.state.location.pathname === home);
      expect(router.state.location.search).toBe("");
      expect(document.querySelector('[aria-label="Hồ sơ tài khoản"]') !== null).toBe(true);
    });
  }

  for (const [role, home] of [["moderator", "/moderator"], ["admin", "/admin"]]) {
    it(`redirects ${role} homepage visits to its dashboard and blocks it after logout`, async () => {
      await mount(userFor(role), [home, home]);
      await until(() => document.body.textContent?.includes(`Tài khoản ${role}`) ?? false);
      expect(document.body.textContent?.includes("Mở trang Sử Ký")).toBe(false);
      await act(async () => { await router.navigate("/"); });
      await until(() => router.state.location.pathname === home);
      expect(Boolean(document.getElementById("hero"))).toBe(false);
      expect(Boolean(document.querySelector('a[href="/login"]'))).toBe(false);
      await until(() => router.state.location.pathname === home && Array.from(document.querySelectorAll("button")).some((button) => button.textContent?.includes("Đăng xuất")));
      const logoutButton = Array.from(document.querySelectorAll("button")).find((button) => button.textContent?.includes("Đăng xuất"));
      expect(logoutButton).toBeDefined();
      await act(async () => { logoutButton?.click(); });
      await until(() => router.state.location.pathname === "/");
      expect(Boolean(document.querySelector('a[href="/login"]'))).toBe(true);
      await act(async () => { await router.navigate(-1); });
      await until(() => router.state.location.pathname === "/login");
      expect(Boolean(document.querySelector('[role="dialog"]'))).toBe(true);
      expect(Boolean(document.querySelector('[aria-label="Hồ sơ tài khoản"]'))).toBe(false);
    });
  }
});

