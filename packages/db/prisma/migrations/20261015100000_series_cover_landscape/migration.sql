-- AlterTable
ALTER TABLE "media_assets" ADD COLUMN "width_px" INTEGER,
ADD COLUMN "height_px" INTEGER;

-- AlterTable
ALTER TABLE "series" ADD COLUMN "cover_landscape_asset_id" UUID;

-- AddForeignKey
ALTER TABLE "series" ADD CONSTRAINT "series_cover_landscape_asset_id_fkey" FOREIGN KEY ("cover_landscape_asset_id") REFERENCES "media_assets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
