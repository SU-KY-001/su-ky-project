-- Rollback: DROP TABLE "ai_narrative_angles";
-- CreateTable
CREATE TABLE "ai_narrative_angles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "user_id" VARCHAR(36) NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "description" VARCHAR(160) NOT NULL,
    "guide" VARCHAR(500) NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "ai_narrative_angles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "ai_narrative_angles_user_id_idx" ON "ai_narrative_angles"("user_id");

-- Case-insensitive unique name per user: expression index, not expressible in Prisma. Writers must catch P2002.
CREATE UNIQUE INDEX "ai_narrative_angles_user_id_lower_name_key" ON "ai_narrative_angles"("user_id", lower("name"));
