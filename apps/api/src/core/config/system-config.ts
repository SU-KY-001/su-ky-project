import { prisma } from "@repo/db";
import { z } from "zod";
import { logger } from "../logger";

const rateLimitSchema = z.object({
  limit: z.number().int().positive(),
  windowSeconds: z.number().int().positive(),
});

export const SYSTEM_CONFIGS = {
  "xp.episode_completion": { schema: z.number().int().nonnegative(), defaultValue: 20 },
  "listening.completion_ratio": { schema: z.number().min(0).max(1), defaultValue: 0.9 },
  "listening.sync_interval_ms": { schema: z.number().int().positive(), defaultValue: 15000 },
  "listening.max_playback_rate": { schema: z.number().positive(), defaultValue: 2 },
  "listening.tolerance_intervals": { schema: z.number().int().nonnegative(), defaultValue: 1 },
  "media.audio.max_bytes": { schema: z.number().int().positive(), defaultValue: 52428800 },
  "media.audio.allowed_formats": { schema: z.array(z.string()), defaultValue: ["mp3", "m4a", "ogg"] },
  "media.audio.allowed_mime_types": { schema: z.array(z.string()), defaultValue: ["audio/mpeg", "audio/mp4", "audio/x-m4a", "audio/ogg"] },
  "media.document.max_bytes": { schema: z.number().int().positive(), defaultValue: 20971520 },
  "media.document.allowed_formats": { schema: z.array(z.string()), defaultValue: ["pdf"] },
  "media.document.allowed_mime_types": { schema: z.array(z.string()), defaultValue: ["application/pdf"] },
  "media.image.max_bytes": { schema: z.number().int().positive(), defaultValue: 5242880 },
  "media.image.allowed_formats": { schema: z.array(z.string()), defaultValue: ["jpg", "jpeg", "png", "webp"] },
  "media.image.allowed_mime_types": { schema: z.array(z.string()), defaultValue: ["image/jpeg", "image/png", "image/webp"] },
  "media.upload_ticket_ttl_seconds": { schema: z.number().int().positive(), defaultValue: 3000 },
  "media.cleanup_grace_hours": { schema: z.number().int().nonnegative(), defaultValue: 24 },
  "media.cleanup_batch_size": { schema: z.number().int().positive(), defaultValue: 100 },
  "script.max_chars": { schema: z.number().int().positive(), defaultValue: 60000 },
  "script.words_per_minute": { schema: z.number().int().positive(), defaultValue: 150 },
  "narration.duration_mismatch_ratio": { schema: z.number().nonnegative(), defaultValue: 0.3 },
  "slug.max_length": { schema: z.number().int().min(8), defaultValue: 80 },
  "slug.max_attempts": { schema: z.number().int().positive(), defaultValue: 5 },
  "search.similar_candidate_limit": { schema: z.number().int().positive(), defaultValue: 5 },
  "idempotency.ttl_hours": { schema: z.number().int().positive(), defaultValue: 24 },
  "idempotency.lock_timeout_seconds": { schema: z.number().int().positive(), defaultValue: 60 },
  "rate_limit.write": { schema: rateLimitSchema, defaultValue: { limit: 120, windowSeconds: 60 } },
  "rate_limit.media_upload": { schema: rateLimitSchema, defaultValue: { limit: 30, windowSeconds: 3600 } },
  "rate_limit.listening_progress": { schema: rateLimitSchema, defaultValue: { limit: 20, windowSeconds: 60 } },
} as const;

export type SystemConfigKey = keyof typeof SYSTEM_CONFIGS;
type ConfigValue<K extends SystemConfigKey> = z.infer<(typeof SYSTEM_CONFIGS)[K]["schema"]>;

const SYSTEM_CONFIG_CACHE_TTL_MS = 60_000;
const cache = new Map<SystemConfigKey, { value: unknown; expiresAt: number }>();
const warnedMissing = new Set<SystemConfigKey>();

export async function getSystemConfig<K extends SystemConfigKey>(key: K): Promise<ConfigValue<K>> {
  const cached = cache.get(key);
  if (cached && cached.expiresAt > Date.now()) return cached.value as ConfigValue<K>;

  const definition = SYSTEM_CONFIGS[key];
  const row = await prisma.systemConfig.findUnique({ where: { key } });
  const value = row ? definition.schema.parse(row.value) : definition.defaultValue;
  if (!row && !warnedMissing.has(key)) {
    warnedMissing.add(key);
    logger.warn({ key }, "System config missing; using default");
  }
  cache.set(key, { value, expiresAt: Date.now() + SYSTEM_CONFIG_CACHE_TTL_MS });
  return value as ConfigValue<K>;
}

export function resetSystemConfigCache(): void {
  cache.clear();
  warnedMissing.clear();
}
