CREATE TABLE "playlists" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_id" VARCHAR(36) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "playlists_pkey" PRIMARY KEY ("id")
);
CREATE TABLE "playlist_items" (
  "playlist_id" UUID NOT NULL,
  "episode_id" UUID NOT NULL,
  "position" INTEGER NOT NULL,
  "added_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "playlist_items_pkey" PRIMARY KEY ("playlist_id", "episode_id"),
  CONSTRAINT "playlist_items_position_check" CHECK ("position" >= 0)
);
CREATE INDEX "playlists_owner_updated_idx" ON "playlists"("owner_id", "updated_at", "id");
CREATE INDEX "playlist_items_order_idx" ON "playlist_items"("playlist_id", "position", "episode_id");
ALTER TABLE "playlists" ADD CONSTRAINT "playlists_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "playlist_items" ADD CONSTRAINT "playlist_items_playlist_id_fkey" FOREIGN KEY ("playlist_id") REFERENCES "playlists"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "playlist_items" ADD CONSTRAINT "playlist_items_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;
