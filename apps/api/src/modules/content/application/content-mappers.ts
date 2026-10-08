import type { EpisodeNarration, MediaAsset } from "@repo/db";
import { getSystemConfig } from "../../../core/config/system-config";
import type { MediaStorageGateway } from "../../media/application/media-storage";

export function mapEpisodeSource(item: {
  id: string; sortOrder: number; locator: string; excerpt: string | null; origin: "AI" | "MODERATOR";
  source: { id: string; tier: string; title: string; author: string | null; publicationYear: number | null; url: string | null };
}) {
  return item;
}

export function mapEntityTag(item: {
  id: string; status: string; origin: string;
  entity: { id: string; entityType: string; name: string };
}) {
  return item;
}

export async function mapNarration(
  narration: EpisodeNarration & { narratorEntity?: { id: string; name: string } | null; audioAsset?: MediaAsset | null },
  storage?: MediaStorageGateway
) {
  const content = narration.scriptContent ?? "";
  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const wordsPerMinute = await getSystemConfig("script.words_per_minute");
  const mismatchRatio = await getSystemConfig("narration.duration_mismatch_ratio");
  const estimatedDurationMs = wordCount ? Math.round((wordCount / wordsPerMinute) * 60_000) : 0;
  const warnings: Array<{ key: string; ratio?: number }> = [];
  if (narration.scriptUpdatedAt && narration.audioAttachedAt && narration.scriptUpdatedAt > narration.audioAttachedAt) warnings.push({ key: "SCRIPT_CHANGED_AFTER_AUDIO" });
  if (narration.audioAsset?.durationMs && estimatedDurationMs) {
    const ratio = narration.audioAsset.durationMs / estimatedDurationMs;
    if (Math.abs(narration.audioAsset.durationMs - estimatedDurationMs) / estimatedDurationMs > mismatchRatio) warnings.push({ key: "DURATION_MISMATCH", ratio });
  }
  return {
    id: narration.id, type: narration.narrationType, narrator: narration.narratorEntity ?? null,
    scriptContent: narration.scriptContent, wordCount, estimatedDurationMs,
    origin: narration.scriptPublicationId ? { kind: "AI", scriptPublicationId: narration.scriptPublicationId, episodeNo: narration.scriptPublicationEpisodeNo } : { kind: "MANUAL" },
    audio: narration.audioAsset ? {
      assetId: narration.audioAsset.id, provider: narration.audioProvider, durationMs: narration.audioAsset.durationMs,
      sizeBytes: narration.audioAsset.sizeBytes ? Number(narration.audioAsset.sizeBytes) : null,
      format: narration.audioAsset.format, previewUrl: storage?.deliveryUrl(narration.audioAsset) ?? null, attachedAt: narration.audioAttachedAt,
    } : null,
    warnings, updatedAt: narration.updatedAt,
  };
}
