import { afterAll, describe, expect, test } from "bun:test";
import { rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { VoiceService } from "../../src/modules/ai-assist/voice/voice.service";
import { scriptSpeechHash } from "../../src/modules/ai-assist/voice/speech-text";

const EPISODE = "11111111-1111-4111-8111-111111111111";
const session = { user: { id: "user-1", role: "moderator" } } as never;
const episodeWith = (scriptContent: string, contentRevision = 1) => ({ contentRevision, narrations: [{ narrationType: "THIRD_PERSON", scriptDocument: null, scriptContent }] });
const content = { getEpisodeForRead: async () => episodeWith("Câu một.\n\nCâu hai.") } as never;
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

describe("VoiceService script binding", () => {
  test("a job reports the script hash and revision it was started from", async () => {
    const current = episodeWith("Câu một.\n\nCâu hai.", 7);
    const service = new VoiceService({ getEpisodeForRead: async () => current } as never, { synthesize: async () => wav, encode: async () => {} });
    const job = await service.start(session, EPISODE, "Kore");
    expect(job.scriptHash).toBe(scriptSpeechHash(current.narrations));
    expect(job.contentRevision).toBe(7);
    expect(service.get(session, EPISODE, job.id)).toMatchObject({ scriptHash: job.scriptHash, contentRevision: 7 });
  });

  test("an edit after start does not change the job hash; a new start replaces the stale running job", async () => {
    let current = episodeWith("Câu một.", 1);
    const { promise: gate, resolve: release } = Promise.withResolvers<void>();
    const service = new VoiceService({ getEpisodeForRead: async () => current } as never, { synthesize: async () => { await gate; return wav; }, encode: async () => {} });
    const first = await service.start(session, EPISODE, "Kore");
    current = episodeWith("Câu một đã sửa.", 2);
    expect(service.get(session, EPISODE, first.id).scriptHash).toBe(first.scriptHash);
    const second = await service.start(session, EPISODE, "Kore");
    expect(second.id).not.toBe(first.id);
    expect(second.scriptHash).not.toBe(first.scriptHash);
    expect(second.contentRevision).toBe(2);
    expect(service.get(session, EPISODE, first.id).status).toBe("CANCELLED");
    release();
    await until(() => service.get(session, EPISODE, second.id).status === "DONE");
    expect(service.get(session, EPISODE, first.id).status).toBe("CANCELLED");
  });

  test("starting again with the same script and voice returns the running job", async () => {
    const { promise: gate, resolve: release } = Promise.withResolvers<void>();
    const service = new VoiceService(content, { synthesize: async () => { await gate; return wav; }, encode: async () => {} });
    const first = await service.start(session, EPISODE, "Kore");
    expect((await service.start(session, EPISODE, "Kore")).id).toBe(first.id);
    release();
    await until(() => service.get(session, EPISODE, first.id).status === "DONE");
  });
});
