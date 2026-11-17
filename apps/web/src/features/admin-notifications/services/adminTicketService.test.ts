import { afterEach, expect, it } from "bun:test";
import { adminTicketService } from "./adminTicketService";

const originalFetch = globalThis.fetch;
afterEach(() => { globalThis.fetch = originalFetch; });

it("requests ten transfer records and forwards the selected page and status", async () => {
  let requested = "";
  const request = async (input: RequestInfo | URL): Promise<Response> => {
    requested = typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    return Response.json({ items: [], page: 3, limit: 10, total: 25 });
  };
  globalThis.fetch = Object.assign(request, { preconnect: originalFetch.preconnect });
  const result = await adminTicketService.list("PENDING", 3);
  const url = new URL(requested);
  expect(url.searchParams.get("page")).toBe("3");
  expect(url.searchParams.get("limit")).toBe("10");
  expect(url.searchParams.get("status")).toBe("PENDING");
  expect(result.total).toBe(25);
});
