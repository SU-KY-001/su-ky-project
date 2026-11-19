CREATE TYPE "release_reassignment_ticket_status" AS ENUM (
  'PENDING', 'APPROVED', 'REJECTED', 'CANCELLED'
);

CREATE TABLE "release_reassignment_tickets" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "schedule_id" UUID NOT NULL,
  "requested_by_id" VARCHAR(36) NOT NULL,
  "reason" TEXT NOT NULL,
  "status" "release_reassignment_ticket_status" NOT NULL DEFAULT 'PENDING',
  "replacement_moderator_id" VARCHAR(36),
  "resolved_by_id" VARCHAR(36),
  "decision_reason" TEXT,
  "resolved_at" TIMESTAMPTZ(3),
  "cancelled_at" TIMESTAMPTZ(3),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "release_reassignment_tickets_pkey" PRIMARY KEY ("id")
);

WITH ranked_assignments AS (
  SELECT "schedule_id", "moderator_id", "assigned_at",
    ROW_NUMBER() OVER (
      PARTITION BY "schedule_id"
      ORDER BY "assigned_at" DESC, "moderator_id" ASC
    ) AS position
  FROM "production_assignments"
  WHERE "removed_at" IS NULL
)
UPDATE "production_assignments" AS assignment
SET "removed_at" = CURRENT_TIMESTAMP
FROM ranked_assignments
WHERE ranked_assignments."position" > 1
  AND assignment."schedule_id" = ranked_assignments."schedule_id"
  AND assignment."moderator_id" = ranked_assignments."moderator_id"
  AND assignment."assigned_at" = ranked_assignments."assigned_at";

CREATE UNIQUE INDEX "production_assignments_one_active_per_schedule_key"
  ON "production_assignments"("schedule_id")
  WHERE "removed_at" IS NULL;

CREATE UNIQUE INDEX "release_reassignment_tickets_one_pending_per_schedule_key"
  ON "release_reassignment_tickets"("schedule_id")
  WHERE "status" = 'PENDING';

CREATE INDEX "release_reassignment_tickets_requester_created_idx"
  ON "release_reassignment_tickets"("requested_by_id", "created_at");

CREATE INDEX "release_reassignment_tickets_status_created_idx"
  ON "release_reassignment_tickets"("status", "created_at");

ALTER TABLE "release_reassignment_tickets"
  ADD CONSTRAINT "release_reassignment_tickets_schedule_id_fkey"
    FOREIGN KEY ("schedule_id") REFERENCES "release_schedules"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  ADD CONSTRAINT "release_reassignment_tickets_requested_by_id_fkey"
    FOREIGN KEY ("requested_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "release_reassignment_tickets_replacement_moderator_id_fkey"
    FOREIGN KEY ("replacement_moderator_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT "release_reassignment_tickets_resolved_by_id_fkey"
    FOREIGN KEY ("resolved_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
