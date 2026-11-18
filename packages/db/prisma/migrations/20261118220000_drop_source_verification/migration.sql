-- Sources are trusted as soon as they are saved; the verification workflow is gone.
ALTER TABLE "sources" DROP COLUMN "verification_note";
ALTER TABLE "sources" DROP COLUMN "verified_at";
ALTER TABLE "sources" DROP COLUMN "verified_by_id";
ALTER TABLE "sources" DROP COLUMN "verified_version";
ALTER TABLE "sources" DROP COLUMN "verification_status";
DROP TYPE "SourceVerificationStatus";
