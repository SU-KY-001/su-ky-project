import { expect, test } from "bun:test";
import { createApiKeyRotation } from "../src/modules/ai-engine/api-key-rotation";

test("keeps rotation state isolated per consumer and resets when the active key is removed", async () => {
  const first = createApiKeyRotation();
  const second = createApiKeyRotation();
  const requested: string[] = [];
  const request = async (key: string): Promise<Response> => {
    requested.push(key);
    return new Response(null, { status: key === "limited" ? 429 : 200 });
  };
  await first(["limited", "available"], request);
  await first(["limited", "available"], request);
  await second(["limited", "available"], request);
  await first(["replacement", "other"], request);
  expect(requested).toEqual(["limited", "available", "available", "limited", "available", "replacement"]);
});

test("rejects missing keys without issuing a request", async () => {
  const rotate = createApiKeyRotation();
  let called = false;
  await expect(rotate([], async () => {
    called = true;
    return new Response();
  })).rejects.toBeInstanceOf(RangeError);
  expect(called).toBe(false);
});
