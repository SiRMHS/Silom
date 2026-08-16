-- Project becomes the single source behind the canvas tile, the home page's
-- featured card and the case-study page, so the three can never disagree.

ALTER TABLE "Project" ADD COLUMN "slug" TEXT;
ALTER TABLE "Project" ADD COLUMN "client" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Project" ADD COLUMN "role" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Project" ADD COLUMN "summary" TEXT NOT NULL DEFAULT '';
ALTER TABLE "Project" ADD COLUMN "sections" JSONB NOT NULL DEFAULT '[]';

-- Backfill rather than drop: the seeded rows were inserted in the same order
-- as src/lib/projects.ts, so `order` maps them onto their slugs exactly. The
-- ELSE branch keeps the NOT NULL below safe for any hand-added row.
UPDATE "Project" SET "slug" = CASE "order"
  WHEN 0 THEN 'aban'
  WHEN 1 THEN 'mehregan'
  WHEN 2 THEN 'shabtab'
  WHEN 3 THEN 'parsrad'
  WHEN 4 THEN 'niloofar'
  WHEN 5 THEN 'zaferankadeh'
  WHEN 6 THEN 'rahnama'
  WHEN 7 THEN 'nowruz'
  WHEN 8 THEN 'arian'
  ELSE 'project-' || "id"
END;

ALTER TABLE "Project" ALTER COLUMN "slug" SET NOT NULL;
CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");

-- The home page's "selected work" strip now reads the first few projects, so
-- the parallel WorkItem table has no consumer left.
DROP TABLE "WorkItem";
