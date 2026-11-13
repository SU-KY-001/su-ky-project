-- Archived DDL: recreates the script-workflow tables dropped by migration `drop_script_workflow`.
-- Run on top of a database that has the `init` schema (users, series, episode_narrations).
-- Not a Prisma migration; apply manually when restoring the workflow (see ../README.md).

CREATE TYPE "audio_provider" AS ENUM ('UPLOAD', 'ELEVENLABS');

ALTER TABLE "episode_narrations"
  ADD COLUMN "script_publication_id" INTEGER,
  ADD COLUMN "script_publication_episode_no" SMALLINT,
  ADD COLUMN "audio_provider" "audio_provider";

-- CreateTable
CREATE TABLE "workflow_runs" (
    "id" SERIAL NOT NULL,
    "series_id" UUID,
    "topic" TEXT NOT NULL,
    "focus_hint" TEXT,
    "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    "current_step" VARCHAR(64),
    "created_by_id" VARCHAR(36) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "completed_at" TIMESTAMPTZ(3),

-- CreateTable
CREATE TABLE "workflow_steps" (
    "id" SERIAL NOT NULL,
    "workflow_run_id" INTEGER NOT NULL,
    "step_type" VARCHAR(64) NOT NULL,
    "status" VARCHAR(32) NOT NULL DEFAULT 'PENDING',
    "current_version" INTEGER,
    "approved_version" INTEGER,
    "error_message" TEXT,
    "incoming_guidance" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

-- CreateTable
CREATE TABLE "step_versions" (
    "id" SERIAL NOT NULL,
    "workflow_step_id" INTEGER NOT NULL,
    "parent_version_id" INTEGER,
    "version" INTEGER NOT NULL,
    "input_json" JSONB,
    "output_json" JSONB NOT NULL,
    "human_feedback" TEXT,
    "validation_status" VARCHAR(32) NOT NULL DEFAULT 'valid',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

-- CreateTable
CREATE TABLE "workflow_events" (
    "id" SERIAL NOT NULL,
    "workflow_run_id" INTEGER NOT NULL,
    "event_type" VARCHAR(64) NOT NULL,
    "message" TEXT NOT NULL,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

-- CreateTable
CREATE TABLE "script_publications" (
    "id" SERIAL NOT NULL,
    "workflow_run_id" INTEGER NOT NULL,
    "approved_version_id" INTEGER NOT NULL,
    "approved_by_id" VARCHAR(36) NOT NULL,
    "final_script" TEXT NOT NULL,
    "word_count" INTEGER NOT NULL,
    "estimated_duration_seconds" INTEGER NOT NULL,
    "published_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

-- CreateIndex
CREATE INDEX "workflow_runs_created_by_id_created_at_idx" ON "workflow_runs"("created_by_id", "created_at");

-- CreateIndex
CREATE INDEX "workflow_runs_series_id_idx" ON "workflow_runs"("series_id");

-- CreateIndex
CREATE UNIQUE INDEX "workflow_steps_workflow_run_id_step_type_key" ON "workflow_steps"("workflow_run_id", "step_type");

-- CreateIndex
CREATE INDEX "step_versions_parent_version_id_idx" ON "step_versions"("parent_version_id");

-- CreateIndex
CREATE UNIQUE INDEX "step_versions_workflow_step_id_version_key" ON "step_versions"("workflow_step_id", "version");

-- CreateIndex
CREATE INDEX "workflow_events_workflow_run_id_id_idx" ON "workflow_events"("workflow_run_id", "id");

-- CreateIndex
CREATE UNIQUE INDEX "script_publications_approved_version_id_key" ON "script_publications"("approved_version_id");

-- CreateIndex
CREATE INDEX "script_publications_workflow_run_id_idx" ON "script_publications"("workflow_run_id");

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_runs" ADD CONSTRAINT "workflow_runs_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_steps" ADD CONSTRAINT "workflow_steps_workflow_run_id_fkey" FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_versions" ADD CONSTRAINT "step_versions_workflow_step_id_fkey" FOREIGN KEY ("workflow_step_id") REFERENCES "workflow_steps"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "step_versions" ADD CONSTRAINT "step_versions_parent_version_id_fkey" FOREIGN KEY ("parent_version_id") REFERENCES "step_versions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "workflow_events" ADD CONSTRAINT "workflow_events_workflow_run_id_fkey" FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_publications" ADD CONSTRAINT "script_publications_workflow_run_id_fkey" FOREIGN KEY ("workflow_run_id") REFERENCES "workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_publications" ADD CONSTRAINT "script_publications_approved_version_id_fkey" FOREIGN KEY ("approved_version_id") REFERENCES "step_versions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "script_publications" ADD CONSTRAINT "script_publications_approved_by_id_fkey" FOREIGN KEY ("approved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_narrations" ADD CONSTRAINT "episode_narrations_script_publication_id_fkey" FOREIGN KEY ("script_publication_id") REFERENCES "script_publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE UNIQUE INDEX "episode_narrations_script_publication_id_episode_no_key" ON "episode_narrations"("script_publication_id", "script_publication_episode_no");

ALTER TABLE "episode_narrations"
  ADD CONSTRAINT "episode_narrations_publication_pair_check" CHECK (("script_publication_id" IS NULL) = ("script_publication_episode_no" IS NULL)),
  ADD CONSTRAINT "episode_narrations_publication_episode_no_check" CHECK ("script_publication_episode_no" IS NULL OR "script_publication_episode_no" BETWEEN 1 AND 3);
