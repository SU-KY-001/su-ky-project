ALTER TABLE "quiz_questions" ADD COLUMN "time_limit" SMALLINT;
UPDATE "quiz_questions" AS q
SET "time_limit" = (entry.value->>'timeLimit')::smallint
FROM "quizzes" AS quiz
JOIN "quiz_workspace_drafts" AS draft ON draft."episode_id" = quiz."episode_id"
CROSS JOIN LATERAL jsonb_array_elements(draft."data"->'questions') WITH ORDINALITY AS entry(value, position)
WHERE q."quiz_id" = quiz."id" AND q."sort_order" = entry.position - 1
  AND draft."activated_revision" = draft."revision"
  AND (entry.value->>'timeLimit') ~ '^[0-9]+$'
  AND (entry.value->>'timeLimit')::integer BETWEEN 10 AND 120;
