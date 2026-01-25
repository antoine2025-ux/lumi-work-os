-- Add employmentStatus, employmentStartDate, employmentEndDate columns to workspace_members
-- PHASE 2: Align database with Prisma schema

-- Add employmentStatus column with default value
ALTER TABLE workspace_members 
ADD COLUMN IF NOT EXISTS "employmentStatus" TEXT DEFAULT 'ACTIVE';

-- Update existing rows to have ACTIVE status
UPDATE workspace_members 
SET "employmentStatus" = 'ACTIVE' 
WHERE "employmentStatus" IS NULL;

-- Make it NOT NULL with default
ALTER TABLE workspace_members 
ALTER COLUMN "employmentStatus" SET NOT NULL,
ALTER COLUMN "employmentStatus" SET DEFAULT 'ACTIVE';

-- Add employmentStartDate column (nullable)
ALTER TABLE workspace_members 
ADD COLUMN IF NOT EXISTS "employmentStartDate" TIMESTAMP;

-- Add employmentEndDate column (nullable)
ALTER TABLE workspace_members 
ADD COLUMN IF NOT EXISTS "employmentEndDate" TIMESTAMP;

-- Add index on workspaceId + employmentStatus (if it doesn't exist)
CREATE INDEX IF NOT EXISTS "idx_workspace_members_workspace_employment" 
ON workspace_members("workspaceId", "employmentStatus");

-- Add check constraint to ensure employmentStatus is one of the enum values
ALTER TABLE workspace_members 
ADD CONSTRAINT "workspace_members_employmentStatus_check" 
CHECK ("employmentStatus" IN ('ACTIVE', 'ON_LEAVE', 'TERMINATED', 'CONTRACTOR'));
