-- Add positionId column to role_cards table
-- This enables the one-to-one relationship between RoleCard and OrgPosition
-- Note: This migration is conditional - if the table doesn't exist yet, it will be created
-- with the positionId column in a later migration (20260103203116_add_org_department_owner)

-- Check if table exists before modifying it
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'role_cards'
  ) THEN
    -- Table exists, check if column already exists before adding
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public'
      AND table_name = 'role_cards' 
      AND column_name = 'positionId'
    ) THEN
      -- Add positionId column (nullable, unique)
      ALTER TABLE "role_cards" 
      ADD COLUMN "positionId" TEXT;
      
      -- Add unique constraint
      CREATE UNIQUE INDEX IF NOT EXISTS "role_cards_positionId_key" 
      ON "role_cards"("positionId");
      
      -- Add foreign key constraint (only if org_positions table exists)
      IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'org_positions'
      ) THEN
        ALTER TABLE "role_cards"
        ADD CONSTRAINT "role_cards_positionId_fkey" 
        FOREIGN KEY ("positionId") 
        REFERENCES "org_positions"("id") 
        ON DELETE SET NULL 
        ON UPDATE CASCADE;
      END IF;
      
      -- Add index for performance
      CREATE INDEX IF NOT EXISTS "role_cards_positionId_idx" 
      ON "role_cards"("positionId");
    END IF;
  END IF;
END $$;
