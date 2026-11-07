-- =============================================================================
-- SU-KY PROJECT - PostgreSQL schema for DrawDB import
--
-- Source of truth: packages/db/prisma/schema.prisma
-- 45 tables, 20 enum types, 81 foreign keys.
--
-- How to import:
--   1. https://www.drawdb.app/editor/templates/blank
--   2. Import -> SQL -> PostgreSQL
--   3. Paste this file
--
-- IMPORTANT: table order is topological on purpose. DrawDB resolves a FOREIGN
-- KEY only if the referenced table was already parsed above it. Do not reorder.
-- =============================================================================


-- =============================================================================
-- ENUM TYPES
-- =============================================================================

CREATE TYPE content_status AS ENUM ('DRAFT', 'PUBLISHED', 'HIDDEN');
CREATE TYPE release_schedule_status AS ENUM ('SCHEDULED', 'READY_TO_PUBLISH', 'PUBLISHING', 'RELEASED', 'BLOCKED', 'FAILED', 'CANCELLED');
CREATE TYPE episode_review_status AS ENUM ('DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED', 'WITHDRAWN');
CREATE TYPE release_reassignment_ticket_status AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED');
CREATE TYPE narration_type AS ENUM ('THIRD_PERSON', 'FIRST_PERSON');
CREATE TYPE media_kind AS ENUM ('AUDIO', 'IMAGE', 'DOCUMENT');
CREATE TYPE media_status AS ENUM ('PENDING', 'READY', 'DELETED');
CREATE TYPE historical_entity_type AS ENUM ('FIGURE', 'EVENT');
CREATE TYPE entity_tag_status AS ENUM ('SUGGESTED', 'CONFIRMED', 'REJECTED');
CREATE TYPE tag_origin AS ENUM ('AI', 'MODERATOR');
CREATE TYPE source_tier AS ENUM ('TIER_1_CHINH_SU', 'TIER_2_KHAO_CO', 'TIER_3_KHOA_HOC', 'TIER_4_DA_SU');
CREATE TYPE mission_activity_type AS ENUM ('COMPLETE_EPISODE', 'PASS_QUIZ');
CREATE TYPE xp_source_type AS ENUM ('EPISODE_COMPLETION', 'QUIZ_PASS', 'WEEKLY_MISSION', 'ADMIN_ADJUSTMENT');
CREATE TYPE source_verification_status AS ENUM ('PENDING', 'VERIFIED', 'REJECTED');
CREATE TYPE ai_check_kind AS ENUM ('SCRIPT_REVIEW');
CREATE TYPE ai_check_status AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');
CREATE TYPE ai_issue_kind AS ENUM ('FACT_DOUBT', 'READABILITY');
CREATE TYPE ai_issue_severity AS ENUM ('LOW', 'MEDIUM', 'HIGH');
CREATE TYPE ai_item_status AS ENUM ('OPEN', 'REVIEWED');
CREATE TYPE ai_item_basis AS ENUM ('CONTRADICTED', 'NOT_FOUND');


-- =============================================================================
-- 1. USERS (Better Auth core)
-- =============================================================================

CREATE TABLE users (
  id VARCHAR(36) NOT NULL,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  email_verified BOOLEAN NOT NULL DEFAULT false,
  image VARCHAR(2048),
  role VARCHAR(16) NOT NULL DEFAULT 'user',
  banned BOOLEAN NOT NULL DEFAULT false,
  ban_reason TEXT,
  ban_expires_at TIMESTAMPTZ,
  total_xp INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id)
);

CREATE TABLE sessions (
  id VARCHAR(36) NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  token VARCHAR(500) NOT NULL UNIQUE,
  ip_address VARCHAR(45),
  user_agent TEXT,
  user_id VARCHAR(36) NOT NULL,
  impersonated_by_id VARCHAR(36),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_sessions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE accounts (
  id VARCHAR(36) NOT NULL,
  account_id TEXT NOT NULL,
  provider_id VARCHAR(64) NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  access_token TEXT,
  refresh_token TEXT,
  id_token TEXT,
  access_token_expires_at TIMESTAMPTZ,
  refresh_token_expires_at TIMESTAMPTZ,
  scope TEXT,
  password TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_accounts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);

CREATE TABLE verifications (
  id VARCHAR(36) NOT NULL,
  identifier TEXT NOT NULL,
  value TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id)
);


-- =============================================================================
-- 2. MEDIA
-- =============================================================================

CREATE TABLE media_assets (
  id UUID NOT NULL,
  kind media_kind NOT NULL,
  public_id VARCHAR(255) NOT NULL UNIQUE,
  status media_status NOT NULL DEFAULT 'PENDING',
  version BIGINT,
  format VARCHAR(10),
  size_bytes BIGINT,
  duration_ms INTEGER,
  width_px INTEGER,
  height_px INTEGER,
  uploaded_by_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  verified_at TIMESTAMPTZ,
  detached_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  PRIMARY KEY (id),
  CONSTRAINT fk_media_assets_uploaded_by FOREIGN KEY (uploaded_by_id) REFERENCES users (id) ON DELETE RESTRICT
);


-- =============================================================================
-- 3. HISTORICAL CATALOG
-- =============================================================================

CREATE TABLE topics (
  id UUID NOT NULL,
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(280) NOT NULL UNIQUE,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_id VARCHAR(36),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_topics_created_by FOREIGN KEY (created_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE historical_periods (
  id UUID NOT NULL,
  name VARCHAR(255) NOT NULL UNIQUE,
  slug VARCHAR(280) NOT NULL UNIQUE,
  start_year INTEGER,
  end_year INTEGER,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_id VARCHAR(36),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  time JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  summary TEXT,
  PRIMARY KEY (id),
  CONSTRAINT fk_historical_periods_created_by FOREIGN KEY (created_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE historical_phases (
  id UUID NOT NULL,
  period_id UUID NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  start_year INTEGER,
  end_year INTEGER,
  note TEXT,
  sort_order SMALLINT NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  time JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  summary TEXT,
  created_by_id VARCHAR(36),
  PRIMARY KEY (id),
  CONSTRAINT fk_historical_phases_period FOREIGN KEY (period_id) REFERENCES historical_periods (id) ON DELETE RESTRICT
);

CREATE TABLE historical_entities (
  id UUID NOT NULL,
  entity_type historical_entity_type NOT NULL,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  aliases TEXT,
  start_year INTEGER,
  end_year INTEGER,
  summary TEXT,
  created_by_id VARCHAR(36),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  time JSONB NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  deleted_at TIMESTAMPTZ,
  historical_phase_id UUID,
  PRIMARY KEY (id),
  CONSTRAINT fk_historical_entities_created_by FOREIGN KEY (created_by_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_historical_entities_phase FOREIGN KEY (historical_phase_id) REFERENCES historical_phases (id) ON DELETE RESTRICT
);


-- =============================================================================
-- 4. SOURCES
-- =============================================================================

CREATE TABLE sources (
  id UUID NOT NULL,
  tier source_tier NOT NULL,
  title VARCHAR(500) NOT NULL,
  original_title VARCHAR(500),
  author VARCHAR(255),
  translator VARCHAR(255),
  publisher VARCHAR(255),
  publication_year INTEGER,
  edition VARCHAR(100),
  isbn VARCHAR(17),
  url VARCHAR(2048),
  created_by_id VARCHAR(36),
  archived_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  file_asset_id UUID UNIQUE,
  version INTEGER NOT NULL DEFAULT 1,
  verification_status source_verification_status NOT NULL DEFAULT 'PENDING',
  verified_version INTEGER,
  verified_by_id VARCHAR(36),
  verified_at TIMESTAMPTZ,
  verification_note TEXT,
  PRIMARY KEY (id),
  CONSTRAINT fk_sources_created_by FOREIGN KEY (created_by_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_sources_file_asset FOREIGN KEY (file_asset_id) REFERENCES media_assets (id) ON DELETE RESTRICT
);

CREATE TABLE source_pages (
  id UUID NOT NULL,
  source_id UUID NOT NULL,
  version INTEGER NOT NULL,
  page INTEGER NOT NULL,
  text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_source_pages_source FOREIGN KEY (source_id) REFERENCES sources (id) ON DELETE CASCADE,
  CONSTRAINT uq_source_pages_source_version_page UNIQUE (source_id, version, page)
);

CREATE TABLE source_revisions (
  id UUID NOT NULL,
  source_id UUID NOT NULL,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  file_asset_id UUID,
  created_by_id VARCHAR(36),
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_source_revisions_source FOREIGN KEY (source_id) REFERENCES sources (id) ON DELETE RESTRICT,
  CONSTRAINT fk_source_revisions_file_asset FOREIGN KEY (file_asset_id) REFERENCES media_assets (id) ON DELETE RESTRICT,
  CONSTRAINT uq_source_revisions_source_version UNIQUE (source_id, version)
);

CREATE TABLE historical_entity_revisions (
  id UUID NOT NULL,
  entity_id UUID NOT NULL,
  version INTEGER NOT NULL,
  snapshot JSONB NOT NULL,
  created_by_id VARCHAR(36),
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_historical_entity_revisions_entity FOREIGN KEY (entity_id) REFERENCES historical_entities (id) ON DELETE RESTRICT,
  CONSTRAINT uq_historical_entity_revisions_entity_version UNIQUE (entity_id, version)
);

CREATE TABLE historical_citations (
  id UUID NOT NULL,
  period_id UUID,
  phase_id UUID,
  entity_id UUID,
  source_id UUID NOT NULL,
  source_revision_id UUID NOT NULL,
  locator VARCHAR(255) NOT NULL DEFAULT '',
  excerpt TEXT,
  note TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_by_id VARCHAR(36) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_historical_citations_period FOREIGN KEY (period_id) REFERENCES historical_periods (id) ON DELETE RESTRICT,
  CONSTRAINT fk_historical_citations_phase FOREIGN KEY (phase_id) REFERENCES historical_phases (id) ON DELETE RESTRICT,
  CONSTRAINT fk_historical_citations_entity FOREIGN KEY (entity_id) REFERENCES historical_entities (id) ON DELETE RESTRICT,
  CONSTRAINT fk_historical_citations_source FOREIGN KEY (source_id) REFERENCES sources (id) ON DELETE RESTRICT,
  CONSTRAINT fk_historical_citations_source_revision FOREIGN KEY (source_revision_id) REFERENCES source_revisions (id) ON DELETE RESTRICT
);


-- =============================================================================
-- 5. SERIES AND EPISODES
-- =============================================================================

CREATE TABLE series (
  id UUID NOT NULL,
  owner_id VARCHAR(36) NOT NULL,
  topic_id UUID,
  historical_phase_id UUID,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  description TEXT,
  language VARCHAR(35) NOT NULL DEFAULT 'vi',
  cover_image_asset_id UUID,
  cover_landscape_asset_id UUID,
  start_year INTEGER,
  end_year INTEGER,
  status content_status NOT NULL DEFAULT 'DRAFT',
  status_before_delete content_status,
  admin_locked_at TIMESTAMPTZ,
  admin_locked_by_id VARCHAR(36),
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  primary_historical_event_id UUID,
  historical_entity_revision_id UUID,
  publication_evidence JSONB,
  PRIMARY KEY (id),
  CONSTRAINT fk_series_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_series_topic FOREIGN KEY (topic_id) REFERENCES topics (id) ON DELETE RESTRICT,
  CONSTRAINT fk_series_historical_phase FOREIGN KEY (historical_phase_id) REFERENCES historical_phases (id) ON DELETE RESTRICT,
  CONSTRAINT fk_series_cover_image_asset FOREIGN KEY (cover_image_asset_id) REFERENCES media_assets (id) ON DELETE RESTRICT,
  CONSTRAINT fk_series_cover_landscape_asset FOREIGN KEY (cover_landscape_asset_id) REFERENCES media_assets (id) ON DELETE RESTRICT,
  CONSTRAINT fk_series_admin_locked_by FOREIGN KEY (admin_locked_by_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT fk_series_primary_historical_event FOREIGN KEY (primary_historical_event_id) REFERENCES historical_entities (id) ON DELETE RESTRICT,
  CONSTRAINT fk_series_historical_entity_revision FOREIGN KEY (historical_entity_revision_id) REFERENCES historical_entity_revisions (id) ON DELETE RESTRICT
);

CREATE TABLE episodes (
  id UUID NOT NULL,
  series_id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  description TEXT,
  sort_order INTEGER NOT NULL,
  status content_status NOT NULL DEFAULT 'DRAFT',
  status_before_delete content_status,
  admin_locked_at TIMESTAMPTZ,
  admin_locked_by_id VARCHAR(36),
  published_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  content_revision INTEGER NOT NULL DEFAULT 1,
  publication_approval JSONB,
  PRIMARY KEY (id),
  CONSTRAINT fk_episodes_series FOREIGN KEY (series_id) REFERENCES series (id) ON DELETE RESTRICT,
  CONSTRAINT fk_episodes_admin_locked_by FOREIGN KEY (admin_locked_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE episode_narrations (
  id UUID NOT NULL,
  episode_id UUID NOT NULL,
  narration_type narration_type NOT NULL,
  narrator_entity_id UUID,
  script_content TEXT,
  script_document JSONB,
  dialogue JSONB,
  audio_analysis JSONB,
  audio_asset_id UUID UNIQUE,
  script_updated_at TIMESTAMPTZ,
  audio_attached_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_episode_narrations_episode FOREIGN KEY (episode_id) REFERENCES episodes (id) ON DELETE CASCADE,
  CONSTRAINT fk_episode_narrations_narrator_entity FOREIGN KEY (narrator_entity_id) REFERENCES historical_entities (id) ON DELETE RESTRICT,
  CONSTRAINT fk_episode_narrations_audio_asset FOREIGN KEY (audio_asset_id) REFERENCES media_assets (id) ON DELETE RESTRICT,
  CONSTRAINT uq_episode_narrations_episode_type UNIQUE (episode_id, narration_type)
);

CREATE TABLE episode_attachments (
  id UUID NOT NULL,
  episode_id UUID NOT NULL,
  media_asset_id UUID NOT NULL UNIQUE,
  file_name VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_episode_attachments_episode FOREIGN KEY (episode_id) REFERENCES episodes (id) ON DELETE CASCADE,
  CONSTRAINT fk_episode_attachments_media_asset FOREIGN KEY (media_asset_id) REFERENCES media_assets (id) ON DELETE RESTRICT
);

CREATE TABLE episode_entity_tags (
  id UUID NOT NULL,
  episode_id UUID NOT NULL,
  entity_id UUID NOT NULL,
  status entity_tag_status NOT NULL DEFAULT 'SUGGESTED',
  origin tag_origin NOT NULL,
  confirmed_by_id VARCHAR(36),
  confirmed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_episode_entity_tags_episode FOREIGN KEY (episode_id) REFERENCES episodes (id) ON DELETE CASCADE,
  CONSTRAINT fk_episode_entity_tags_entity FOREIGN KEY (entity_id) REFERENCES historical_entities (id) ON DELETE RESTRICT,
  CONSTRAINT fk_episode_entity_tags_confirmed_by FOREIGN KEY (confirmed_by_id) REFERENCES users (id) ON DELETE SET NULL,
  CONSTRAINT uq_episode_entity_tags_episode_entity UNIQUE (episode_id, entity_id)
);

CREATE TABLE series_sources (
  id UUID NOT NULL,
  series_id UUID NOT NULL,
  source_id UUID NOT NULL,
  locator VARCHAR(255) NOT NULL DEFAULT '',
  excerpt TEXT,
  sort_order SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  source_revision_id UUID,
  historical_citation_id UUID,
  PRIMARY KEY (id),
  CONSTRAINT fk_series_sources_series FOREIGN KEY (series_id) REFERENCES series (id) ON DELETE CASCADE,
  CONSTRAINT fk_series_sources_source FOREIGN KEY (source_id) REFERENCES sources (id) ON DELETE RESTRICT,
  CONSTRAINT fk_series_sources_source_revision FOREIGN KEY (source_revision_id) REFERENCES source_revisions (id) ON DELETE RESTRICT,
  CONSTRAINT fk_series_sources_historical_citation FOREIGN KEY (historical_citation_id) REFERENCES historical_citations (id) ON DELETE RESTRICT,
  CONSTRAINT uq_series_sources_series_source_locator UNIQUE (series_id, source_id, locator)
);


-- =============================================================================
-- 6. RELEASE / PRODUCTION WORKFLOW
-- =============================================================================

CREATE TABLE release_schedules (
  id UUID NOT NULL,
  episode_id UUID,
  title VARCHAR(255) NOT NULL,
  production_deadline TIMESTAMPTZ NOT NULL,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status release_schedule_status NOT NULL DEFAULT 'SCHEDULED',
  version INTEGER NOT NULL DEFAULT 1,
  created_by_id VARCHAR(36) NOT NULL,
  published_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  failure_code VARCHAR(64),
  failure_message TEXT,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_release_schedules_episode FOREIGN KEY (episode_id) REFERENCES episodes (id) ON DELETE RESTRICT,
  CONSTRAINT fk_release_schedules_created_by FOREIGN KEY (created_by_id) REFERENCES users (id) ON DELETE RESTRICT
);

CREATE TABLE production_assignments (
  schedule_id UUID NOT NULL,
  moderator_id VARCHAR(36) NOT NULL,
  assigned_by_id VARCHAR(36) NOT NULL,
  assigned_at TIMESTAMPTZ NOT NULL,
  removed_at TIMESTAMPTZ,
  PRIMARY KEY (schedule_id, moderator_id, assigned_at),
  CONSTRAINT fk_production_assignments_schedule FOREIGN KEY (schedule_id) REFERENCES release_schedules (id) ON DELETE CASCADE,
  CONSTRAINT fk_production_assignments_moderator FOREIGN KEY (moderator_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_production_assignments_assigned_by FOREIGN KEY (assigned_by_id) REFERENCES users (id) ON DELETE RESTRICT
);

CREATE TABLE release_reassignment_tickets (
  id UUID NOT NULL,
  schedule_id UUID NOT NULL,
  requested_by_id VARCHAR(36) NOT NULL,
  reason TEXT NOT NULL,
  status release_reassignment_ticket_status NOT NULL DEFAULT 'PENDING',
  replacement_moderator_id VARCHAR(36),
  resolved_by_id VARCHAR(36),
  decision_reason TEXT,
  resolved_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_release_reassignment_tickets_schedule FOREIGN KEY (schedule_id) REFERENCES release_schedules (id) ON DELETE CASCADE,
  CONSTRAINT fk_release_reassignment_tickets_requested_by FOREIGN KEY (requested_by_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_release_reassignment_tickets_replacement FOREIGN KEY (replacement_moderator_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_release_reassignment_tickets_resolved_by FOREIGN KEY (resolved_by_id) REFERENCES users (id) ON DELETE RESTRICT
);

CREATE TABLE episode_reviews (
  id UUID NOT NULL,
  schedule_id UUID NOT NULL,
  episode_id UUID NOT NULL,
  revision INTEGER NOT NULL,
  status episode_review_status NOT NULL DEFAULT 'IN_REVIEW',
  submitted_by_id VARCHAR(36) NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  reviewed_by_id VARCHAR(36),
  reviewed_at TIMESTAMPTZ,
  review_note TEXT,
  readiness_snapshot JSONB,
  PRIMARY KEY (id),
  CONSTRAINT fk_episode_reviews_schedule FOREIGN KEY (schedule_id) REFERENCES release_schedules (id) ON DELETE CASCADE,
  CONSTRAINT fk_episode_reviews_episode FOREIGN KEY (episode_id) REFERENCES episodes (id) ON DELETE CASCADE,
  CONSTRAINT fk_episode_reviews_submitted_by FOREIGN KEY (submitted_by_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT fk_episode_reviews_reviewed_by FOREIGN KEY (reviewed_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE release_reminders (
  id UUID NOT NULL,
  schedule_id UUID NOT NULL,
  moderator_id VARCHAR(36) NOT NULL,
  schedule_version INTEGER NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_release_reminders_schedule FOREIGN KEY (schedule_id) REFERENCES release_schedules (id) ON DELETE CASCADE,
  CONSTRAINT fk_release_reminders_moderator FOREIGN KEY (moderator_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT uq_release_reminders_schedule_moderator_version UNIQUE (schedule_id, moderator_id, schedule_version)
);

CREATE TABLE outbox_events (
  id UUID NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  aggregate_type VARCHAR(64) NOT NULL,
  aggregate_id VARCHAR(128) NOT NULL,
  payload JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  dispatched_at TIMESTAMPTZ,
  attempts INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  PRIMARY KEY (id)
);


-- =============================================================================
-- 7. QUIZ
-- =============================================================================

CREATE TABLE quiz_workspace_drafts (
  episode_id UUID NOT NULL,
  data JSONB NOT NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  activated_revision INTEGER NOT NULL DEFAULT 0,
  poster_asset_id UUID,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (episode_id),
  CONSTRAINT fk_quiz_workspace_drafts_episode FOREIGN KEY (episode_id) REFERENCES episodes (id) ON DELETE CASCADE,
  CONSTRAINT fk_quiz_workspace_drafts_poster FOREIGN KEY (poster_asset_id) REFERENCES media_assets (id) ON DELETE RESTRICT
);

CREATE TABLE quizzes (
  id UUID NOT NULL,
  episode_id UUID NOT NULL UNIQUE,
  pass_score_percent SMALLINT NOT NULL DEFAULT 80,
  title VARCHAR(200),
  description TEXT,
  poster_asset_id UUID,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_quizzes_episode FOREIGN KEY (episode_id) REFERENCES episodes (id) ON DELETE CASCADE,
  CONSTRAINT fk_quizzes_poster FOREIGN KEY (poster_asset_id) REFERENCES media_assets (id) ON DELETE RESTRICT
);

CREATE TABLE quiz_questions (
  id UUID NOT NULL,
  quiz_id UUID NOT NULL,
  question_text TEXT NOT NULL,
  explanation TEXT,
  time_limit SMALLINT,
  sort_order SMALLINT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_quiz_questions_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes (id) ON DELETE CASCADE
);

CREATE TABLE quiz_options (
  id UUID NOT NULL,
  question_id UUID NOT NULL,
  option_label CHAR(1) NOT NULL,
  option_text TEXT NOT NULL,
  is_correct BOOLEAN NOT NULL DEFAULT false,
  PRIMARY KEY (id),
  CONSTRAINT fk_quiz_options_question FOREIGN KEY (question_id) REFERENCES quiz_questions (id) ON DELETE CASCADE,
  CONSTRAINT uq_quiz_options_question_label UNIQUE (question_id, option_label)
);

CREATE TABLE quiz_attempts (
  id UUID NOT NULL,
  quiz_id UUID NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  answers JSONB NOT NULL,
  score_percent SMALLINT NOT NULL,
  is_passed BOOLEAN NOT NULL,
  submitted_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_quiz_attempts_quiz FOREIGN KEY (quiz_id) REFERENCES quizzes (id) ON DELETE CASCADE,
  CONSTRAINT fk_quiz_attempts_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE
);


-- =============================================================================
-- 8. LISTENING / GAMIFICATION
-- =============================================================================

CREATE TABLE listening_progress (
  id UUID NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  narration_id UUID NOT NULL,
  episode_id UUID NOT NULL,
  audio_asset_id UUID NOT NULL,
  position_ms INTEGER NOT NULL DEFAULT 0,
  played_bitmap BYTEA NOT NULL,
  played_seconds INTEGER NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  last_listened_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_listening_progress_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT fk_listening_progress_narration FOREIGN KEY (narration_id) REFERENCES episode_narrations (id) ON DELETE CASCADE,
  CONSTRAINT fk_listening_progress_episode FOREIGN KEY (episode_id) REFERENCES episodes (id) ON DELETE RESTRICT,
  CONSTRAINT fk_listening_progress_audio_asset FOREIGN KEY (audio_asset_id) REFERENCES media_assets (id) ON DELETE RESTRICT,
  CONSTRAINT uq_listening_progress_user_narration UNIQUE (user_id, narration_id)
);

CREATE TABLE mission_templates (
  id UUID NOT NULL,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  activity_type mission_activity_type NOT NULL,
  target_count SMALLINT NOT NULL,
  xp_reward INTEGER NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by_id VARCHAR(36),
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_mission_templates_created_by FOREIGN KEY (created_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE weekly_missions (
  id UUID NOT NULL,
  mission_template_id UUID NOT NULL,
  week_start_date DATE NOT NULL,
  title VARCHAR(255) NOT NULL,
  activity_type mission_activity_type NOT NULL,
  target_count SMALLINT NOT NULL,
  xp_reward INTEGER NOT NULL,
  activated_at TIMESTAMPTZ NOT NULL,
  activated_by_id VARCHAR(36) NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_weekly_missions_template FOREIGN KEY (mission_template_id) REFERENCES mission_templates (id) ON DELETE RESTRICT,
  CONSTRAINT fk_weekly_missions_activated_by FOREIGN KEY (activated_by_id) REFERENCES users (id) ON DELETE RESTRICT,
  CONSTRAINT uq_weekly_missions_template_week UNIQUE (mission_template_id, week_start_date)
);

CREATE TABLE user_weekly_missions (
  id UUID NOT NULL,
  weekly_mission_id UUID NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  progress_count SMALLINT NOT NULL DEFAULT 0,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_user_weekly_missions_mission FOREIGN KEY (weekly_mission_id) REFERENCES weekly_missions (id) ON DELETE CASCADE,
  CONSTRAINT fk_user_weekly_missions_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT uq_user_weekly_missions_mission_user UNIQUE (weekly_mission_id, user_id)
);

CREATE TABLE user_weekly_mission_items (
  user_weekly_mission_id UUID NOT NULL,
  content_id UUID NOT NULL,
  counted_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (user_weekly_mission_id, content_id),
  CONSTRAINT fk_user_weekly_mission_items_mission FOREIGN KEY (user_weekly_mission_id) REFERENCES user_weekly_missions (id) ON DELETE CASCADE
);

CREATE TABLE xp_awards (
  id UUID NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  source_type xp_source_type NOT NULL,
  source_id UUID NOT NULL,
  xp_amount INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_xp_awards_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT uq_xp_awards_user_source UNIQUE (user_id, source_type, source_id)
);


-- =============================================================================
-- 9. PLATFORM / OPS
-- =============================================================================

CREATE TABLE idempotency_keys (
  id UUID NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  key VARCHAR(255) NOT NULL,
  method VARCHAR(10) NOT NULL,
  route VARCHAR(255) NOT NULL,
  request_hash CHAR(64) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'IN_PROGRESS',
  response_status SMALLINT,
  response_body JSONB,
  response_location VARCHAR(2048),
  created_at TIMESTAMPTZ NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_idempotency_keys_user FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
  CONSTRAINT uq_idempotency_keys_user_key UNIQUE (user_id, key)
);

CREATE TABLE rate_limit_buckets (
  bucket_key VARCHAR(255) NOT NULL,
  window_start TIMESTAMPTZ NOT NULL,
  count INTEGER NOT NULL,
  PRIMARY KEY (bucket_key, window_start)
);

CREATE TABLE system_configs (
  key VARCHAR(100) NOT NULL,
  value JSONB NOT NULL,
  description TEXT,
  updated_by_id VARCHAR(36),
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (key),
  CONSTRAINT fk_system_configs_updated_by FOREIGN KEY (updated_by_id) REFERENCES users (id) ON DELETE SET NULL
);

CREATE TABLE audit_logs (
  id UUID NOT NULL,
  actor_id VARCHAR(36),
  action VARCHAR(64) NOT NULL,
  resource_type VARCHAR(64) NOT NULL,
  resource_id VARCHAR(128) NOT NULL,
  changes JSONB NOT NULL,
  ip_address VARCHAR(45),
  actor_type VARCHAR(16) NOT NULL DEFAULT 'USER',
  correlation_id VARCHAR(64),
  job_id VARCHAR(128),
  from_status VARCHAR(64),
  to_status VARCHAR(64),
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_audit_logs_actor FOREIGN KEY (actor_id) REFERENCES users (id) ON DELETE SET NULL
);


-- =============================================================================
-- 10. AI REVIEW
-- =============================================================================

CREATE TABLE ai_checks (
  id UUID NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  episode_id UUID NOT NULL,
  kind ai_check_kind NOT NULL,
  status ai_check_status NOT NULL,
  config JSONB NOT NULL,
  total_blocks INTEGER NOT NULL,
  processed_blocks INTEGER NOT NULL DEFAULT 0,
  failed_blocks INTEGER NOT NULL DEFAULT 0,
  tool_calls INTEGER NOT NULL DEFAULT 0,
  sources_used JSONB NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  model VARCHAR(100),
  prompt_version VARCHAR(50),
  heartbeat_at TIMESTAMPTZ,
  error_code VARCHAR(100),
  started_at TIMESTAMPTZ NOT NULL,
  finished_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_ai_checks_episode FOREIGN KEY (episode_id) REFERENCES episodes (id) ON DELETE CASCADE
);

CREATE TABLE ai_check_items (
  id UUID NOT NULL,
  check_id UUID NOT NULL,
  seq INTEGER NOT NULL,
  block_ref VARCHAR(32) NOT NULL,
  block_hash VARCHAR(16) NOT NULL,
  block_prev_hash VARCHAR(16) NOT NULL,
  block_dup SMALLINT NOT NULL,
  kind ai_issue_kind NOT NULL,
  severity ai_issue_severity NOT NULL,
  basis ai_item_basis NOT NULL,
  evidence JSONB NOT NULL,
  message TEXT NOT NULL,
  suggestion TEXT,
  status ai_item_status NOT NULL DEFAULT 'OPEN',
  applied_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_ai_check_items_check FOREIGN KEY (check_id) REFERENCES ai_checks (id) ON DELETE CASCADE,
  CONSTRAINT uq_ai_check_items_check_seq UNIQUE (check_id, seq)
);

CREATE TABLE ai_narrative_angles (
  id UUID NOT NULL,
  user_id VARCHAR(36) NOT NULL,
  name VARCHAR(60) NOT NULL,
  description VARCHAR(160) NOT NULL,
  guide VARCHAR(500) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id)
);


-- =============================================================================
-- 11. EXHIBITIONS
-- =============================================================================

CREATE TABLE exhibitions (
  id UUID NOT NULL,
  owner_id VARCHAR(36) NOT NULL,
  slug VARCHAR(280) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  draft_revision INTEGER NOT NULL DEFAULT 1,
  draft_document JSONB NOT NULL,
  published_document JSONB,
  published_revision INTEGER,
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL,
  PRIMARY KEY (id),
  CONSTRAINT fk_exhibitions_owner FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE RESTRICT
);
