UPDATE "system_configs"
SET "value" = '["pdf", "doc", "docx"]'::jsonb,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "key" = 'media.document.allowed_formats';

UPDATE "system_configs"
SET "value" = '["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"]'::jsonb,
    "updated_at" = CURRENT_TIMESTAMP
WHERE "key" = 'media.document.allowed_mime_types';
