ALTER TABLE "quiz_questions" ADD COLUMN "kind" VARCHAR(20) NOT NULL DEFAULT 'SINGLE';
ALTER TABLE "quiz_questions" ADD CONSTRAINT "quiz_questions_kind_check" CHECK ("kind" IN ('SINGLE', 'MULTIPLE', 'TEXT'));
