CREATE TABLE "quiz_workspace_drafts" (
  "episode_id" UUID NOT NULL,
  "data" JSONB NOT NULL,
  "revision" INTEGER NOT NULL DEFAULT 1,
  "activated_revision" INTEGER NOT NULL DEFAULT 0,
  "updated_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "quiz_workspace_drafts_pkey" PRIMARY KEY ("episode_id"),
  CONSTRAINT "quiz_workspace_drafts_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
