CREATE TABLE "premium_renewal_reminders" (
  "membership_id" uuid PRIMARY KEY REFERENCES "memberships"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "created_at" timestamptz(3) NOT NULL DEFAULT NOW(),
  "push_claimed_at" timestamptz(3),
  "push_sent_at" timestamptz(3),
  "push_attempts" integer NOT NULL DEFAULT 0
);

CREATE INDEX "premium_renewal_reminders_push_claimed_at_created_at_idx"
ON "premium_renewal_reminders" ("push_claimed_at", "created_at");

CREATE TABLE "premium_push_subscriptions" (
  "endpoint" varchar(1024) PRIMARY KEY,
  "user_id" varchar(36) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "p256dh" varchar(128) NOT NULL,
  "auth" varchar(64) NOT NULL,
  "updated_at" timestamptz(3) NOT NULL
);

CREATE INDEX "premium_push_subscriptions_user_id_updated_at_idx"
ON "premium_push_subscriptions" ("user_id", "updated_at");
