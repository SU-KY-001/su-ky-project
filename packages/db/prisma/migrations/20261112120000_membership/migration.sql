CREATE TYPE "membership_order_status" AS ENUM ('pending', 'paid', 'needs_review', 'rejected');
CREATE TYPE "sepay_transaction_status" AS ENUM ('unmatched', 'needs_review', 'matched', 'ignored');

ALTER TABLE "series" ADD COLUMN "is_premium" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "episodes" ADD COLUMN "is_premium" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "membership_plans" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "code" VARCHAR(32) NOT NULL,
  "name" VARCHAR(100) NOT NULL,
  "price_vnd" INTEGER NOT NULL,
  "duration_days" INTEGER NOT NULL,
  "is_purchasable" BOOLEAN NOT NULL DEFAULT true,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "sort_order" INTEGER NOT NULL DEFAULT 0,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "membership_plans_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "membership_plans_amount_check" CHECK ("price_vnd" >= 0 AND "duration_days" >= 0)
);
CREATE UNIQUE INDEX "membership_plans_code_key" ON "membership_plans"("code");

CREATE TABLE "membership_orders" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(36) NOT NULL,
  "plan_id" UUID NOT NULL,
  "plan_code_snapshot" VARCHAR(32) NOT NULL,
  "plan_name_snapshot" VARCHAR(100) NOT NULL,
  "price_vnd" INTEGER NOT NULL,
  "duration_days" INTEGER NOT NULL,
  "currency" VARCHAR(3) NOT NULL DEFAULT 'VND',
  "transfer_content" VARCHAR(32) NOT NULL,
  "status" "membership_order_status" NOT NULL DEFAULT 'pending',
  "proof_asset_id" UUID,
  "rejection_reason" TEXT,
  "bank_transaction_id" VARCHAR(64),
  "paid_at" TIMESTAMPTZ(3),
  "verified_by" VARCHAR(36),
  "review_reason" VARCHAR(100),
  "admin_note" TEXT,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMPTZ(3) NOT NULL,
  CONSTRAINT "membership_orders_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "membership_orders_amount_check" CHECK ("price_vnd" >= 0 AND "duration_days" >= 0),
  CONSTRAINT "membership_orders_review_reason_check" CHECK ("status" <> 'needs_review' OR "review_reason" IS NOT NULL)
);
CREATE UNIQUE INDEX "membership_orders_transfer_content_key" ON "membership_orders"("transfer_content");
CREATE UNIQUE INDEX "membership_orders_proof_asset_id_key" ON "membership_orders"("proof_asset_id");
CREATE INDEX "membership_orders_user_created_idx" ON "membership_orders"("user_id", "created_at" DESC);
CREATE INDEX "membership_orders_status_created_idx" ON "membership_orders"("status", "created_at");
CREATE INDEX "membership_orders_paid_at_idx" ON "membership_orders"("paid_at");

CREATE TABLE "memberships" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "user_id" VARCHAR(36) NOT NULL,
  "plan_id" UUID NOT NULL,
  "order_id" UUID NOT NULL,
  "price_vnd" INTEGER NOT NULL,
  "duration_days" INTEGER NOT NULL,
  "starts_at" TIMESTAMPTZ(3) NOT NULL,
  "expires_at" TIMESTAMPTZ(3) NOT NULL,
  "revoked_at" TIMESTAMPTZ(3),
  "revoke_reason" VARCHAR(500),
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "memberships_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "memberships_period_check" CHECK ("expires_at" > "starts_at")
);
CREATE UNIQUE INDEX "memberships_order_id_key" ON "memberships"("order_id");
CREATE INDEX "memberships_user_expires_idx" ON "memberships"("user_id", "expires_at" DESC);

CREATE TABLE "sepay_transactions" (
  "id" UUID NOT NULL DEFAULT gen_random_uuid(),
  "sepay_id" BIGINT NOT NULL,
  "reference_code" VARCHAR(64),
  "amount" INTEGER NOT NULL,
  "accumulated" BIGINT,
  "content" TEXT NOT NULL,
  "code" VARCHAR(32),
  "gateway" VARCHAR(32),
  "account_number" VARCHAR(32),
  "sub_account" VARCHAR(32),
  "transaction_at" TIMESTAMPTZ(3) NOT NULL,
  "status" "sepay_transaction_status" NOT NULL DEFAULT 'unmatched',
  "order_id" UUID,
  "reason" VARCHAR(100),
  "raw_payload" JSONB NOT NULL,
  "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "sepay_transactions_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "sepay_transactions_amount_check" CHECK ("amount" >= 0)
);
CREATE UNIQUE INDEX "sepay_transactions_sepay_id_key" ON "sepay_transactions"("sepay_id");
CREATE INDEX "sepay_transactions_status_created_idx" ON "sepay_transactions"("status", "created_at" DESC);

ALTER TABLE "membership_orders" ADD CONSTRAINT "membership_orders_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "membership_orders" ADD CONSTRAINT "membership_orders_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "membership_orders" ADD CONSTRAINT "membership_orders_proof_asset_id_fkey" FOREIGN KEY ("proof_asset_id") REFERENCES "media_assets"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_plan_id_fkey" FOREIGN KEY ("plan_id") REFERENCES "membership_plans"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "membership_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "sepay_transactions" ADD CONSTRAINT "sepay_transactions_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "membership_orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

INSERT INTO "membership_plans"
  ("code", "name", "price_vnd", "duration_days", "is_purchasable", "is_active", "sort_order", "created_at", "updated_at")
VALUES
  ('free',    'Miễn phí',  0,      0,   false, true, 0, now(), now()),
  ('monthly', 'Gói tháng', 20000,  30,  true,  true, 1, now(), now()),
  ('yearly',  'Gói năm',   220000, 365, true,  true, 2, now(), now())
ON CONFLICT ("code") DO NOTHING;
