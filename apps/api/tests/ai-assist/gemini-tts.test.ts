import { afterAll, afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { env } from "../../src/core/env";
import { synthesizeWav } from "../../src/modules/ai-assist/voice/gemini-tts";

const originalKey = env.GEMINI_API_KEY;
const originalPreconnect = fetch.preconnect;
const fetchSpy = spyOn(globalThis, "fetch");
const audioResponse = () => Response.json({
  steps: [{ type: "model_output", content: [{ type: "audio", data: Buffer.from("RIFF-audio").toString("base64") }] }],
});
const requestedKeys: string[] = [];

beforeEach(() => {
  fetchSpy.mockReset();
  requestedKeys.length = 0;
  fetchSpy.mockImplementation(Object.assign(async () => { throw new Error("Unexpected network request"); }, { preconnect: originalPreconnect }));
});
afterEach(() => { env.GEMINI_API_KEY = originalKey; });
afterAll(() => { fetchSpy.mockRestore(); });

function respondWith(response: (key: string, signal: AbortSignal | null | undefined) => Response): void {
  fetchSpy.mockImplementation(Object.assign(async (_input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
    const key = new Headers(init?.headers).get("x-goog-api-key")!;
    requestedKeys.push(key);
    return response(key, init?.signal);
  }, { preconnect: originalPreconnect }));
}

test("trims and deduplicates keys, falls back on 429, and keeps the next key for later chunks", async () => {
  env.GEMINI_API_KEY = " fallback-one, fallback-one, , fallback-two ";
  respondWith((key) => key === "fallback-one" ? new Response("quota", { status: 429 }) : audioResponse());
  expect(await synthesizeWav("Câu đầu.", "Kore", new AbortController().signal)).toEqual(Buffer.from("RIFF-audio"));
  expect(requestedKeys).toEqual(["fallback-one", "fallback-two"]);
  await synthesizeWav("Câu tiếp.", "Kore", new AbortController().signal);
  expect(requestedKeys).toEqual(["fallback-one", "fallback-two", "fallback-two"]);
});

test("stops after every distinct key returns 429", async () => {
  env.GEMINI_API_KEY = "exhausted-one,exhausted-two,exhausted-one";
  respondWith(() => new Response("quota", { status: 429 }));
  await expect(synthesizeWav("Nội dung.", "Kore", new AbortController().signal)).rejects.toMatchObject({ status: 429, code: "RATE_LIMITED" });
  expect(requestedKeys).toEqual(["exhausted-one", "exhausted-two"]);
});

test.each([400, 401, 403, 500, 503])("does not rotate for HTTP %i or expose configured keys", async (status) => {
  env.GEMINI_API_KEY = "error-one,error-two";
  respondWith(() => new Response("error-one error-two", { status }));
  await expect(synthesizeWav("Nội dung.", "Kore", new AbortController().signal)).rejects.toMatchObject({
    status: 503,
    code: "AI_UNAVAILABLE",
    message: `Dịch vụ giọng đọc báo lỗi ${status}: [REDACTED] [REDACTED]`,
  });
  expect(requestedKeys).toEqual(["error-one"]);
});

test("preserves single-key behavior without retrying an exhausted key", async () => {
  env.GEMINI_API_KEY = "single-key";
  respondWith(() => new Response("quota", { status: 429 }));
  await expect(synthesizeWav("Nội dung.", "Kore", new AbortController().signal)).rejects.toMatchObject({ code: "RATE_LIMITED" });
  expect(requestedKeys).toEqual(["single-key"]);
});

test("rejects an empty key list before any request", async () => {
  env.GEMINI_API_KEY = " , , ";
  await expect(synthesizeWav("Nội dung.", "Kore", new AbortController().signal)).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
  expect(fetchSpy).not.toHaveBeenCalled();
});

test("cancellation between attempts prevents the fallback request", async () => {
  env.GEMINI_API_KEY = "cancel-one,cancel-two";
  const controller = new AbortController();
  respondWith(() => {
    controller.abort();
    return new Response("quota", { status: 429 });
  });
  await expect(synthesizeWav("Nội dung.", "Kore", controller.signal)).rejects.toMatchObject({ name: "AbortError" });
  expect(requestedKeys).toEqual(["cancel-one"]);
});

test("uses one deadline across all fallback attempts", async () => {
  env.GEMINI_API_KEY = "timeout-one,timeout-two";
  const deadline = new AbortController();
  const timeoutSpy = spyOn(AbortSignal, "timeout").mockReturnValue(deadline.signal);
  try {
    respondWith(() => {
      deadline.abort(new DOMException("Deadline elapsed", "TimeoutError"));
      return new Response("quota", { status: 429 });
    });
    await expect(synthesizeWav("Nội dung.", "Kore", new AbortController().signal)).rejects.toMatchObject({ code: "AI_UNAVAILABLE" });
    expect(requestedKeys).toEqual(["timeout-one"]);
    expect(timeoutSpy).toHaveBeenCalledTimes(1);
  } finally {
    timeoutSpy.mockRestore();
  }
});

test("parallel chunks each try a key at most once before falling back", async () => {
  env.GEMINI_API_KEY = "parallel-one,parallel-two";
  respondWith((key) => key === "parallel-one" ? new Response("quota", { status: 429 }) : audioResponse());
  const chunks = await Promise.all([
    synthesizeWav("Đoạn một.", "Kore", new AbortController().signal),
    synthesizeWav("Đoạn hai.", "Kore", new AbortController().signal),
  ]);
  expect(chunks).toEqual([Buffer.from("RIFF-audio"), Buffer.from("RIFF-audio")]);
  expect(requestedKeys.filter((key) => key === "parallel-one")).toHaveLength(2);
  expect(requestedKeys.filter((key) => key === "parallel-two")).toHaveLength(2);
});
