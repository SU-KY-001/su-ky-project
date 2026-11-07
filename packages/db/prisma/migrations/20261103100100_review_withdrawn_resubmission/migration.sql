-- Keep every withdrawn review while allowing exactly one non-withdrawn review per episode revision.
DROP INDEX "episode_reviews_episode_revision_key";
CREATE UNIQUE INDEX "episode_reviews_active_episode_revision_key"
  ON "episode_reviews" ("episode_id", "revision")
  WHERE "status" <> 'WITHDRAWN';
