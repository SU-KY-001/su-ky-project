import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { createMemoryRouter, RouterProvider } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MembershipDashboard } from "./MembershipDashboard";
import { membershipKeys } from "../hooks/useMembership";

let root: Root | undefined;
let cache: QueryClient;
afterEach(() => { act(() => root?.unmount()); cache?.clear(); document.body.innerHTML = ""; });
const pendingId = "11111111-1111-4111-8111-111111111111";
async function render(premium = false, pendingOrderId: string | null = null) {
  cache = new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } });
  cache.setQueryData(membershipKeys.entitlement, {
    tier: premium ? "premium" : "free", startsAt: new Date("2040-01-01"), expiresAt: new Date("2040-01-31"), daysLeft: 30,
    planCode: premium ? "monthly" : null, pendingOrderId, renewSoon: false, quota: null,
    experienceQuotas: ["podcast", "quiz", "exhibition"].map(feature => ({ feature, mode: "free_limited", enforced: true, limit: 4, usedToday: 1, remaining: 3, resetsAt: new Date("2040-01-02") })),
  });
  cache.setQueryData(membershipKeys.plans, [{ code: "monthly", name: "Gói tháng", benefits: "", priceVnd: 20000, durationDays: 30, isPurchasable: true, sortOrder: 1 }]);
  cache.setQueryData([...membershipKeys.orders, 1], { items: [], total: 0, page: 1, limit: 10 });
  cache.setQueryData(["membership", "reminder"], null);
  const host = document.createElement("div"); document.body.append(host); root = createRoot(host);
  const router = createMemoryRouter([
    { path: "/", element: <MembershipDashboard /> },
    { path: "/thanh-vien/payment/:id", element: <p>Đơn đang chờ</p> },
  ]);
  await act(async () => { root?.render(<QueryClientProvider client={cache}><RouterProvider router={router} /></QueryClientProvider>); });
  return { host, router };
}

it("shows the live Premium offer only for Free and uses remaining quota", async () => {
  const { host } = await render();
  expect(host.querySelector('[aria-label="Khám phá Premium"]')?.textContent).toContain("20.000");
  expect(host.querySelector('[aria-labelledby="membership-benefits"]')?.textContent).toContain("3lượt còn lại");
  expect(host.querySelector('[aria-labelledby="membership-benefits"]')?.textContent).toContain("Đã dùng 1 / 4 lượt");
  expect(host.textContent).toContain("Bạn chưa có giao dịch nào");
});

it("hides advertising and replaces quota usage with Premium privileges", async () => {
  const { host } = await render(true);
  expect(host.querySelector('[aria-label="Khám phá Premium"]')).toBeNull();
  expect(host.querySelector('[aria-label="Gói hiện tại"] button')?.textContent).toContain("Xem gói Premium của bạn");
  expect(host.querySelector('[aria-labelledby="membership-benefits"]')?.textContent).toContain("Đặc quyền Premium");
  expect(host.querySelectorAll('[aria-labelledby="membership-benefits"] [role="progressbar"]').length).toBe(0);
  expect(host.querySelector('[aria-labelledby="membership-benefits"]')?.textContent?.match(/Không giới hạn/g)?.length).toBe(3);
});

it("continues the existing pending order from the offer", async () => {
  const { host, router } = await render(false, pendingId);
  const button = host.querySelector<HTMLButtonElement>('[aria-label="Khám phá Premium"] button');
  expect(button?.textContent).toContain("Mua gói Premium");
  await act(async () => button?.click());
  expect(router.state.location.pathname).toBe(`/thanh-vien/payment/${pendingId}`);
});

it("tracks transaction statuses and pages through the URL", async () => {
  const { host, router } = await render();
  const order = { id: pendingId, planName: "Gói tháng", priceVnd: 20000, transferContent: "SUKY123", status: "paid", rejectionReason: null, createdAt: new Date("2026-01-01") };
  await act(async () => {
    cache.setQueryData([...membershipKeys.orders, 1], { items: [order], total: 11, page: 1, limit: 10 });
    cache.setQueryData([...membershipKeys.orders, 2], { items: [{ ...order, status: "rejected", rejectionReason: "Sai nội dung chuyển khoản" }], total: 11, page: 2, limit: 10 });
    await Bun.sleep(20);
  });
  expect(host.querySelector('#giao-dich [data-slot="card-badge"]')?.textContent).toBe("Đã thanh toán");
  expect(host.querySelector('#giao-dich [data-transaction-link]')?.getAttribute("href")).toBe(`/thanh-vien/payment/${pendingId}`);
  await act(async () => { host.querySelector<HTMLAnchorElement>('#giao-dich [aria-label="Trang 2"]')?.click(); await Bun.sleep(20); });
  expect(router.state.location.search).toBe("?transactionsPage=2");
  expect(host.querySelector('#giao-dich')?.textContent).toContain("Bị từ chối");
  expect(host.querySelector('#giao-dich')?.textContent).toContain("Sai nội dung chuyển khoản");
});
