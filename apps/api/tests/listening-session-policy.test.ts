import { expect, test } from "bun:test";
import { mergeSessionBitmap, sessionRetentionCutoff } from "../src/modules/listening/application/listening-session-policy";

const full = (seconds: number): Uint8Array => {
  const bits = new Uint8Array(Math.ceil(seconds / 8));
  for (let i = 0; i < seconds; i++) bits[i >> 3] |= 1 << (i % 8);
  return bits;
};
test("session threshold is30s, retries and overlap do not increase unique time", () => {
  const first = mergeSessionBitmap(new Uint8Array(8), full(29), 60000, 60000);
  expect(first.playedMs).toBe(29000); expect(first.qualified).toBe(false);
  const second = mergeSessionBitmap(first.bitmap, full(30), 60000, 60000);
  expect(second.playedMs).toBe(30000); expect(second.qualified).toBe(true);
  expect(mergeSessionBitmap(second.bitmap, full(30), 60000, 60000).playedMs).toBe(30000);
});
test("short episode threshold, duration boundary and partial final second", () => {
  expect(mergeSessionBitmap(new Uint8Array(4), full(15), 20000, 20000).qualified).toBe(false);
  expect(mergeSessionBitmap(new Uint8Array(4), full(16), 20000, 20000).qualified).toBe(true);
  expect(mergeSessionBitmap(new Uint8Array(8), full(29), 37500, 60000).qualified).toBe(false);
  expect(mergeSessionBitmap(new Uint8Array(1), full(1), 500, 500).playedMs).toBe(500);
  expect(mergeSessionBitmap(new Uint8Array(1), full(1), 500, 499).qualified).toBe(false);
});
test("absolute wall-clock budget cannot be multiplied by retries; new sessions start empty", () => {
  let current: Uint8Array = new Uint8Array(8);
  for (let i = 0; i < 20; i++) current = mergeSessionBitmap(current, full(60), 60000, 10000).bitmap;
  expect(mergeSessionBitmap(current, full(60), 60000, 10000).playedMs).toBe(10000);
  expect(mergeSessionBitmap(new Uint8Array(8), full(60), 60000, 0).playedMs).toBe(0);
  expect(mergeSessionBitmap(new Uint8Array(8), full(30), 60000, 30000).qualified).toBe(true);
});
test("retention is13 calendar months with end-of-month clamping", () => {
  expect(sessionRetentionCutoff(new Date("2026-03-31T12:00:00Z")).toISOString()).toBe("2025-02-28T12:00:00.000Z");
});
