-- CreateEnum: OrgRole (if not exists)
DO $$ BEGIN
    CREATE TYPE "OrgRole" AS ENUM ('VIEWER', 'EDITOR', 'ADMIN');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: ResponsibilityScope (if not exists)
DO $$ BEGIN
    CREATE TYPE "ResponsibilityScope" AS ENUM ('OWNERSHIP', 'DECISION', 'EXECUTION');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: orgs
CREATE TABLE IF NOT EXISTS "orgs" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orgs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "orgs_name_idx" ON "orgs"("name");

-- CreateTable: org_memberships
CREATE TABLE IF NOT EXISTS "org_memberships" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" "OrgRole" NOT NULL DEFAULT 'VIEWER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "org_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "org_memberships_orgId_userId_key" ON "org_memberships"("orgId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "org_memberships_orgId_role_idx" ON "org_memberships"("orgId", "role");

-- AddForeignKey
ALTER TABLE "org_memberships" DROP CONSTRAINT IF EXISTS "org_memberships_orgId_fkey";
ALTER TABLE "org_memberships" ADD CONSTRAINT "org_memberships_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: audit_log_entries
CREATE TABLE IF NOT EXISTS "audit_log_entries" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "actorUserId" TEXT,
    "actorLabel" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetCount" INTEGER NOT NULL,
    "summary" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_log_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "audit_log_entries_orgId_createdAt_idx" ON "audit_log_entries"("orgId", "createdAt");

-- AddForeignKey
ALTER TABLE "audit_log_entries" DROP CONSTRAINT IF EXISTS "audit_log_entries_orgId_fkey";
ALTER TABLE "audit_log_entries" ADD CONSTRAINT "audit_log_entries_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: roles
CREATE TABLE IF NOT EXISTS "roles" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "roles_orgId_idx" ON "roles"("orgId");

-- AddForeignKey
ALTER TABLE "roles" DROP CONSTRAINT IF EXISTS "roles_orgId_fkey";
ALTER TABLE "roles" ADD CONSTRAINT "roles_orgId_fkey" FOREIGN KEY ("orgId") REFERENCES "orgs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: role_responsibilities
CREATE TABLE IF NOT EXISTS "role_responsibilities" (
    "id" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,
    "scope" "ResponsibilityScope" NOT NULL,
    "target" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_responsibilities_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "role_responsibilities_roleId_idx" ON "role_responsibilities"("roleId");

-- AddForeignKey
ALTER TABLE "role_responsibilities" DROP CONSTRAINT IF EXISTS "role_responsibilities_roleId_fkey";
ALTER TABLE "role_responsibilities" ADD CONSTRAINT "role_responsibilities_roleId_fkey" FOREIGN KEY ("roleId") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable: saved_views
CREATE TABLE IF NOT EXISTS "saved_views" (
    "id" TEXT NOT NULL,
    "orgId" TEXT NOT NULL,
    "userId" TEXT,
    "name" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "state" JSONB NOT NULL,
    "shared" BOOLEAN NOT NULL DEFAULT false,
    "pinned" BOOLEAN NOT NULL DEFAULT false,
    "defaultForRole" "OrgRole",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "saved_views_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "saved_views_orgId_scope_idx" ON "saved_views"("orgId", "scope");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "saved_views_orgId_userId_idx" ON "saved_views"("orgId", "userId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "saved_views_orgId_pinned_idx" ON "saved_views"("orgId", "pinned");
