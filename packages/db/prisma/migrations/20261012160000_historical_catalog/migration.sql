BEGIN;
-- CreateEnum
CREATE TYPE "HistoricalReviewStatus" AS ENUM ('DRAFT', 'IN_REVIEW', 'APPROVED', 'CHANGES_REQUESTED');

-- CreateEnum
CREATE TYPE "SourceVerificationStatus" AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');

-- AlterTable
ALTER TABLE "historical_entities" ADD COLUMN     "deleted_at" TIMESTAMPTZ(3),
ADD COLUMN     "historical_phase_id" UUID,
ADD COLUMN     "review_note" TEXT,
ADD COLUMN     "review_status" "HistoricalReviewStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "reviewed_at" TIMESTAMPTZ(3),
ADD COLUMN     "reviewed_by_id" VARCHAR(36),
ADD COLUMN     "reviewed_version" INTEGER,
ADD COLUMN     "time" JSONB NOT NULL DEFAULT '{"kind":"UNKNOWN","note":"Chưa xác định thời gian"}',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "start_year" SET DATA TYPE INTEGER,
ALTER COLUMN "end_year" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "historical_periods" ADD COLUMN     "deleted_at" TIMESTAMPTZ(3),
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "time" JSONB NOT NULL DEFAULT '{"kind":"UNKNOWN","note":"Chưa xác định thời gian"}',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "start_year" SET DATA TYPE INTEGER,
ALTER COLUMN "end_year" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "historical_phases" ADD COLUMN     "created_by_id" VARCHAR(36),
ADD COLUMN     "deleted_at" TIMESTAMPTZ(3),
ADD COLUMN     "summary" TEXT,
ADD COLUMN     "time" JSONB NOT NULL DEFAULT '{"kind":"UNKNOWN","note":"Chưa xác định thời gian"}',
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "start_year" SET DATA TYPE INTEGER,
ALTER COLUMN "end_year" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "series" ADD COLUMN     "historical_entity_revision_id" UUID,
ADD COLUMN     "primary_historical_event_id" UUID,
ADD COLUMN     "publication_evidence" JSONB,
ALTER COLUMN "start_year" SET DATA TYPE INTEGER,
ALTER COLUMN "end_year" SET DATA TYPE INTEGER;

-- AlterTable
ALTER TABLE "series_sources" ADD COLUMN     "historical_citation_id" UUID,
ADD COLUMN     "source_revision_id" UUID;

-- AlterTable
ALTER TABLE "sources" ADD COLUMN     "verification_note" TEXT,
ADD COLUMN     "verification_status" "SourceVerificationStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "verified_at" TIMESTAMPTZ(3),
ADD COLUMN     "verified_by_id" VARCHAR(36),
ADD COLUMN     "verified_version" INTEGER,
ADD COLUMN     "version" INTEGER NOT NULL DEFAULT 1,
ALTER COLUMN "publication_year" SET DATA TYPE INTEGER;

-- CreateTable
CREATE TABLE "source_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "source_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "file_asset_id" UUID,
    "created_by_id" VARCHAR(36),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "source_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historical_entity_revisions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_id" UUID NOT NULL,
    "version" INTEGER NOT NULL,
    "snapshot" JSONB NOT NULL,
    "created_by_id" VARCHAR(36),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historical_entity_revisions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historical_citations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "period_id" UUID,
    "phase_id" UUID,
    "entity_id" UUID,
    "source_id" UUID NOT NULL,
    "source_revision_id" UUID NOT NULL,
    "locator" VARCHAR(255) NOT NULL DEFAULT '',
    "excerpt" TEXT,
    "note" TEXT,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_by_id" VARCHAR(36) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "historical_citations_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "source_revisions_source_id_version_key" ON "source_revisions"("source_id", "version");

-- CreateIndex
CREATE UNIQUE INDEX "historical_entity_revisions_entity_id_version_key" ON "historical_entity_revisions"("entity_id", "version");

-- CreateIndex
CREATE INDEX "historical_citations_entity_id_idx" ON "historical_citations"("entity_id");

-- CreateIndex
CREATE INDEX "historical_citations_period_id_idx" ON "historical_citations"("period_id");

-- CreateIndex
CREATE INDEX "historical_citations_phase_id_idx" ON "historical_citations"("phase_id");

-- CreateIndex
CREATE INDEX "historical_entities_historical_phase_id_review_status_delet_idx" ON "historical_entities"("historical_phase_id", "review_status", "deleted_at");

-- AddForeignKey
ALTER TABLE "historical_entities" ADD CONSTRAINT "historical_entities_historical_phase_id_fkey" FOREIGN KEY ("historical_phase_id") REFERENCES "historical_phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_primary_historical_event_id_fkey" FOREIGN KEY ("primary_historical_event_id") REFERENCES "historical_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_historical_entity_revision_id_fkey" FOREIGN KEY ("historical_entity_revision_id") REFERENCES "historical_entity_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_sources" ADD CONSTRAINT "series_sources_source_revision_id_fkey" FOREIGN KEY ("source_revision_id") REFERENCES "source_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series_sources" ADD CONSTRAINT "series_sources_historical_citation_id_fkey" FOREIGN KEY ("historical_citation_id") REFERENCES "historical_citations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_revisions" ADD CONSTRAINT "source_revisions_file_asset_id_fkey" FOREIGN KEY ("file_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "source_revisions" ADD CONSTRAINT "source_revisions_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historical_entity_revisions" ADD CONSTRAINT "historical_entity_revisions_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "historical_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historical_citations" ADD CONSTRAINT "historical_citations_period_id_fkey" FOREIGN KEY ("period_id") REFERENCES "historical_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historical_citations" ADD CONSTRAINT "historical_citations_phase_id_fkey" FOREIGN KEY ("phase_id") REFERENCES "historical_phases"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historical_citations" ADD CONSTRAINT "historical_citations_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "historical_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historical_citations" ADD CONSTRAINT "historical_citations_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historical_citations" ADD CONSTRAINT "historical_citations_source_revision_id_fkey" FOREIGN KEY ("source_revision_id") REFERENCES "source_revisions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;


UPDATE historical_periods SET time=CASE
 WHEN start_year IS NULL AND end_year IS NULL AND false THEN jsonb_build_object('kind','UNKNOWN','note','Chưa xác định thời gian trong dữ liệu cũ')
 
 ELSE jsonb_build_object('kind','RANGE','start',CASE WHEN start_year IS NULL THEN NULL ELSE jsonb_build_object('year',start_year,'precision','YEAR','approximate',false) END,'end',CASE WHEN end_year IS NULL THEN NULL ELSE jsonb_build_object('year',CASE WHEN end_year=1 THEN -1 ELSE end_year-1 END,'precision','YEAR','approximate',false) END,'endState',CASE WHEN end_year IS NOT NULL THEN 'KNOWN' ELSE 'ONGOING' END) END;

UPDATE historical_phases SET time=CASE
 WHEN start_year IS NULL AND end_year IS NULL AND false THEN jsonb_build_object('kind','UNKNOWN','note','Chưa xác định thời gian trong dữ liệu cũ')
 
 ELSE jsonb_build_object('kind','RANGE','start',CASE WHEN start_year IS NULL THEN NULL ELSE jsonb_build_object('year',start_year,'precision','YEAR','approximate',false) END,'end',CASE WHEN end_year IS NULL THEN NULL ELSE jsonb_build_object('year',CASE WHEN end_year=1 THEN -1 ELSE end_year-1 END,'precision','YEAR','approximate',false) END,'endState',CASE WHEN end_year IS NOT NULL THEN 'KNOWN' ELSE 'ONGOING' END) END;

UPDATE historical_entities SET time=CASE
 WHEN start_year IS NULL AND end_year IS NULL AND true THEN jsonb_build_object('kind','UNKNOWN','note','Chưa xác định thời gian trong dữ liệu cũ')
 WHEN start_year=end_year THEN jsonb_build_object('kind','POINT','at',jsonb_build_object('year',start_year,'precision','YEAR','approximate',false))
 ELSE jsonb_build_object('kind','RANGE','start',CASE WHEN start_year IS NULL THEN NULL ELSE jsonb_build_object('year',start_year,'precision','YEAR','approximate',false) END,'end',CASE WHEN end_year IS NULL THEN NULL ELSE jsonb_build_object('year',end_year,'precision','YEAR','approximate',false) END,'endState',CASE WHEN end_year IS NOT NULL THEN 'KNOWN' ELSE 'UNKNOWN' END) END;

ALTER TABLE historical_citations ADD CONSTRAINT historical_citation_one_owner CHECK (num_nonnulls(period_id,phase_id,entity_id)=1);
CREATE UNIQUE INDEX historical_citation_period_source_locator ON historical_citations(period_id,source_id,locator) WHERE period_id IS NOT NULL;
CREATE UNIQUE INDEX historical_citation_phase_source_locator ON historical_citations(phase_id,source_id,locator) WHERE phase_id IS NOT NULL;
CREATE UNIQUE INDEX historical_citation_entity_source_locator ON historical_citations(entity_id,source_id,locator) WHERE entity_id IS NOT NULL;
ALTER TABLE historical_entities ADD CONSTRAINT historical_entity_no_year_zero CHECK ((start_year IS NULL OR start_year<>0) AND (end_year IS NULL OR end_year<>0));
INSERT INTO source_revisions(source_id,version,snapshot,file_asset_id,created_by_id) SELECT id,version,to_jsonb(s),file_asset_id,created_by_id FROM sources s;
INSERT INTO historical_entity_revisions(entity_id,version,snapshot,created_by_id) SELECT id,version,to_jsonb(e),created_by_id FROM historical_entities e;
UPDATE series_sources ss SET source_revision_id=r.id FROM source_revisions r WHERE ss.source_id=r.source_id AND r.version=1;
UPDATE series SET publication_evidence=jsonb_build_object('legacy',true,'verified',false,'sources','[]'::jsonb) WHERE status='PUBLISHED';
COMMIT;
