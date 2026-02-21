-- AlterTable: Add missing company_type column to workspaces.
-- The Prisma schema defines companyType String? @map("company_type") but this
-- column was never added to a migration (it was only applied via db push).
ALTER TABLE "workspaces" ADD COLUMN IF NOT EXISTS "company_type" TEXT;
