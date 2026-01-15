/*
  Warnings:

  - You are about to drop the column `ownerPersonId` on the `org_departments` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX "public"."org_departments_ownerPersonId_idx";

-- AlterTable
ALTER TABLE "org_departments" DROP COLUMN "ownerPersonId",
ADD COLUMN     "ownerId" TEXT;

-- CreateIndex
CREATE INDEX "org_departments_ownerId_idx" ON "org_departments"("ownerId");

-- AddForeignKey
ALTER TABLE "org_departments" ADD CONSTRAINT "org_departments_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
