import { expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router";
import { ExhibitionSection } from "./ExhibitionSection";

it("links every public summary to its own exhibition without requesting scene data", () => {
  const client = new QueryClient();
  client.setQueryData(["public-exhibitions"], { items: [
    { slug: "ky-uc", title: "Ký ức", description: "Ảnh tư liệu Hà Nội" },
    { slug: "di-san", title: "Di sản", description: "Di sản Việt Nam" },
  ] });
  const html = renderToStaticMarkup(<QueryClientProvider client={client}><MemoryRouter><ExhibitionSection /></MemoryRouter></QueryClientProvider>);
  expect(html).toContain('href="/trien-lam/ky-uc"');
  expect(html).toContain('href="/trien-lam/di-san"');
  expect(html).toContain("Ảnh tư liệu Hà Nội");
  expect(html).not.toContain("canvas");
  expect(client.getQueryCache().getAll().map(query => query.queryKey)).toEqual([["public-exhibitions"]]);
});
