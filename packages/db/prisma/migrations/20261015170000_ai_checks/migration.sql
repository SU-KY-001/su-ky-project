-- Rollback: DROP TABLE "ai_check_items"; DROP TABLE "ai_checks"; DROP TYPE "ai_item_basis", "ai_item_status", "ai_issue_severity", "ai_issue_kind", "ai_check_status", "ai_check_kind";

-- CreateEnum
CREATE TYPE "ai_check_kind" AS ENUM ('SCRIPT_REVIEW');

-- CreateEnum
CREATE TYPE "ai_check_status" AS ENUM ('RUNNING', 'SUCCEEDED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "ai_issue_kind" AS ENUM ('FACT_DOUBT', 'READABILITY');

-- CreateEnum
CREATE TYPE "ai_issue_severity" AS ENUM ('LOW', 'MEDIUM', 'HIGH');

-- CreateEnum
CREATE TYPE "ai_item_status" AS ENUM ('OPEN', 'REVIEWED');

-- CreateEnum
CREATE TYPE "ai_item_basis" AS ENUM ('CONTRADICTED', 'NOT_FOUND');

-- CreateTable
CREATE TABLE "ai_checks" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" VARCHAR(36) NOT NULL,
    "episode_id" UUID NOT NULL,
    "kind" "ai_check_kind" NOT NULL,
    "status" "ai_check_status" NOT NULL,
    "config" JSONB NOT NULL,
    "total_blocks" INTEGER NOT NULL,
    "processed_blocks" INTEGER NOT NULL DEFAULT 0,
    "failed_blocks" INTEGER NOT NULL DEFAULT 0,
    "tool_calls" INTEGER NOT NULL DEFAULT 0,
    "sources_used" JSONB NOT NULL DEFAULT '[]',
    "input_tokens" INTEGER NOT NULL DEFAULT 0,
    "output_tokens" INTEGER NOT NULL DEFAULT 0,
    "model" VARCHAR(100),
    "prompt_version" VARCHAR(50),
    "heartbeat_at" TIMESTAMPTZ(3),
    "error_code" VARCHAR(100),
    "started_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ai_checks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_check_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "check_id" UUID NOT NULL,
    "seq" INTEGER NOT NULL,
    "block_ref" VARCHAR(32) NOT NULL,
    "block_hash" VARCHAR(16) NOT NULL,
    "block_prev_hash" VARCHAR(16) NOT NULL,
    "block_dup" SMALLINT NOT NULL,
    "kind" "ai_issue_kind" NOT NULL,
    "severity" "ai_issue_severity" NOT NULL,
    "basis" "ai_item_basis" NOT NULL,
    "evidence" JSONB NOT NULL DEFAULT '[]',
    "message" TEXT NOT NULL,
    "suggestion" TEXT,
    "status" "ai_item_status" NOT NULL DEFAULT 'OPEN',
    "applied_at" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ai_check_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_checks_user_id_created_at_idx" ON "ai_checks"("user_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_checks_episode_id_created_at_idx" ON "ai_checks"("episode_id", "created_at");

-- CreateIndex
CREATE INDEX "ai_checks_user_id_status_idx" ON "ai_checks"("user_id", "status");

-- CreateIndex
CREATE INDEX "ai_checks_status_heartbeat_at_idx" ON "ai_checks"("status", "heartbeat_at");

-- CreateIndex
CREATE INDEX "ai_check_items_check_id_status_idx" ON "ai_check_items"("check_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "ai_check_items_check_id_seq_key" ON "ai_check_items"("check_id", "seq");

-- AddForeignKey
ALTER TABLE "ai_checks" ADD CONSTRAINT "ai_checks_episode_id_fkey" FOREIGN KEY ("episode_id") REFERENCES "episodes"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_check_items" ADD CONSTRAINT "ai_check_items_check_id_fkey" FOREIGN KEY ("check_id") REFERENCES "ai_checks"("id") ON DELETE CASCADE ON UPDATE CASCADE;

