import { afterEach, expect, it } from "bun:test";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { PublicHistoricalSources } from "./PublicHistoricalSources";
let root: Root | undefined;
afterEach(() => {
  act(() => root?.unmount());
  document.body.innerHTML = "";
});
it("shows locator and verified evidence without treating source tier as verification", async () => {
  const host = document.createElement("div");
  document.body.append(host);
  root = createRoot(host);
  await act(async () =>
    root?.render(
      <PublicHistoricalSources
        citations={[
          {
            locator: "Quyển 1, trang 23",
            excerpt: "Trích dẫn",
            source: {
              id: "10000000-0000-4000-8000-000000000001",
              title: "Tư liệu",
              tier: "TIER_1_CHINH_SU",
              author: "Tác giả",
              publisher: "NXB",
              publicationYear: 2020,
              edition: "Lần 2",
              isbn: null,
              url: "https://example.org/book",
              verificationStatus: "PENDING",
              verifiedAt: null,
            },
          },
        ]}
      />,
    ),
  );
  expect(host.textContent).toContain("Quyển 1, trang 23");
  expect(host.textContent).toContain("Chưa xác minh");
  expect(host.textContent).not.toContain("Đã xác minh");
  expect(host.querySelector("a")?.href).toBe("https://example.org/book");
});
