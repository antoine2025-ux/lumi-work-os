-- Add teamId to Project model (optional org team assignment)
ALTER TABLE "projects" ADD COLUMN "teamId" TEXT;

-- Add foreign key constraint
ALTER TABLE "projects"
  ADD CONSTRAINT "projects_teamId_fkey"
  FOREIGN KEY ("teamId")
  REFERENCES "org_teams"("id")
  ON DELETE SET NULL
  ON UPDATE CASCADE;

-- Add index for performance
CREATE INDEX "projects_teamId_idx" ON "projects"("teamId");
