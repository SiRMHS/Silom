-- AlterTable
ALTER TABLE "Post" ADD COLUMN     "faqs" JSONB NOT NULL DEFAULT '[]';

-- AlterTable
ALTER TABLE "Project" ADD COLUMN     "faqs" JSONB NOT NULL DEFAULT '[]';
