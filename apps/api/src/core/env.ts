import { z } from "zod";
const emptyAsUndefined = (value: unknown): unknown => (value === "" ? undefined : value);

const envSchema = z
  .object({
    NODE_ENV: z
      .enum(["development", "production", "test"])
      .default("development"),
    PORT: z.coerce.number().default(3005),
    DATABASE_URL: z.string().optional(),
    BETTER_AUTH_SECRET: z
      .string()
      .default("su-ky-auth-secret-development-key"),
    BETTER_AUTH_URL: z.string().default("http://localhost:3005"),
    CORS_ORIGIN: z.string().default("http://localhost:5173"),
    CLOUDINARY_CLOUD_NAME: z.preprocess(emptyAsUndefined, z.string().min(1).optional()),
    CLOUDINARY_API_KEY: z.preprocess(emptyAsUndefined, z.string().min(1).optional()),
    CLOUDINARY_API_SECRET: z.preprocess(emptyAsUndefined, z.string().min(1).optional()),
    CLOUDINARY_FOLDER: z.preprocess(emptyAsUndefined, z.string().min(1).default("su-ky")),
    CLOUDINARY_TIMEOUT_MS: z.preprocess(
      emptyAsUndefined,
      z.coerce.number().int().positive().default(10000)
    ),
    CLOUDINARY_DOCUMENT_DELIVERY_TTL_SECONDS: z.preprocess(
      emptyAsUndefined,
      z.coerce.number().int().positive().default(3600)
    ),
    SOURCE_PDF_TIMEOUT_MS: z.preprocess(
      emptyAsUndefined,
      z.coerce.number().int().positive().default(120000)
    ),
    LOG_LEVEL: z
      .enum(["fatal", "error", "warn", "info", "debug", "trace"])
      .default("info"),
    LOG_DIR: z.string().optional(),
    PI_PROVIDER: z.string().min(1).default("google"),
    PI_MODEL: z.string().min(1).optional(),
    PI_API_KEY: z.string().min(1).optional(),
    GEMINI_API_KEY: z.string().min(1).optional(),
    OPENCODE_API_KEY: z.string().min(1).optional(),
    PI_THINKING_LEVEL: z
      .enum(["off", "minimal", "low", "medium", "high", "xhigh", "max"])
      .default("medium"),
    PI_WEB_ACCESS_DIR: z.string().min(1).optional(),
    // One retry layer only (Pi's own); another on top turns a 429 into a retry storm.
    PI_RETRY_MAX: z.preprocess(emptyAsUndefined, z.coerce.number().int().min(0).default(2)),
    PI_RETRY_BASE_DELAY_MS: z.preprocess(emptyAsUndefined, z.coerce.number().int().positive().default(2000)),
    PI_PROVIDER_TIMEOUT_MS: z.preprocess(emptyAsUndefined, z.coerce.number().int().positive().default(60000)),
    // Whole-run deadline across all tool turns; PI_PROVIDER_TIMEOUT_MS only bounds a single request.
    PI_RUN_TIMEOUT_MS: z.preprocess(emptyAsUndefined, z.coerce.number().int().positive().default(300000)),
    // ai-assist background runs (see plans/261015-1640-podcast-ai-source-check-p1/phase-02-api-runner.md)
    AI_ASSIST_TIMEOUT_MS: z.preprocess(emptyAsUndefined, z.coerce.number().int().positive().default(900000)),
    AI_ASSIST_BLOCK_CONCURRENCY: z.preprocess(emptyAsUndefined, z.coerce.number().int().positive().default(2)),
    AI_ASSIST_MAX_CONCURRENT_PER_USER: z.preprocess(emptyAsUndefined, z.coerce.number().int().positive().default(2)),
    AI_ASSIST_GLOBAL_MODEL_CONCURRENCY: z.preprocess(emptyAsUndefined, z.coerce.number().int().positive().default(4)),
    AI_ASSIST_BATCH_BLOCKS: z.preprocess(emptyAsUndefined, z.coerce.number().int().positive().default(8)),
    AI_ASSIST_BATCH_MAX_CHARS: z.preprocess(emptyAsUndefined, z.coerce.number().int().positive().default(4000)),
    AI_ASSIST_MAX_TOOL_CALLS: z.preprocess(emptyAsUndefined, z.coerce.number().int().positive().default(12)),
    AI_ASSIST_HEARTBEAT_MS: z.preprocess(emptyAsUndefined, z.coerce.number().int().positive().default(15000)),
    AI_ASSIST_RUN_HEARTBEAT_MS: z.preprocess(emptyAsUndefined, z.coerce.number().int().positive().default(10000)),
    AI_ASSIST_STALE_AFTER_MS: z.preprocess(emptyAsUndefined, z.coerce.number().int().positive().default(60000)),
    // Narrative angles a moderator may own (built-ins do not count).
    AI_ANGLE_MAX_PER_USER: z.preprocess(emptyAsUndefined, z.coerce.number().int().positive().default(50)),
    // Gemini TTS voice generation (background job per episode). The free tier is ~10 requests a day: one request per chunk.
    TTS_MODEL: z.string().min(1).default("gemini-3.8-flash-lite-tts"),
    TTS_CHUNK_CHARS: z.preprocess(emptyAsUndefined, z.coerce.number().int().min(500).default(3000)),
    TTS_CONCURRENCY: z.preprocess(emptyAsUndefined, z.coerce.number().int().positive().default(3)),
    TTS_REQUEST_TIMEOUT_MS: z.preprocess(emptyAsUndefined, z.coerce.number().int().positive().default(180000)),
    // Finished jobs (and their mp3 on disk) are dropped after this; a job lives in memory, so a restart also drops it.
    TTS_JOB_TTL_MS: z.preprocess(emptyAsUndefined, z.coerce.number().int().positive().default(1800000)),
    FFMPEG_PATH: z.string().min(1).default("ffmpeg"),
    // Delivery style sent with every chunk as speech_metadata.style.
    TTS_STYLE: z.string().min(1).default("Podcast - Calm, measured delivery"),
    // Synchronous compose calls (outline / draft-section / rewrite), see spec-prompts-compose.md
    AI_ASSIST_CALL_TIMEOUT_MS: z.preprocess(emptyAsUndefined, z.coerce.number().int().positive().default(90000)),
    AI_REWRITE_MAX_VARIANTS: z.preprocess(emptyAsUndefined, z.coerce.number().int().min(1).max(10).default(10)),
    AI_ASSIST_MAX_SOURCE_CHARS: z.preprocess(emptyAsUndefined, z.coerce.number().int().positive().default(8000)),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      if (!data.DATABASE_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "DATABASE_URL is required in production environment",
          path: ["DATABASE_URL"],
        });
      }
      if (
        !data.BETTER_AUTH_SECRET ||
        data.BETTER_AUTH_SECRET === "su-ky-auth-secret-development-key"
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message:
            "BETTER_AUTH_SECRET must be configured with a secure production key",
          path: ["BETTER_AUTH_SECRET"],
        });
      }
      const cloudinaryValues = [
        data.CLOUDINARY_CLOUD_NAME,
        data.CLOUDINARY_API_KEY,
        data.CLOUDINARY_API_SECRET,
      ];
      if (!cloudinaryValues.every(Boolean)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "All Cloudinary credentials must be configured together",
          path: ["CLOUDINARY_CLOUD_NAME"],
        });
      }
    }
  });

export type Env = z.infer<typeof envSchema>;

export function validateEnv(input: Record<string, unknown> = process.env): Env {
  const result = envSchema.safeParse(input);
  if (!result.success) {
    const formatted = JSON.stringify(result.error.format(), null, 2);
    console.error("❌ Invalid environment configuration:\n", formatted);
    if (input.NODE_ENV === "production") {
      throw new Error("Invalid environment configuration in production");
    }
    return envSchema.parse({
      ...input,
      NODE_ENV: "development",
    });
  }
  return result.data;
}

export const env = validateEnv();
