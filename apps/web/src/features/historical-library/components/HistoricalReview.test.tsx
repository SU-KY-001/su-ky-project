import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { CatalogSourceSchema } from "@repo/shared";
import { currentUserQueryKey } from "@/shared/services/currentUserService";
import { SourceVerification } from "./HistoricalSourceFields";
let root: Root | undefined;
let client: QueryClient;
afterEach(() => {
  act(() => root?.unmount());
  client?.clear();
  document.body.innerHTML = "";
});
it("does not grant self-verification or infer verification from primary-source tier", async () => {
  const source = CatalogSourceSchema.parse({
    id: crypto.randomUUID(),
    title: "Chính sử",
    tier: "TIER_1_CHINH_SU",
    author: null,
    publisher: null,
    publicationYear: null,
    edition: null,
    isbn: null,
    url: "https://example.org/book",
    fileAssetId: null,
    version: 1,
    verificationStatus: "PENDING",
    verifiedVersion: null,
    verifiedAt: null,
    verificationNote: null,
    createdById: "owner",
    archivedAt: null,
  });
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(currentUserQueryKey, {
    id: "owner",
    name: "Người tạo",
    email: "owner@example.org",
    emailVerified: true,
    role: "moderator",
  });
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root?.render(
      <QueryClientProvider client={client}>
        <SourceVerification source={source} />
      </QueryClientProvider>,
    ),
  );
  expect(host.textContent).toContain("Chưa xác minh");
  expect(host.textContent).not.toContain("Xác minh nguồn");
  await act(async () => {
    client.setQueryData(currentUserQueryKey, {
      id: "reviewer",
      name: "Người duyệt",
      email: "reviewer@example.org",
      emailVerified: true,
      role: "moderator",
    });
    await new Promise((r) => setTimeout(r, 10));
  });
  expect(host.textContent).toContain("Xác minh nguồn");
});
