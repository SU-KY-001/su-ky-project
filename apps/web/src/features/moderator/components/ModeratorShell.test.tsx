import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { MemoryRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { currentUserQueryKey } from "@/shared/services/currentUserService";
import { ModeratorShell } from "./ModeratorShell";

let root: Root | undefined;
let client: QueryClient;

afterEach(() => {
  act(() => root?.unmount());
  client?.clear();
  document.body.innerHTML = "";
});

it("keeps the moderator logout action in the workspace sidebar", async () => {
  client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  client.setQueryData(currentUserQueryKey, {
    id: "moderator-1",
    name: "Điều hành Sử Ký",
    email: "moderator@example.org",
    emailVerified: true,
    role: "moderator",
  });
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);

  await act(async () => {
    root?.render(
      <MemoryRouter>
        <QueryClientProvider client={client}>
          <ModeratorShell nav={[]}><p>Nội dung</p></ModeratorShell>
        </QueryClientProvider>
      </MemoryRouter>,
    );
  });

  expect(host.querySelector('button[aria-label="Đăng xuất"]')).not.toBeNull();
});
