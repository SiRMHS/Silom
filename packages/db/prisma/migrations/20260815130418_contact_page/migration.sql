-- CreateEnum
CREATE TYPE "ContactSource" AS ENUM ('FOOTER', 'PAGE');

-- AlterTable
ALTER TABLE "ContactMessage" ADD COLUMN     "message" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "name" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "source" "ContactSource" NOT NULL DEFAULT 'FOOTER',
ADD COLUMN     "subject" TEXT NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE "TeamMember" ADD COLUMN     "bio" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "focus" TEXT[] DEFAULT ARRAY[]::TEXT[];
