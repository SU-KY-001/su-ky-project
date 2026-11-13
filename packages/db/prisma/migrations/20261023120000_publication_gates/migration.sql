-- Rollback: ALTER TABLE "episode_reviews" DROP COLUMN "readiness_snapshot"; ALTER TABLE "episodes" DROP COLUMN "publication_approval"; ALTER TABLE "series" DROP COLUMN "language";
-- Additive only: existing rows keep working (series default 'vi'; approval/snapshot stay NULL until the next review).
ALTER TABLE "series" ADD COLUMN "language" VARCHAR(35) NOT NULL DEFAULT 'vi';

ALTER TABLE "episodes" ADD COLUMN "publication_approval" JSONB;

ALTER TABLE "episode_reviews" ADD COLUMN "readiness_snapshot" JSONB;
