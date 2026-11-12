-- Admin order detail and date/provider filters scan the ledger.
CREATE INDEX "payment_transactions_order_idx" ON "payment_transactions"("order_id");
CREATE INDEX "payment_transactions_time_idx" ON "payment_transactions"("transaction_at" DESC);
CREATE INDEX "payment_transactions_provider_time_idx" ON "payment_transactions"("provider", "transaction_at" DESC);
