import type { AudioAnalysis } from "@repo/shared";

const audioMimeByExtension: Record<string, string[]> = {
  mp3: ["audio/mpeg"],
  m4a: ["audio/mp4", "audio/x-m4a"],
  ogg: ["audio/ogg"],
};

export function isSupportedPodcastAudio(file: { name: string; type: string }): boolean {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  return Boolean(audioMimeByExtension[extension]?.includes(file.type.toLowerCase()));
}

export function buildAudioAnalysis(input: {
  clientDurationMs: number | null;
  estimatedScriptDurationMs: number;
  noiseLevelDb: number | null;
  checkedAt?: string;
}): AudioAnalysis {
  const durationRatio =
    input.clientDurationMs !== null && input.estimatedScriptDurationMs > 0
      ? input.clientDurationMs / input.estimatedScriptDurationMs
      : null;
  const durationStatus =
    durationRatio === null
      ? "UNKNOWN"
      : Math.abs(durationRatio - 1) <= 0.3
        ? "PASS"
        : "WARNING";
  const noiseStatus =
    input.noiseLevelDb === null
      ? "UNKNOWN"
      : input.noiseLevelDb <= -35
        ? "PASS"
        : "WARNING";
  return {
    clientDurationMs: input.clientDurationMs,
    estimatedScriptDurationMs: input.estimatedScriptDurationMs,
    durationRatio,
    noiseLevelDb: input.noiseLevelDb,
    formatStatus: "PASS",
    durationStatus,
    noiseStatus,
    checkedAt: input.checkedAt ?? new Date().toISOString(),
  };
}

export function createObjectUrlLease(
  create: (blob: Blob) => string = URL.createObjectURL,
  revoke: (url: string) => void = URL.revokeObjectURL,
) {
  let current: string | null = null;
  return {
    replace(blob: Blob): string {
      if (current) revoke(current);
      current = create(blob);
      return current;
    },
    dispose(): void {
      if (current) revoke(current);
      current = null;
    },
  };
}

function estimateNoiseLevel(buffer: AudioBuffer): number | null {
  if (!buffer.numberOfChannels || !buffer.length) return null;
  const samples = buffer.getChannelData(0);
  const windowSize = 2048;
  const levels: number[] = [];
  for (let offset = 0; offset < samples.length; offset += windowSize) {
    const end = Math.min(offset + windowSize, samples.length);
    let squareSum = 0;
    for (let index = offset; index < end; index += 1) {
      const sample = samples[index] ?? 0;
      squareSum += sample * sample;
    }
    levels.push(Math.sqrt(squareSum / Math.max(1, end - offset)));
  }
  levels.sort((a, b) => a - b);
  const quietCount = Math.max(1, Math.ceil(levels.length * 0.1));
  const quietRms =
    levels.slice(0, quietCount).reduce((total, level) => total + level, 0) /
    quietCount;
  return Math.max(-100, 20 * Math.log10(Math.max(quietRms, 0.00001)));
}

export async function analyzePodcastAudio(
  file: File,
  estimatedScriptDurationMs: number,
): Promise<AudioAnalysis> {
  const context = new AudioContext();
  try {
    const buffer = await context.decodeAudioData(await file.arrayBuffer());
    return buildAudioAnalysis({
      clientDurationMs: Math.round(buffer.duration * 1000),
      estimatedScriptDurationMs,
      noiseLevelDb: estimateNoiseLevel(buffer),
    });
  } finally {
    await context.close();
  }
}
