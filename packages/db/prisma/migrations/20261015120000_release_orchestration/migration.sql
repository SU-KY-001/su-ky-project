CREATE TYPE "release_schedule_status" AS ENUM (
  'SCHEDULED', 'READY_TO_PUBLISH', 'PUBLISHING', 'RELEASED', 'BLOCKED', 'FAILED', 'CANCELLED'
);

CREATE TYPE "episode_review_status" AS ENUM (
  'DRAFT', 'IN_REVIEW', 'CHANGES_REQUESTED', 'APPROVED'
);

ALTER TABLE "episodes"
  ADD COLUMN "content_revision" INTEGER NOT NULL DEFAULT 1;

ALTER TABLE "audit_logs"
  ADD COLUMN "actor_type" VARCHAR(16) NOT NULL DEFAULT 'USER',
  ADD COLUMN "correlation_id" VARCHAR(64),
  ADD COLUMN "job_id" VARCHAR(128),
  ADD COLUMN "from_status" VARCHAR(64),
  ADD COLUMN "to_status" VARCHAR(64);

CREATE TABLE "release_schedules" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "episode_id" UUID,
  "title" VARCHAR(255) NOT NULL,
  "production_deadline" TIMESTAMPTZ(3) NOT NULL,
  "scheduled_at" TIMESTAMPTZ(3) NOT NULL,
  "status" "release_schedule_status" NOT NULL DEFAULT 'SCHEDULED',
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_by_id" VARCHAR(36) NOT NULL,
  "published_at" TIMESTAMPTZ(3),
  "cancelled_at" TIMESTAMPTZ(3),
  "failure_code" VARCHAR(64),
  "failure_message" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "release_schedules_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "production_assignments" (
  "schedule_id" UUID NOT NULL,
  "moderator_id" VARCHAR(36) NOT NULL,
  "assigned_by_id" VARCHAR(36) NOT NULL,
  "assigned_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "removed_at" TIMESTAMPTZ(3),
  CONSTRAINT "production_assignments_pkey" PRIMARY KEY ("schedule_id", "moderator_id", "assigned_at")
);

CREATE TABLE "episode_reviews" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schedule_id" UUID NOT NULL,
  "episode_id" UUID NOT NULL,
  "revision" INTEGER NOT NULL,
  "status" "episode_review_status" NOT NULL DEFAULT 'IN_REVIEW',
  "submitted_by_id" VARCHAR(36) NOT NULL,
  "submitted_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewed_by_id" VARCHAR(36),
  "reviewed_at" TIMESTAMPTZ(3),
  "review_note" TEXT,
  CONSTRAINT "episode_reviews_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "outbox_events" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "event_type" VARCHAR(100) NOT NULL,
  "aggregate_type" VARCHAR(64) NOT NULL,
  "aggregate_id" VARCHAR(128) NOT NULL,
  "payload" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "dispatched_at" TIMESTAMPTZ(3),
  "attempts" INTEGER NOT NULL DEFAULT 0,
  "last_error" TEXT,
  CONSTRAINT "outbox_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "release_reminders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schedule_id" UUID NOT NULL,
  "moderator_id" VARCHAR(36) NOT NULL,
  "schedule_version" INTEGER NOT NULL,
  "message" TEXT NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "release_reminders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "release_schedules_status_scheduled_at_idx" ON "release_schedules"("status", "scheduled_at");
CREATE INDEX "release_schedules_episode_id_status_idx" ON "release_schedules"("episode_id", "status");
CREATE INDEX "production_assignments_moderator_active_idx" ON "production_assignments"("moderator_id", "removed_at");
CREATE UNIQUE INDEX "episode_reviews_episode_revision_key" ON "episode_reviews"("episode_id", "revision");
CREATE INDEX "episode_reviews_schedule_status_idx" ON "episode_reviews"("schedule_id", "status");
CREATE INDEX "outbox_events_dispatch_idx" ON "outbox_events"("dispatched_at", "created_at");
CREATE INDEX "outbox_events_aggregate_idx" ON "outbox_events"("aggregate_type", "aggregate_id");
CREATE UNIQUE INDEX "release_reminders_schedule_moderator_version_key" ON "release_reminders"("schedule_id", "moderator_id", "schedule_version");
CREATE INDEX "release_reminders_moderator_created_at_idx" ON "release_reminders"("moderator_id", "created_at");

ALTER TABLE "release_schedules"
  ADD CONSTRAINT "release_schedules_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "release_schedules_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "production_assignments"
  ADD CONSTRAINT "production_assignments_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "release_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "production_assignments_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "production_assignments_assigned_by_id_fkey" FOREIGN KEY ("assigned_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "episode_reviews"
  ADD CONSTRAINT "episode_reviews_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "release_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "episode_reviews_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "episode_reviews_submitted_by_id_fkey" FOREIGN KEY ("submitted_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "episode_reviews_reviewed_by_id_fkey" FOREIGN KEY ("reviewed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "release_reminders"
  ADD CONSTRAINT "release_reminders_schedule_id_fkey" FOREIGN KEY ("schedule_id") REFERENCES "release_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "release_reminders_moderator_id_fkey" FOREIGN KEY ("moderator_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
