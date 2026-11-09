import { expect, test } from "bun:test";
import { avatarPublicId } from "../src/modules/media/domain/avatar-public-id";

test("cleanup targets only exact owned avatar resource, never another user or provider", () => {
  const id = "12345678-1234-4234-8234-123456789012";
  const url = `https://res.cloudinary.com/demo/image/upload/v123/suky/avatars/self/${id}.jpg`;
  expect(avatarPublicId(url, "demo", "suky", "self")).toBe(`suky/avatars/self/${id}`);
  expect(avatarPublicId(url, "demo", "suky", "other")).toBeNull();
  expect(avatarPublicId(url.replace("res.cloudinary.com", "evil.test"), "demo", "suky", "self")).toBeNull();
  expect(avatarPublicId("not-a-url", "demo", "suky", "self")).toBeNull();
});
