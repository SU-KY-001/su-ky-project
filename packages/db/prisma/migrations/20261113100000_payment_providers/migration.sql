-- Generalise the SePay-only ledger so every payment provider writes the same table.
ALTER TYPE "sepay_transaction_status" RENAME TO "payment_transaction_status";

ALTER TABLE "sepay_transactions" RENAME TO "payment_transactions";
ALTER TABLE "payment_transactions" RENAME CONSTRAINT "sepay_transactions_pkey" TO "payment_transactions_pkey";
ALTER TABLE "payment_transactions" RENAME CONSTRAINT "sepay_transactions_amount_check" TO "payment_transactions_amount_check";
ALTER TABLE "payment_transactions" RENAME CONSTRAINT "sepay_transactions_order_id_fkey" TO "payment_transactions_order_id_fkey";
ALTER TABLE "payment_transactions" RENAME COLUMN "sepay_id" TO "external_id";
ALTER TABLE "payment_transactions" ALTER COLUMN "external_id" TYPE VARCHAR(64) USING "external_id"::text;

-- Existing rows came from SePay; new providers set their own identifier.
ALTER TABLE "payment_transactions" ADD COLUMN "provider" VARCHAR(32) NOT NULL DEFAULT 'sepay';
ALTER TABLE "payment_transactions" ALTER COLUMN "provider" DROP DEFAULT;

DROP INDEX "sepay_transactions_sepay_id_key";
CREATE UNIQUE INDEX "payment_transactions_provider_external_id_key" ON "payment_transactions"("provider", "external_id");
ALTER INDEX "sepay_transactions_status_created_idx" RENAME TO "payment_transactions_status_created_idx";
