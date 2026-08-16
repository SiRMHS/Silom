-- Services become a pillar/cluster: the accordion rows on the home page each
-- gain a landing page of their own, and a project can say which services it is
-- an example of.

-- AlterTable
ALTER TABLE "Service" ADD COLUMN     "ctaNote" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "ctaTitle" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "excerpt" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "faqs" JSONB NOT NULL DEFAULT '[]',
ADD COLUMN     "filmId" TEXT,
ADD COLUMN     "headline" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "imageId" TEXT,
ADD COLUMN     "sections" JSONB NOT NULL DEFAULT '[]';

-- `slug` is required and unique, and the table already has rows. Added
-- nullable, filled with a placeholder that is unique by construction, then
-- tightened — the seed gives the services it knows a readable slug on its next
-- run, and the panel can rename any of them.
ALTER TABLE "Service" ADD COLUMN "slug" TEXT;

UPDATE "Service" AS s
SET "slug" = 'service-' || n.rank
FROM (
  SELECT "id", row_number() OVER (ORDER BY "order", "id") AS rank FROM "Service"
) AS n
WHERE s."id" = n."id";

ALTER TABLE "Service" ALTER COLUMN "slug" SET NOT NULL;

-- CreateTable
CREATE TABLE "ServiceImage" (
    "id" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "mediaId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ServiceImage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectService" (
    "projectId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "ProjectService_pkey" PRIMARY KEY ("projectId","serviceId")
);

-- CreateIndex
CREATE INDEX "ServiceImage_serviceId_order_idx" ON "ServiceImage"("serviceId", "order");

-- CreateIndex
CREATE INDEX "ServiceImage_mediaId_idx" ON "ServiceImage"("mediaId");

-- CreateIndex
CREATE INDEX "ProjectService_serviceId_idx" ON "ProjectService"("serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "Service_slug_key" ON "Service"("slug");

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_imageId_fkey" FOREIGN KEY ("imageId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Service" ADD CONSTRAINT "Service_filmId_fkey" FOREIGN KEY ("filmId") REFERENCES "Media"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceImage" ADD CONSTRAINT "ServiceImage_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServiceImage" ADD CONSTRAINT "ServiceImage_mediaId_fkey" FOREIGN KEY ("mediaId") REFERENCES "Media"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectService" ADD CONSTRAINT "ProjectService_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ProjectService" ADD CONSTRAINT "ProjectService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;
