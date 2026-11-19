-- Rollback: ALTER TABLE "episode_narrations" DROP COLUMN "dialogue";
-- Additive only: NULL means a normal single-narrator script, so existing rows are unchanged.
ALTER TABLE "episode_narrations" ADD COLUMN "dialogue" JSONB;
