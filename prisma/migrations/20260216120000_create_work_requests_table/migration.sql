-- CreateEnum: WorkPriority
-- Priority levels for work requests (P0, P1, P2, P3)
DO $$ BEGIN
    CREATE TYPE "WorkPriority" AS ENUM ('P0', 'P1', 'P2', 'P3');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: EffortEstimateType
-- Type of effort estimation (HOURS, TSHIRT)
DO $$ BEGIN
    CREATE TYPE "EffortEstimateType" AS ENUM ('HOURS', 'TSHIRT');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: TShirtSize
-- T-shirt sizing for effort estimates (XS, S, M, L, XL)
DO $$ BEGIN
    CREATE TYPE "TShirtSize" AS ENUM ('XS', 'S', 'M', 'L', 'XL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: WorkDomainType
-- Domain types for work requests (TEAM, DEPARTMENT, ROLE, FUNCTION, OTHER)
DO $$ BEGIN
    CREATE TYPE "WorkDomainType" AS ENUM ('TEAM', 'DEPARTMENT', 'ROLE', 'FUNCTION', 'OTHER');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: WorkRequestStatus
-- Status of work requests (OPEN, CLOSED)
DO $$ BEGIN
    CREATE TYPE "WorkRequestStatus" AS ENUM ('OPEN', 'CLOSED');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum: SeniorityLevel
-- Seniority levels for work requirements (JUNIOR, MID, SENIOR, LEAD, PRINCIPAL)
DO $$ BEGIN
    CREATE TYPE "SeniorityLevel" AS ENUM ('JUNIOR', 'MID', 'SENIOR', 'LEAD', 'PRINCIPAL');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable: Create work_requests table
-- This table stores work requests for the organization
CREATE TABLE IF NOT EXISTS "work_requests" (
    "id" TEXT NOT NULL,
    "workspaceId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "priority" "WorkPriority" NOT NULL,
    "desiredStart" TIMESTAMP(3) NOT NULL,
    "desiredEnd" TIMESTAMP(3) NOT NULL,
    "effortType" "EffortEstimateType" NOT NULL,
    "effortHours" DOUBLE PRECISION,
    "effortTShirt" "TShirtSize",
    "domainType" "WorkDomainType" NOT NULL,
    "domainId" TEXT,
    "requiredRoleType" TEXT,
    "requiredSeniority" "SeniorityLevel",
    "requesterPersonId" TEXT,
    "createdById" TEXT NOT NULL,
    "decisionDomainKey" TEXT,
    "status" "WorkRequestStatus" NOT NULL DEFAULT 'OPEN',
    "closedAt" TIMESTAMP(3),
    "isProvisional" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "primaryWorkTagId" TEXT,

    CONSTRAINT "work_requests_pkey" PRIMARY KEY ("id")
);

-- CreateIndex: Index for workspace and status queries
CREATE INDEX IF NOT EXISTS "work_requests_workspaceId_status_idx" ON "work_requests"("workspaceId", "status");

-- CreateIndex: Index for workspace and desired start date queries
CREATE INDEX IF NOT EXISTS "work_requests_workspaceId_desiredStart_idx" ON "work_requests"("workspaceId", "desiredStart");

-- CreateIndex: Index for workspace, domain type, and domain ID queries
CREATE INDEX IF NOT EXISTS "work_requests_workspaceId_domainType_domainId_idx" ON "work_requests"("workspaceId", "domainType", "domainId");

-- AddForeignKey: Foreign key to workspaces table
ALTER TABLE "work_requests" ADD CONSTRAINT "work_requests_workspaceId_fkey" 
    FOREIGN KEY ("workspaceId") REFERENCES "workspaces"("id") ON DELETE CASCADE ON UPDATE CASCADE;

