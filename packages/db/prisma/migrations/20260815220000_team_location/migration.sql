-- AlterTable: the /team roster prints a member's city as its third column.
ALTER TABLE "TeamMember" ADD COLUMN     "location" TEXT NOT NULL DEFAULT '';
