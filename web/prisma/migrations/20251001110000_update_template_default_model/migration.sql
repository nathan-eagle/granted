-- Update Template.model default to gpt-5-mini and backfill existing records
ALTER TABLE "Template" ALTER COLUMN "model" SET DEFAULT 'gpt-5-mini';

UPDATE "Template"
SET "model" = 'gpt-5-mini'
WHERE "model" IN ('gpt-4o-mini', 'gpt-4');
