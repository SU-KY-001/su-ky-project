import { expect, test } from "bun:test";
import { Hono } from "hono";
import { errorHandler } from "../src/core/middleware";

test("unexpected errors do not expose database details in responses", async () => {
  const app = new Hono().onError(errorHandler).get("/failure", () => { throw new Error("prisma.exhibition.findMany: private database details"); });
  const response = await app.request("/failure");
  expect(response.status).toBe(500);
  expect(await response.json()).toEqual({ error_code: "INTERNAL_SERVER_ERROR", message: "An internal server error occurred" });
});
