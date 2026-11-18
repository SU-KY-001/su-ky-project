CREATE TABLE "feature_daily_usage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" VARCHAR(36) NOT NULL,
    "feature" VARCHAR(16) NOT NULL,
    "usage_date" DATE NOT NULL,
    "ref_key" VARCHAR(64) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "feature_daily_usage_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "feature_daily_usage_user_id_feature_usage_date_ref_key_key" ON "feature_daily_usage"("user_id", "feature", "usage_date", "ref_key");
CREATE INDEX "feature_daily_usage_user_id_feature_usage_date_idx" ON "feature_daily_usage"("user_id", "feature", "usage_date");

ALTER TABLE "feature_daily_usage" ADD CONSTRAINT "feature_daily_usage_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Podcast usage from the old table keeps the same semantics: one row per episode per Vietnam day.
INSERT INTO "feature_daily_usage" ("user_id", "feature", "usage_date", "ref_key", "created_at")
SELECT "user_id", 'podcast', "play_date", "episode_id"::text, "created_at"
FROM "listening_daily_plays"
ON CONFLICT DO NOTHING;
