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
