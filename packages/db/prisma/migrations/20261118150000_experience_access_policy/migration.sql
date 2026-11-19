CREATE TABLE "experience_access_policies" (
  "feature" varchar(24) PRIMARY KEY,
  "mode" varchar(24) NOT NULL,
  "daily_quota" integer,
  CONSTRAINT "experience_access_policies_feature_check" CHECK ("feature" IN ('podcast', 'quiz', 'exhibition')),
  CONSTRAINT "experience_access_policies_mode_check" CHECK (
    ("mode" = 'free_limited' AND "daily_quota" IS NOT NULL AND "daily_quota" > 0)
    OR ("mode" IN ('free_unlimited', 'premium_only') AND "daily_quota" IS NULL)
  )
);

INSERT INTO "experience_access_policies" ("feature", "mode", "daily_quota")
VALUES ('podcast', 'free_limited', 4), ('quiz', 'free_limited', 4), ('exhibition', 'free_limited', 1);

CREATE TABLE "experience_daily_uses" (
  "user_id" varchar(36) NOT NULL REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  "feature" varchar(24) NOT NULL CHECK ("feature" IN ('quiz', 'exhibition')),
  "attempt_id" uuid NOT NULL,
  "subject" varchar(280) NOT NULL,
  "counted" boolean NOT NULL DEFAULT true,
  "submitted_at" timestamptz(3),
  "day" date NOT NULL,
  PRIMARY KEY ("user_id", "feature", "attempt_id")
);

CREATE INDEX "experience_daily_uses_user_id_feature_day_idx"
ON "experience_daily_uses" ("user_id", "feature", "day");
