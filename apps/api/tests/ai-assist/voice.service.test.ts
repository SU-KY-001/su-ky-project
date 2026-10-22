import { afterAll, describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VoiceService } from "../../src/modules/ai-assist/voice/voice.service";

const EPISODE = "11111111-1111-4111-8111-111111111111";
const session = { user: { id: "user-1", role: "moderator" } } as never;
const content = {
  getEpisodeForRead: async () => ({ narrations: [{ narrationType: "THIRD_PERSON", scriptDocument: null, scriptContent: "Câu một.\n\nCâu hai." }] }),
} as never;
const wav = Buffer.alloc(44 + 48_000);

const until = async (condition: () => boolean): Promise<void> => {
  for (let waited = 0; !condition(); waited += 5) {
    if (waited > 2000) throw new Error("condition not met");
    await new Promise((resolve) => setTimeout(resolve, 5));
  }
};

afterAll(() => rm(join(tmpdir(), "suky-voice"), { recursive: true, force: true }));

describe("VoiceService concurrency", () => {
  test("two simultaneous starts for one episode create one job and call the provider once", async () => {
    let calls = 0;
    const service = new VoiceService(content, { synthesize: async () => { calls += 1; return wav; }, encode: async () => {} });
    const [a, b] = await Promise.all([service.start(session, EPISODE, "Kore"), service.start(session, EPISODE, "Kore")]);
    expect(b.id).toBe(a.id);
    await until(() => service.get(session, EPISODE, a.id).status === "DONE");
    expect(calls).toBe(1);
  });

  test("cancel while the encoder is pending keeps the job CANCELLED", async () => {
    let finishEncode = (): void => {};
    let encoding = false;
    const service = new VoiceService(content, {
      synthesize: async () => wav,
      encode: () => new Promise<void>((resolve) => { encoding = true; finishEncode = resolve; }),
    });
    const job = await service.start(session, EPISODE, "Kore");
    await until(() => encoding);
    service.cancel(session, EPISODE, job.id);
    finishEncode();
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(service.get(session, EPISODE, job.id).status).toBe("CANCELLED");
    await expect(service.readMp3(session, EPISODE, job.id)).rejects.toThrow();
  });

  test("a job is invisible to another moderator", async () => {
    const service = new VoiceService(content, { synthesize: async () => wav, encode: async () => {} });
    const job = await service.start(session, EPISODE, "Kore");
    const other = { user: { id: "user-2", role: "moderator" } } as never;
    expect(() => service.get(other, EPISODE, job.id)).toThrow();
  });
});
