ALTER TABLE "quizzes" ADD COLUMN "title" VARCHAR(200), ADD COLUMN "description" TEXT, ADD COLUMN "poster_asset_id" UUID;
ALTER TABLE "quiz_workspace_drafts" ADD COLUMN "poster_asset_id" UUID;
ALTER TABLE "quizzes" ADD CONSTRAINT "quizzes_poster_asset_id_fkey" FOREIGN KEY ("poster_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "quiz_workspace_drafts" ADD CONSTRAINT "quiz_workspace_drafts_poster_asset_id_fkey" FOREIGN KEY ("poster_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
