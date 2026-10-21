import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { currentUserQueryKey } from "@/shared/services/currentUserService";
import { ModeratorWorkspacePage } from "./ModeratorWorkspacePage";

let root: Root | undefined;
let client: QueryClient;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  client?.clear();
  document.body.innerHTML = "";
});

it("keeps assignments, tickets and release schedule as distinct workspace screens", async () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(currentUserQueryKey, {
    id: "moderator-1",
    name: "Điều hành Sử Ký",
    email: "moderator@example.org",
    emailVerified: true,
    role: "moderator",
  });
  client.setQueryData(["moderator-release-assignments"], { items: [] });
  client.setQueryData(["moderator-assignable-episodes"], { items: [] });
  client.setQueryData(["moderator-release-reminders"], { items: [] });
  client.setQueryData(["moderator-release-tickets", "list"], { items: [], total: 0, page: 1, limit: 20 });
  client.setQueryData(["moderator-release-tickets", "assignments"], { items: [] });
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  await act(async () => {
    root?.render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <ModeratorWorkspacePage />
        </QueryClientProvider>
      </MemoryRouter>,
    );
  });

  const scheduleLink = host.querySelector('a[href="#moderator-schedule"]') as HTMLAnchorElement;
  await act(async () => scheduleLink.click());
  expect(host.textContent).toContain("Lịch phát hành");
  expect(host.textContent).toContain("Thời khóa biểu");

  const assignmentLink = host.querySelector('a[href="#moderator-assignments"]') as HTMLAnchorElement;
  await act(async () => assignmentLink.click());
  expect(host.textContent).toContain("Nhiệm vụ của tôi");

  const ticketLink = host.querySelector('a[href="#moderator-tickets"]') as HTMLAnchorElement;
  await act(async () => ticketLink.click());
  expect(host.textContent).toContain("Ticket");
  expect(host.textContent).toContain("Bạn chưa gửi ticket nào");
});
