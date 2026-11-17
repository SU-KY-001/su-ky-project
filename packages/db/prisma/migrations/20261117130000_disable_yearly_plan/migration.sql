-- Only the monthly plan is sold; the yearly plan stays as history for old orders but is no longer active.
UPDATE "membership_plans" SET "is_active" = false, "is_purchasable" = false, "updated_at" = now() WHERE "code" = 'yearly';
