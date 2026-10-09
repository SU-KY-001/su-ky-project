CREATE EXTENSION IF NOT EXISTS unaccent;
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE OR REPLACE FUNCTION immutable_unaccent(text)
RETURNS text
LANGUAGE sql
IMMUTABLE
PARALLEL SAFE
STRICT
AS $$ SELECT public.unaccent('public.unaccent'::regdictionary, $1) $$;

-- CreateEnum
CREATE TYPE "content_status" AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN');

-- CreateEnum
CREATE TYPE "narration_type" AS ENUM ('THIRD_PERSON', 'FIRST_PERSON');

-- CreateEnum
CREATE TYPE "audio_provider" AS ENUM ('UPLOAD', 'ELEVENLABS');

-- CreateEnum
CREATE TYPE "media_kind" AS ENUM ('AUDIO', 'IMAGE');

-- CreateEnum
CREATE TYPE "media_status" AS ENUM ('PENDING', 'READY', 'DELETED');

-- CreateEnum
CREATE TYPE "historical_entity_type" AS ENUM ('FIGURE', 'EVENT');

-- CreateEnum
CREATE TYPE "entity_tag_status" AS ENUM ('SUGGESTED', 'CONFIRMED', 'REJECTED');

-- CreateEnum
CREATE TYPE "tag_origin" AS ENUM ('AI', 'MODERATOR');

-- CreateEnum
CREATE TYPE "source_tier" AS ENUM ('TIER_1_CHINH_SU', 'TIER_2_KHAO_CO', 'TIER_3_KHOA_HOC', 'TIER_4_DA_SU');

-- CreateEnum
CREATE TYPE "mission_activity_type" AS ENUM ('COMPLETE_EPISODE', 'PASS_QUIZ');

-- CreateEnum
CREATE TYPE "xp_source_type" AS ENUM ('EPISODE_COMPLETION', 'QUIZ_PASS', 'WEEKLY_MISSION', 'ADMIN_ADJUSTMENT');

-- CreateTable
CREATE TABLE "users" (
    "id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "email_verified" BOOLEAN NOT NULL DEFAULT false,
    "image" VARCHAR(2048),
    "role" VARCHAR(16) NOT NULL DEFAULT 'user',
    "banned" BOOLEAN NOT NULL DEFAULT false,
    "ban_reason" TEXT,
    "ban_expires_at" TIMESTAMPTZ(3),
    "total_xp" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" VARCHAR(36) NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "token" VARCHAR(500) NOT NULL,
    "ip_address" VARCHAR(45),
    "user_agent" TEXT,
    "user_id" VARCHAR(36) NOT NULL,
    "impersonated_by_id" VARCHAR(36),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "accounts" (
    "id" VARCHAR(36) NOT NULL,
    "account_id" TEXT NOT NULL,
    "provider_id" VARCHAR(64) NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "access_token" TEXT,
    "refresh_token" TEXT,
    "id_token" TEXT,
    "access_token_expires_at" TIMESTAMPTZ(3),
    "refresh_token_expires_at" TIMESTAMPTZ(3),
    "scope" TEXT,
    "password" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verifications" (
    "id" VARCHAR(36) NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "topics" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(280) NOT NULL,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" VARCHAR(36),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "topics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historical_periods" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(280) NOT NULL,
    "start_year" SMALLINT,
    "end_year" SMALLINT,
    "sort_order" SMALLINT NOT NULL DEFAULT 0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" VARCHAR(36),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "historical_periods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "historical_entities" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entity_type" "historical_entity_type" NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(280) NOT NULL,
    "aliases" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "start_year" SMALLINT,
    "end_year" SMALLINT,
    "summary" TEXT,
    "created_by_id" VARCHAR(36),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "historical_entities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tier" "source_tier" NOT NULL,
    "title" VARCHAR(500) NOT NULL,
    "original_title" VARCHAR(500),
    "author" VARCHAR(255),
    "translator" VARCHAR(255),
    "publisher" VARCHAR(255),
    "publication_year" SMALLINT,
    "edition" VARCHAR(100),
    "isbn" VARCHAR(17),
    "url" VARCHAR(2048),
    "created_by_id" VARCHAR(36),
    "archived_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "series" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "owner_id" VARCHAR(36) NOT NULL,
    "topic_id" UUID,
    "historical_period_id" UUID,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(280) NOT NULL,
    "description" TEXT,
    "cover_image_asset_id" UUID,
    "start_year" SMALLINT,
    "end_year" SMALLINT,
    "status" "content_status" NOT NULL DEFAULT 'DRAFT',
    "status_before_delete" "content_status",
    "admin_locked_at" TIMESTAMPTZ(3),
    "admin_locked_by_id" VARCHAR(36),
    "published_at" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "series_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episodes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "series_id" UUID NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "slug" VARCHAR(280) NOT NULL,
    "description" TEXT,
    "sort_order" INTEGER NOT NULL,
    "status" "content_status" NOT NULL DEFAULT 'DRAFT',
    "status_before_delete" "content_status",
    "admin_locked_at" TIMESTAMPTZ(3),
    "admin_locked_by_id" VARCHAR(36),
    "published_at" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "episodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episode_narrations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "episode_id" UUID NOT NULL,
    "narration_type" "narration_type" NOT NULL,
    "narrator_entity_id" UUID,
    "script_content" TEXT,
    "script_publication_id" INTEGER,
    "script_publication_episode_no" SMALLINT,
    "audio_asset_id" UUID,
    "audio_provider" "audio_provider",
    "script_updated_at" TIMESTAMPTZ(3),
    "audio_attached_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "episode_narrations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "media_assets" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kind" "media_kind" NOT NULL,
    "public_id" VARCHAR(255) NOT NULL,
    "status" "media_status" NOT NULL DEFAULT 'PENDING',
    "version" BIGINT,
    "format" VARCHAR(10),
    "size_bytes" BIGINT,
    "duration_ms" INTEGER,
    "uploaded_by_id" VARCHAR(36) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMPTZ(3),
    "detached_at" TIMESTAMPTZ(3),
    "deleted_at" TIMESTAMPTZ(3),

    CONSTRAINT "media_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episode_sources" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "episode_id" UUID NOT NULL,
    "source_id" UUID NOT NULL,
    "locator" VARCHAR(255) NOT NULL DEFAULT '',
    "excerpt" TEXT,
    "origin" "tag_origin" NOT NULL,
    "sort_order" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "episode_sources_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "episode_entity_tags" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "episode_id" UUID NOT NULL,
    "entity_id" UUID NOT NULL,
    "status" "entity_tag_status" NOT NULL DEFAULT 'SUGGESTED',
    "origin" "tag_origin" NOT NULL,
    "confirmed_by_id" VARCHAR(36),
    "confirmed_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "episode_entity_tags_pkey" PRIMARY KEY ("id")
);

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

    CONSTRAINT "workflow_runs_pkey" PRIMARY KEY ("id")
);

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

    CONSTRAINT "workflow_steps_pkey" PRIMARY KEY ("id")
);

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

    CONSTRAINT "step_versions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "workflow_events" (
    "id" SERIAL NOT NULL,
    "workflow_run_id" INTEGER NOT NULL,
    "event_type" VARCHAR(64) NOT NULL,
    "message" TEXT NOT NULL,
    "metadata_json" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "workflow_events_pkey" PRIMARY KEY ("id")
);

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

    CONSTRAINT "script_publications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quizzes" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "episode_id" UUID NOT NULL,
    "pass_score_percent" SMALLINT NOT NULL DEFAULT 80,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "quizzes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_questions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quiz_id" UUID NOT NULL,
    "question_text" TEXT NOT NULL,
    "explanation" TEXT,
    "sort_order" SMALLINT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "quiz_questions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_options" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "question_id" UUID NOT NULL,
    "option_label" CHAR(1) NOT NULL,
    "option_text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "quiz_options_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "quiz_attempts" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "quiz_id" UUID NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "answers" JSONB NOT NULL,
    "score_percent" SMALLINT NOT NULL,
    "is_passed" BOOLEAN NOT NULL,
    "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "quiz_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "listening_progress" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" VARCHAR(36) NOT NULL,
    "narration_id" UUID NOT NULL,
    "episode_id" UUID NOT NULL,
    "audio_asset_id" UUID NOT NULL,
    "position_ms" INTEGER NOT NULL DEFAULT 0,
    "played_bitmap" BYTEA NOT NULL,
    "played_seconds" INTEGER NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMPTZ(3),
    "last_listened_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "listening_progress_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mission_templates" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "title" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "activity_type" "mission_activity_type" NOT NULL,
    "target_count" SMALLINT NOT NULL,
    "xp_reward" INTEGER NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_by_id" VARCHAR(36),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "mission_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "weekly_missions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "mission_template_id" UUID NOT NULL,
    "week_start_date" DATE NOT NULL,
    "title" VARCHAR(255) NOT NULL,
    "activity_type" "mission_activity_type" NOT NULL,
    "target_count" SMALLINT NOT NULL,
    "xp_reward" INTEGER NOT NULL,
    "activated_at" TIMESTAMPTZ(3) NOT NULL,
    "activated_by_id" VARCHAR(36) NOT NULL,

    CONSTRAINT "weekly_missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_weekly_missions" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "weekly_mission_id" UUID NOT NULL,
    "user_id" VARCHAR(36) NOT NULL,
    "progress_count" SMALLINT NOT NULL DEFAULT 0,
    "completed_at" TIMESTAMPTZ(3),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "user_weekly_missions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "user_weekly_mission_items" (
    "user_weekly_mission_id" UUID NOT NULL,
    "content_id" UUID NOT NULL,
    "counted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_weekly_mission_items_pkey" PRIMARY KEY ("user_weekly_mission_id","content_id")
);

-- CreateTable
CREATE TABLE "xp_awards" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" VARCHAR(36) NOT NULL,
    "source_type" "xp_source_type" NOT NULL,
    "source_id" UUID NOT NULL,
    "xp_amount" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "xp_awards_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "idempotency_keys" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" VARCHAR(36) NOT NULL,
    "key" VARCHAR(255) NOT NULL,
    "method" VARCHAR(10) NOT NULL,
    "route" VARCHAR(255) NOT NULL,
    "request_hash" CHAR(64) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
    "response_status" SMALLINT,
    "response_body" JSONB,
    "response_location" VARCHAR(2048),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "idempotency_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "rate_limit_buckets" (
    "bucket_key" VARCHAR(255) NOT NULL,
    "window_start" TIMESTAMPTZ(3) NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "rate_limit_buckets_pkey" PRIMARY KEY ("bucket_key","window_start")
);

-- CreateTable
CREATE TABLE "system_configs" (
    "key" VARCHAR(100) NOT NULL,
    "value" JSONB NOT NULL,
    "description" TEXT,
    "updated_by_id" VARCHAR(36),
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "system_configs_pkey" PRIMARY KEY ("key")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "actor_id" VARCHAR(36),
    "action" VARCHAR(64) NOT NULL,
    "resource_type" VARCHAR(64) NOT NULL,
    "resource_id" VARCHAR(128) NOT NULL,
    "changes" JSONB NOT NULL DEFAULT '{}',
    "ip_address" VARCHAR(45),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_token_key" ON "sessions"("token");

-- CreateIndex
CREATE INDEX "sessions_user_id_idx" ON "sessions"("user_id");

-- CreateIndex
CREATE INDEX "accounts_user_id_idx" ON "accounts"("user_id");

-- CreateIndex
CREATE INDEX "verifications_identifier_idx" ON "verifications"("identifier");

-- CreateIndex
CREATE UNIQUE INDEX "topics_name_key" ON "topics"("name");

-- CreateIndex
CREATE UNIQUE INDEX "topics_slug_key" ON "topics"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "historical_periods_name_key" ON "historical_periods"("name");

-- CreateIndex
CREATE UNIQUE INDEX "historical_periods_slug_key" ON "historical_periods"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "historical_entities_slug_key" ON "historical_entities"("slug");

-- CreateIndex
CREATE INDEX "historical_entities_entity_type_idx" ON "historical_entities"("entity_type");

-- CreateIndex
CREATE UNIQUE INDEX "series_slug_key" ON "series"("slug");

-- CreateIndex
CREATE INDEX "series_owner_id_idx" ON "series"("owner_id");

-- CreateIndex
CREATE INDEX "series_topic_id_idx" ON "series"("topic_id");

-- CreateIndex
CREATE INDEX "series_historical_period_id_idx" ON "series"("historical_period_id");

-- CreateIndex
CREATE INDEX "series_year_range_idx" ON "series"("start_year", "end_year");

-- CreateIndex
CREATE UNIQUE INDEX "episodes_slug_key" ON "episodes"("slug");

-- CreateIndex
CREATE INDEX "episodes_series_id_sort_order_idx" ON "episodes"("series_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "episode_narrations_audio_asset_id_key" ON "episode_narrations"("audio_asset_id");

-- CreateIndex
CREATE UNIQUE INDEX "episode_narrations_episode_id_narration_type_key" ON "episode_narrations"("episode_id", "narration_type");

-- CreateIndex
CREATE UNIQUE INDEX "episode_narrations_script_publication_id_episode_no_key" ON "episode_narrations"("script_publication_id", "script_publication_episode_no");

-- CreateIndex
CREATE UNIQUE INDEX "media_assets_public_id_key" ON "media_assets"("public_id");

-- CreateIndex
CREATE INDEX "media_assets_status_created_at_idx" ON "media_assets"("status", "created_at");

-- CreateIndex
CREATE INDEX "media_assets_status_detached_at_idx" ON "media_assets"("status", "detached_at");

-- CreateIndex
CREATE INDEX "media_assets_uploaded_by_id_idx" ON "media_assets"("uploaded_by_id");

-- CreateIndex
CREATE INDEX "episode_sources_source_id_idx" ON "episode_sources"("source_id");

-- CreateIndex
CREATE UNIQUE INDEX "episode_sources_episode_id_source_id_locator_key" ON "episode_sources"("episode_id", "source_id", "locator");

-- CreateIndex
CREATE INDEX "episode_entity_tags_entity_id_status_idx" ON "episode_entity_tags"("entity_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "episode_entity_tags_episode_id_entity_id_key" ON "episode_entity_tags"("episode_id", "entity_id");

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

-- CreateIndex
CREATE UNIQUE INDEX "quizzes_episode_id_key" ON "quizzes"("episode_id");

-- CreateIndex
CREATE INDEX "quiz_questions_quiz_id_sort_order_idx" ON "quiz_questions"("quiz_id", "sort_order");

-- CreateIndex
CREATE UNIQUE INDEX "quiz_options_question_id_option_label_key" ON "quiz_options"("question_id", "option_label");

-- CreateIndex
CREATE INDEX "quiz_attempts_user_id_quiz_id_submitted_at_idx" ON "quiz_attempts"("user_id", "quiz_id", "submitted_at");

-- CreateIndex
CREATE INDEX "listening_progress_user_id_last_listened_at_idx" ON "listening_progress"("user_id", "last_listened_at");

-- CreateIndex
CREATE UNIQUE INDEX "listening_progress_user_id_narration_id_key" ON "listening_progress"("user_id", "narration_id");

-- CreateIndex
CREATE INDEX "weekly_missions_week_start_date_idx" ON "weekly_missions"("week_start_date");

-- CreateIndex
CREATE UNIQUE INDEX "weekly_missions_mission_template_id_week_start_date_key" ON "weekly_missions"("mission_template_id", "week_start_date");

-- CreateIndex
CREATE INDEX "user_weekly_missions_user_id_idx" ON "user_weekly_missions"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "user_weekly_missions_weekly_mission_id_user_id_key" ON "user_weekly_missions"("weekly_mission_id", "user_id");

-- CreateIndex
CREATE INDEX "xp_awards_user_id_created_at_idx" ON "xp_awards"("user_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "xp_awards_user_id_source_type_source_id_key" ON "xp_awards"("user_id", "source_type", "source_id");

-- CreateIndex
CREATE INDEX "idempotency_keys_expires_at_idx" ON "idempotency_keys"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "idempotency_keys_user_id_key_key" ON "idempotency_keys"("user_id", "key");

-- CreateIndex
CREATE INDEX "audit_logs_resource_type_resource_id_idx" ON "audit_logs"("resource_type", "resource_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "accounts" ADD CONSTRAINT "accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topics" ADD CONSTRAINT "topics_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historical_periods" ADD CONSTRAINT "historical_periods_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "historical_entities" ADD CONSTRAINT "historical_entities_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sources" ADD CONSTRAINT "sources_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_topic_id_fkey" FOREIGN KEY ("topic_id") REFERENCES "topics"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_historical_period_id_fkey" FOREIGN KEY ("historical_period_id") REFERENCES "historical_periods"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_cover_image_asset_id_fkey" FOREIGN KEY ("cover_image_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_admin_locked_by_id_fkey" FOREIGN KEY ("admin_locked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_series_id_fkey" FOREIGN KEY ("series_id") REFERENCES "series"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episodes" ADD CONSTRAINT "episodes_admin_locked_by_id_fkey" FOREIGN KEY ("admin_locked_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_narrations" ADD CONSTRAINT "episode_narrations_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_narrations" ADD CONSTRAINT "episode_narrations_narrator_entity_id_fkey" FOREIGN KEY ("narrator_entity_id") REFERENCES "historical_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_narrations" ADD CONSTRAINT "episode_narrations_script_publication_id_fkey" FOREIGN KEY ("script_publication_id") REFERENCES "script_publications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_narrations" ADD CONSTRAINT "episode_narrations_audio_asset_id_fkey" FOREIGN KEY ("audio_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "media_assets" ADD CONSTRAINT "media_assets_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_sources" ADD CONSTRAINT "episode_sources_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_sources" ADD CONSTRAINT "episode_sources_source_id_fkey" FOREIGN KEY ("source_id") REFERENCES "sources"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_entity_tags" ADD CONSTRAINT "episode_entity_tags_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_entity_tags" ADD CONSTRAINT "episode_entity_tags_entity_id_fkey" FOREIGN KEY ("entity_id") REFERENCES "historical_entities"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "episode_entity_tags" ADD CONSTRAINT "episode_entity_tags_confirmed_by_id_fkey" FOREIGN KEY ("confirmed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

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
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_options" ADD CONSTRAINT "quiz_options_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "quiz_questions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_quiz_id_fkey" FOREIGN KEY ("quiz_id") REFERENCES "quizzes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "quiz_attempts" ADD CONSTRAINT "quiz_attempts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listening_progress" ADD CONSTRAINT "listening_progress_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listening_progress" ADD CONSTRAINT "listening_progress_narration_id_fkey" FOREIGN KEY ("narration_id") REFERENCES "episode_narrations"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listening_progress" ADD CONSTRAINT "listening_progress_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "listening_progress" ADD CONSTRAINT "listening_progress_audio_asset_id_fkey" FOREIGN KEY ("audio_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mission_templates" ADD CONSTRAINT "mission_templates_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_missions" ADD CONSTRAINT "weekly_missions_mission_template_id_fkey" FOREIGN KEY ("mission_template_id") REFERENCES "mission_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "weekly_missions" ADD CONSTRAINT "weekly_missions_activated_by_id_fkey" FOREIGN KEY ("activated_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_weekly_missions" ADD CONSTRAINT "user_weekly_missions_weekly_mission_id_fkey" FOREIGN KEY ("weekly_mission_id") REFERENCES "weekly_missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_weekly_missions" ADD CONSTRAINT "user_weekly_missions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_weekly_mission_items" ADD CONSTRAINT "user_weekly_mission_items_user_weekly_mission_id_fkey" FOREIGN KEY ("user_weekly_mission_id") REFERENCES "user_weekly_missions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "xp_awards" ADD CONSTRAINT "xp_awards_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "idempotency_keys" ADD CONSTRAINT "idempotency_keys_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "system_configs" ADD CONSTRAINT "system_configs_updated_by_id_fkey" FOREIGN KEY ("updated_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Constraints and indexes Prisma cannot express.
ALTER TABLE "users"
  ADD CONSTRAINT "users_role_check" CHECK ("role" IN ('user', 'moderator', 'admin')),
  ADD CONSTRAINT "users_total_xp_check" CHECK ("total_xp" >= 0);

ALTER TABLE "historical_periods"
  ADD CONSTRAINT "historical_periods_start_year_check" CHECK ("start_year" IS NULL OR ("start_year" <> 0 AND "start_year" <= 1945)),
  ADD CONSTRAINT "historical_periods_end_year_check" CHECK ("end_year" IS NULL OR ("end_year" <> 0 AND "end_year" <= 1945)),
  ADD CONSTRAINT "historical_periods_year_range_check" CHECK ("start_year" IS NULL OR "end_year" IS NULL OR "start_year" <= "end_year");

ALTER TABLE "series"
  ADD CONSTRAINT "series_start_year_check" CHECK ("start_year" IS NULL OR ("start_year" <> 0 AND "start_year" <= 1945)),
  ADD CONSTRAINT "series_end_year_check" CHECK ("end_year" IS NULL OR ("end_year" <> 0 AND "end_year" <= 1945)),
  ADD CONSTRAINT "series_year_range_check" CHECK ("start_year" IS NULL OR "end_year" IS NULL OR "start_year" <= "end_year");

ALTER TABLE "media_assets"
  ADD CONSTRAINT "media_assets_ready_metadata_check" CHECK ("status" <> 'READY' OR ("kind" = 'IMAGE' OR "duration_ms" > 0));

ALTER TABLE "episode_narrations"
  ADD CONSTRAINT "episode_narrations_narrator_type_check" CHECK ("narrator_entity_id" IS NULL OR "narration_type" = 'FIRST_PERSON'),
  ADD CONSTRAINT "episode_narrations_publication_pair_check" CHECK (("script_publication_id" IS NULL) = ("script_publication_episode_no" IS NULL)),
  ADD CONSTRAINT "episode_narrations_publication_episode_no_check" CHECK ("script_publication_episode_no" IS NULL OR "script_publication_episode_no" BETWEEN 1 AND 3);

ALTER TABLE "quizzes"
  ADD CONSTRAINT "quizzes_pass_score_percent_check" CHECK ("pass_score_percent" BETWEEN 1 AND 100);

ALTER TABLE "quiz_options"
  ADD CONSTRAINT "quiz_options_option_label_check" CHECK ("option_label" IN ('A', 'B', 'C', 'D'));

ALTER TABLE "quiz_attempts"
  ADD CONSTRAINT "quiz_attempts_score_percent_check" CHECK ("score_percent" BETWEEN 0 AND 100);

ALTER TABLE "mission_templates"
  ADD CONSTRAINT "mission_templates_target_count_check" CHECK ("target_count" >= 1),
  ADD CONSTRAINT "mission_templates_xp_reward_check" CHECK ("xp_reward" >= 0);

ALTER TABLE "weekly_missions"
  ADD CONSTRAINT "weekly_missions_week_start_date_check" CHECK (EXTRACT(ISODOW FROM "week_start_date") = 1);

ALTER TABLE "idempotency_keys"
  ADD CONSTRAINT "idempotency_keys_status_check" CHECK ("status" IN ('IN_PROGRESS', 'COMPLETED'));

CREATE UNIQUE INDEX "sources_isbn_key" ON "sources" ("isbn") WHERE "isbn" IS NOT NULL;
CREATE UNIQUE INDEX "quiz_options_question_id_correct_key" ON "quiz_options" ("question_id") WHERE "is_correct";
CREATE INDEX "series_status_active_idx" ON "series" ("status") WHERE "deleted_at" IS NULL;

CREATE INDEX "sources_title_trgm_idx" ON "sources" USING gin (immutable_unaccent(lower("title")) gin_trgm_ops);
CREATE INDEX "series_title_trgm_idx" ON "series" USING gin (immutable_unaccent(lower("title")) gin_trgm_ops);
CREATE INDEX "episodes_title_trgm_idx" ON "episodes" USING gin (immutable_unaccent(lower("title")) gin_trgm_ops);
CREATE INDEX "historical_entities_name_trgm_idx" ON "historical_entities" USING gin (immutable_unaccent(lower("name")) gin_trgm_ops);
