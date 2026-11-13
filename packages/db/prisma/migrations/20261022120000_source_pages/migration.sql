-- Rollback: DROP TABLE "source_pages";
-- CreateTable
CREATE TABLE "source_pages" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "page" INTEGER NOT NULL,
    "text" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_pages_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "source_pages_source_version_page_key" ON "source_pages"("source_id", "version", "page");

-- Full-text search expression index: queries must use the exact same expression to hit it.
CREATE INDEX "source_pages_tsv_idx" ON "source_pages" USING gin (to_tsvector('simple', immutable_unaccent(lower("text"))));

-- AddForeignKey
ALTER TABLE "source_pages" ADD CONSTRAINT "source_pages_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE CASCADE ON UPDATE CASCADE;
