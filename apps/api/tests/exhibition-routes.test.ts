import { expect, test } from "bun:test";
import { app } from "../src/app";

test("exhibition studio endpoints require authentication", async () => {
  const response = await app.request("/api/studio/exhibitions");
  expect(response.status).toBe(401);
  expect(await response.json()).toMatchObject({ error_code: "AUTH_REQUIRED" });
});

test("unknown exhibition slugs do not reveal drafts", async () => {
  expect(app.routes.some(route => route.method === "GET" && route.path === "/api/exhibitions/:slug")).toBe(true);
  const response = await app.request(`/api/exhibitions/${crypto.randomUUID()}`);
  expect(response.status).toBe(404);
});
