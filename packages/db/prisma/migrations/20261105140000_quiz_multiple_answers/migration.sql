-- Multi-select and short-answer questions can have multiple accepted answers.
-- The application validates the number of correct answers for each question kind.
DROP INDEX IF EXISTS "quiz_options_question_id_correct_key";
