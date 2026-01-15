/*
  Warnings:

  - You are about to drop the column `ownerId` on the `org_departments` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."org_departments" DROP CONSTRAINT "org_departments_ownerId_fkey";

-- DropIndex
DROP INDEX "public"."org_departments_ownerId_idx";

-- AlterTable
ALTER TABLE "org_departments" DROP COLUMN "ownerId",
ADD COLUMN     "ownerPersonId" TEXT;

-- CreateIndex
CREATE INDEX "org_departments_ownerPersonId_idx" ON "org_departments"("ownerPersonId");
