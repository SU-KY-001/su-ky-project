-- AlterEnum
ALTER TYPE "media_kind" ADD VALUE 'DOCUMENT';

-- DropForeignKey
ALTER TABLE "episode_sources" DROP CONSTRAINT "episode_sources_episode_id_fkey";

-- DropForeignKey
ALTER TABLE "episode_sources" DROP CONSTRAINT "episode_sources_source_id_fkey";

-- DropForeignKey
ALTER TABLE "series" DROP CONSTRAINT "series_historical_period_id_fkey";

-- DropIndex
DROP INDEX "series_historical_period_id_idx";

-- AlterTable
ALTER TABLE "series" DROP COLUMN "historical_period_id",
ADD COLUMN     "historical_phase_id" UUID;

-- AlterTable
ALTER TABLE "sources" ADD COLUMN     "file_asset_id" UUID;

-- DropTable
DROP TABLE "episode_sources";

-- Old flat periods are superseded by Period -> Phase seed data (no production data to preserve).
DELETE FROM "historical_periods";

-- CreateTable
CREATE TABLE "historical_phases" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "period_id" UUID NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(280) NOT NULL,
    "start_year" SMALLINT,
    "end_year" SMALLINT,
    "note" TEXT,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "historical_phases_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "series_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "locator" VARCHAR(255) NOT NULL DEFAULT '',
    "excerpt" TEXT,
    "sort_order" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "series_sources_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "historical_phases_slug_key" ON "historical_phases"("slug");

-- CreateIndex
CREATE INDEX "historical_phases_period_id_sort_order_idx" ON "historical_phases"("period_id", "sort_order");

-- CreateIndex
CREATE INDEX "series_sources_source_id_idx" ON "series_sources"("source_id");

-- CreateIndex
CREATE UNIQUE INDEX "series_sources_series_id_source_id_locator_key" ON "series_sources"("series_id", "source_id", "locator");

-- CreateIndex
CREATE INDEX "series_historical_phase_id_idx" ON "series"("historical_phase_id");

-- CreateIndex
CREATE UNIQUE INDEX "sources_file_asset_id_key" ON "sources"("file_asset_id");

-- AddForeignKey
ALTER TABLE "historical_phases" ADD CONSTRAINT "historical_phases_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "historical_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_historical_phase_id_fkey" FOREIGN KEY ("historical_phase_id") REFERENCES "historical_phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_sources" ADD CONSTRAINT "series_sources_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_sources" ADD CONSTRAINT "series_sources_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Half-open [start_year, end_year) convention: see HistoricalPhase in schema.prisma.
ALTER TABLE "historical_periods" ADD CONSTRAINT "historical_periods_year_order_check"
  CHECK ("start_year" IS NULL OR "end_year" IS NULL OR "start_year" < "end_year");

ALTER TABLE "historical_phases" ADD CONSTRAINT "historical_phases_year_order_check"
  CHECK ("start_year" IS NULL OR "end_year" IS NULL OR "start_year" < "end_year");

