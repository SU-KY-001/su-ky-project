import { afterEach, expect, it } from "bun:test";
import { ApiError } from "@/lib/apiError";
import { profileService } from "./profileService";

const originalFetch = globalThis.fetch;
const user = { id: "profile-test", name: "Tên mới", email: "profile@example.com", emailVerified: true, image: null, role: "user" };
afterEach(() => { globalThis.fetch = originalFetch; });

it("saves profile changes using the session and parses the returned user", async () => {
  let options: RequestInit | undefined;
  globalThis.fetch = Object.assign(async (_input: RequestInfo | URL, init?: RequestInit) => {
    options = init;
    return Response.json({ user });
  }, { preconnect: originalFetch.preconnect });
  expect((await profileService.update({ name: user.name })).user.name).toBe(user.name);
  expect(options?.method).toBe("PATCH");
  expect(options?.credentials).toBe("include");
  expect(JSON.parse(String(options?.body))).toEqual({ name: user.name });
});

it("uploads the avatar as multipart without overriding the boundary", async () => {
  let options: RequestInit | undefined;
  globalThis.fetch = Object.assign(async (_input: RequestInfo | URL, init?: RequestInit) => {
    options = init;
    return Response.json({ user });
  }, { preconnect: originalFetch.preconnect });
  const file = new File(["avatar"], "avatar.png", { type: "image/png" });
  await profileService.uploadAvatar(file);
  expect(options?.body).toBeInstanceOf(FormData);
  expect(options?.headers).toBeUndefined();
  expect(options?.credentials).toBe("include");
  if (!(options?.body instanceof FormData)) throw new Error("Expected multipart avatar");
  expect(options.body.get("file")).toBeInstanceOf(File);
});

it("preserves a rejected account deletion and its support metadata", async () => {
  globalThis.fetch = Object.assign(async () => Response.json({ error_code: "CONFLICT", message: "Requires handover" }, { status: 409, headers: { "X-Request-Id": "profile-conflict" } }), { preconnect: originalFetch.preconnect });
  try {
    await profileService.delete({ password: "test-password", confirm: true });
    throw new Error("Expected account deletion to fail");
  } catch (error) {
    expect(error).toBeInstanceOf(ApiError);
    if (!(error instanceof ApiError)) throw error;
    expect(error.status).toBe(409);
    expect(error.requestId).toBe("profile-conflict");
  }
});
