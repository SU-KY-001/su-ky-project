import { expect, test, spyOn } from "bun:test";
import { app } from "../src/app";
import { PrismaExhibitionRepository } from "../src/modules/exhibition/infrastructure/prisma-exhibition.repository";

test("exhibition studio endpoints require authentication", async () => {
  const response = await app.request("/api/studio/exhibitions");
  expect(response.status).toBe(401);
  expect(await response.json()).toMatchObject({ error_code: "AUTH_REQUIRED" });
});

test("unknown exhibition slugs do not reveal drafts", async () => {
  expect(app.routes.some(route => route.method === "GET" && route.path === "/api/exhibitions/:slug")).toBe(true);
  const slug = crypto.randomUUID();
  const lookup = spyOn(PrismaExhibitionRepository.prototype, "findPublished").mockResolvedValue(null);
  try {
    const response = await app.request(`/api/exhibitions/${slug}`);
    expect(response.status).toBe(404);
    expect(lookup).toHaveBeenCalledWith(slug);
  } finally { lookup.mockRestore(); }
});
