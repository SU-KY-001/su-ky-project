import { describe, expect, it } from "bun:test";
import {
  buildAudioAnalysis,
  createObjectUrlLease,
  isSupportedPodcastAudio,
} from "./audioAnalysis";

describe("podcast audio analysis helpers", () => {
  it("accepts only formats supported by the media backend", () => {
    expect(isSupportedPodcastAudio({ name: "tap.mp3", type: "audio/mpeg" })).toBe(true);
    expect(isSupportedPodcastAudio({ name: "tap.m4a", type: "audio/x-m4a" })).toBe(true);
    expect(isSupportedPodcastAudio({ name: "tap.ogg", type: "audio/ogg" })).toBe(true);
    expect(isSupportedPodcastAudio({ name: "tap.wav", type: "audio/wav" })).toBe(false);
    expect(isSupportedPodcastAudio({ name: "tap.mp3", type: "application/pdf" })).toBe(false);
  });

  it("flags large duration drift and high background noise", () => {
    const analysis = buildAudioAnalysis({
      clientDurationMs: 80_000,
      estimatedScriptDurationMs: 40_000,
      noiseLevelDb: -24,
      checkedAt: "2026-10-13T03:00:00.000Z",
    });

    expect(analysis.durationRatio).toBe(2);
    expect(analysis.durationStatus).toBe("WARNING");
    expect(analysis.noiseStatus).toBe("WARNING");
    expect(analysis.formatStatus).toBe("PASS");
  });

  it("revokes the previous preview URL when replacing and disposing audio", () => {
    const revoked: string[] = [];
    let sequence = 0;
    const lease = createObjectUrlLease(
      () => `blob:audio-${++sequence}`,
      (url) => revoked.push(url),
    );

    expect(lease.replace({} as Blob)).toBe("blob:audio-1");
    expect(lease.replace({} as Blob)).toBe("blob:audio-2");
    expect(revoked).toEqual(["blob:audio-1"]);
    lease.dispose();
    expect(revoked).toEqual(["blob:audio-1", "blob:audio-2"]);
  });
});
