import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Dialog } from "@/shared/components/ui/dialog";
import { historicalCatalogServer } from "@/test/historicalCatalogServer";
import { CreateHistoricalContentDialog } from "./CreateHistoricalContentDialog";
const originalFetch = globalThis.fetch;
let root: Root | undefined, client: QueryClient;
afterEach(() => {
  act(() => root?.unmount());
  client?.clear();
  globalThis.fetch = originalFetch;
  document.body.innerHTML = "";
});
async function settle(check: () => boolean) {
  const until = Date.now() + 3000;
  while (!check()) {
    if (Date.now() > until) throw new Error("Form did not settle");
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10));
    });
  }
}
it("keeps unsaved fields on stale write and loads the latest version for comparison", async () => {
  const server = historicalCatalogServer("owner"),
    period = server.periods[0]!;
  let saved = false;
  globalThis.fetch = Object.assign(
    async (input: URL | RequestInfo, init?: RequestInit) => {
      if (init?.method === "PATCH") {
        period.version = 2;
        period.name = "Tên do người khác sửa";
        return Response.json(
          { error_code: "STALE_WRITE", message: "Phiên bản đã thay đổi" },
          { status: 409 },
        );
      }
      return (
        (await server.respond(input, init)) ??
        Response.json(
          { error_code: "NOT_FOUND", message: "Not found" },
          { status: 404 },
        )
      );
    },
    { preconnect: originalFetch.preconnect },
  );
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root?.render(
      <QueryClientProvider client={client}>
        <Dialog open>
          <CreateHistoricalContentDialog
            edit={{ kind: "period", node: { ...period } }}
            onBack={() => {}}
            onSaved={() => {
              saved = true;
            }}
          />
        </Dialog>
      </QueryClientProvider>,
    ),
  );
  const name = document.querySelector<HTMLInputElement>(
    'input[aria-label="Tên nội dung"]',
  )!;
  await act(async () => {
    Object.getOwnPropertyDescriptor(
      HTMLInputElement.prototype,
      "value",
    )?.set?.call(name, "Tên đang soạn chưa lưu");
    name.dispatchEvent(new Event("input", { bubbles: true }));
    document
      .querySelector("form")
      ?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  });
  await settle(() => Boolean(document.querySelector('[role="alert"]')));
  expect(name.value).toBe("Tên đang soạn chưa lưu");
  expect(saved).toBe(false);
  const refresh = Array.from(
    document.querySelectorAll<HTMLButtonElement>("button"),
  ).find((b) => b.textContent?.includes("Tải phiên bản mới"));
  expect(Boolean(refresh)).toBe(true);
  await act(async () => refresh?.click());
  await settle(
    () =>
      document
        .querySelector('[role="alert"]')
        ?.textContent?.includes("Tên do người khác sửa") ?? false,
  );
  expect(name.value).toBe("Tên đang soạn chưa lưu");
  expect(saved).toBe(false);
});
