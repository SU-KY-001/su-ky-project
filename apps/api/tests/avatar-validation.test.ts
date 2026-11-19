import { expect, test } from "bun:test";
import { validateAvatar } from "../src/modules/auth/avatar-validation";

test("avatar rejects oversized files, spoofed MIME and SVG", () => {
  expect(() => validateAvatar(new Uint8Array(5 * 1024 * 1024 + 1), "image/png")).toThrow();
  expect(() => validateAvatar(new TextEncoder().encode("<svg></svg>"), "image/png")).toThrow();
  expect(() => validateAvatar(new Uint8Array([255, 216, 255, 224]), "image/svg+xml")).toThrow();
});
test("avatar accepts PNG JPEG WebP signatures only with matching MIME", () => {
  expect(() => validateAvatar(new Uint8Array([255, 216, 255, 224]), "image/jpeg")).not.toThrow();
  expect(() => validateAvatar(new Uint8Array([137,80,78,71,13,10,26,10]), "image/png")).not.toThrow();
  expect(() => validateAvatar(new TextEncoder().encode("RIFF1234WEBP"), "image/webp")).not.toThrow();
  expect(() => validateAvatar(new Uint8Array([255,216,255]), "image/png")).toThrow();
});
