-- The contact page's form grows from "name, subject, message" into a full
-- brief: a second number, where they found us, which services they need, the
-- budget and the delivery date. Every column defaults to empty, so the footer's
-- one-line form keeps writing exactly what it always did.

-- AlterTable
ALTER TABLE "ContactMessage" ADD COLUMN     "budget" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "phone" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "referrer" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "services" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "timeline" TEXT NOT NULL DEFAULT '';
