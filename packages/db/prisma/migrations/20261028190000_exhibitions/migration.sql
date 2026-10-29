CREATE TABLE "exhibitions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "owner_id" VARCHAR(36) NOT NULL,
  "slug" VARCHAR(280) NOT NULL,
  "title" VARCHAR(255) NOT NULL,
  "draft_revision" INTEGER NOT NULL DEFAULT 1,
  "draft_document" JSONB NOT NULL,
  "published_document" JSONB,
  "published_revision" INTEGER,
  "published_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "exhibitions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "exhibitions_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "exhibitions_slug_key" ON "exhibitions"("slug");
CREATE INDEX "exhibitions_owner_id_updated_at_idx" ON "exhibitions"("owner_id", "updated_at");
