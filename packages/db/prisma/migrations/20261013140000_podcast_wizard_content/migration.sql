ALTER TABLE "episode_narrations"
ADD COLUMN "script_document" JSONB,
ADD COLUMN "audio_analysis" JSONB;

CREATE TABLE "episode_attachments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "episode_id" UUID NOT NULL,
    "media_asset_id" UUID NOT NULL,
    "file_name" VARCHAR(255) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "episode_attachments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "episode_attachments_media_asset_id_key"
ON "episode_attachments"("media_asset_id");

CREATE INDEX "episode_attachments_episode_id_created_at_idx"
ON "episode_attachments"("episode_id", "created_at");

ALTER TABLE "episode_attachments"
ADD CONSTRAINT "episode_attachments_episode_id_fkey"
FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "episode_attachments"
ADD CONSTRAINT "episode_attachments_media_asset_id_fkey"
FOREIGN KEY ("media_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
