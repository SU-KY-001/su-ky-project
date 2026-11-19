-- Drop the AI script workflow tables and narration columns. Restoring DDL lives in archive/script-workflow/db/create.sql.
-- Destructive and without backfill: only safe because no real data exists yet.

ALTER TABLE "episode_narrations"
  DROP CONSTRAINT "episode_narrations_publication_pair_check",
  DROP CONSTRAINT "episode_narrations_publication_episode_no_check",
  DROP CONSTRAINT "episode_narrations_script_publication_id_fkey";

DROP INDEX "episode_narrations_script_publication_id_episode_no_key";

ALTER TABLE "episode_narrations"
  DROP COLUMN "script_publication_id",
  DROP COLUMN "script_publication_episode_no",
  DROP COLUMN "audio_provider";

DROP TABLE "script_publications";
DROP TABLE "workflow_events";
DROP TABLE "step_versions";
DROP TABLE "workflow_steps";
DROP TABLE "workflow_runs";

DROP TYPE "audio_provider";
