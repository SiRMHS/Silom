-- AlterTable: a case study can carry its own clip, the way a service does.
ALTER TABLE "Project" ADD COLUMN     "filmId" TEXT;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;
