-- Add positionId column to role_cards table
-- This enables the one-to-one relationship between RoleCard and OrgPosition

-- Check if column already exists before adding
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'role_cards' 
    AND column_name = 'positionId'
  ) THEN
    -- Add positionId column (nullable, unique)
    ALTER TABLE "role_cards" 
    ADD COLUMN "positionId" TEXT;
    
    -- Add unique constraint
    CREATE UNIQUE INDEX IF NOT EXISTS "role_cards_positionId_key" 
    ON "role_cards"("positionId");
    
    -- Add foreign key constraint
    ALTER TABLE "role_cards"
    ADD CONSTRAINT "role_cards_positionId_fkey" 
    FOREIGN KEY ("positionId") 
    REFERENCES "org_positions"("id") 
    ON DELETE SET NULL 
    ON UPDATE CASCADE;
    
    -- Add index for performance
    CREATE INDEX IF NOT EXISTS "role_cards_positionId_idx" 
    ON "role_cards"("positionId");
  END IF;
END $$;
