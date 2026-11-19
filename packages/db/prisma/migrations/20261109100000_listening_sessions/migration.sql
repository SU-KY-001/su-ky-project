CREATE TABLE "listening_sessions" (
    "id" UUID NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "narration_id" UUID NOT NULL,
    "episode_id" UUID NOT NULL,
    "audio_asset_id" UUID NOT NULL,
    "duration_ms" INTEGER NOT NULL,
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "played_bitmap" BYTEA NOT NULL,
    "played_ms" INTEGER NOT NULL DEFAULT 0,
    "qualified_at" TIMESTAMPTZ(3),
    CONSTRAINT "listening_sessions_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "listening_sessions_duration_check" CHECK ("duration_ms" > 0 AND "played_ms" >= 0 AND "played_ms" <= "duration_ms")
);

CREATE INDEX "listening_sessions_user_started_idx" ON "listening_sessions"("user_id", "started_at");
CREATE INDEX "listening_sessions_episode_started_idx" ON "listening_sessions"("episode_id", "started_at");
CREATE INDEX "listening_sessions_started_qualified_idx" ON "listening_sessions"("started_at", "qualified_at");

ALTER TABLE "listening_sessions" ADD CONSTRAINT "listening_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listening_sessions" ADD CONSTRAINT "listening_sessions_narration_id_fkey" FOREIGN KEY ("narration_id") REFERENCES "episode_narrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listening_sessions" ADD CONSTRAINT "listening_sessions_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "listening_sessions" ADD CONSTRAINT "listening_sessions_audio_asset_id_fkey" FOREIGN KEY ("audio_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
