CREATE TABLE "listening_daily_plays" (
    "user_id" VARCHAR(36) NOT NULL,
    "play_date" DATE NOT NULL,
    "episode_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "listening_daily_plays_pkey" PRIMARY KEY ("user_id", "play_date", "episode_id")
);

ALTER TABLE "listening_daily_plays" ADD CONSTRAINT "listening_daily_plays_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "listening_daily_plays" ADD CONSTRAINT "listening_daily_plays_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
