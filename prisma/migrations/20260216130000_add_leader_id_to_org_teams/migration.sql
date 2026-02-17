-- AlterTable
ALTER TABLE "org_teams" ADD COLUMN IF NOT EXISTS "leaderId" TEXT;

-- CreateIndex
CREATE INDEX IF NOT EXISTS "org_teams_leaderId_idx" ON "org_teams"("leaderId");

-- AddForeignKey
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'org_teams_leaderId_fkey' 
        AND table_name = 'org_teams'
    ) THEN
        ALTER TABLE "org_teams" ADD CONSTRAINT "org_teams_leaderId_fkey" 
        FOREIGN KEY ("leaderId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;

