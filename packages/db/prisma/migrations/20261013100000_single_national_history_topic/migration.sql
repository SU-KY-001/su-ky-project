INSERT INTO "topics" (
  "id",
  "name",
  "slug",
  "sort_order",
  "is_active",
  "created_at",
  "updated_at"
)
VALUES (
  gen_random_uuid(),
  'Lịch sử dân tộc',
  'lich-su-dan-toc',
  1,
  true,
  CURRENT_TIMESTAMP,
  CURRENT_TIMESTAMP
)
ON CONFLICT ("slug") DO UPDATE
SET
  "name" = EXCLUDED."name",
  "sort_order" = EXCLUDED."sort_order",
  "is_active" = true,
  "updated_at" = CURRENT_TIMESTAMP;

UPDATE "topics"
SET
  "is_active" = false,
  "updated_at" = CURRENT_TIMESTAMP
WHERE "slug" <> 'lich-su-dan-toc';

UPDATE "series"
SET "topic_id" = (
  SELECT "id"
  FROM "topics"
  WHERE "slug" = 'lich-su-dan-toc'
);
