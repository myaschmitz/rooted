-- Migration to restructure tags as proper many-to-many relationship
-- This creates a separate tags table and junction table for plant-tag relationships

BEGIN;

-- Step 1: Create the new tags table
CREATE TABLE IF NOT EXISTS tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT NOT NULL, -- Hex color code (e.g., '#FF5733')
    household_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints to tags table only if they don't already exist
DO $$
BEGIN
    -- Add check constraints if they don't exist (using table_constraints for all)
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'check_tag_name_not_empty' 
                   AND table_schema = 'public'
                   AND table_name = 'tags') THEN
        ALTER TABLE tags ADD CONSTRAINT check_tag_name_not_empty CHECK (LENGTH(TRIM(name)) > 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'check_tag_name_length' 
                   AND table_schema = 'public'
                   AND table_name = 'tags') THEN
        ALTER TABLE tags ADD CONSTRAINT check_tag_name_length CHECK (LENGTH(TRIM(name)) <= 50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'check_color_hex_format' 
                   AND table_schema = 'public'
                   AND table_name = 'tags') THEN
        ALTER TABLE tags ADD CONSTRAINT check_color_hex_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
    END IF;
    
    -- Add foreign key constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'tags_household_id_fkey' 
                   AND table_schema = 'public'
                   AND table_name = 'tags') THEN
        ALTER TABLE tags ADD CONSTRAINT tags_household_id_fkey FOREIGN KEY (household_id) REFERENCES households(id);
    END IF;
END $$;

-- Step 2: Create indexes for the tags table (drop first to avoid conflicts)
DROP INDEX IF EXISTS idx_tags_household_id;
DROP INDEX IF EXISTS idx_tags_name;
DROP INDEX IF EXISTS idx_tags_color;
DROP INDEX IF EXISTS idx_tags_unique_per_household;

CREATE INDEX idx_tags_household_id ON tags(household_id);
CREATE INDEX idx_tags_name ON tags(name);
CREATE INDEX idx_tags_color ON tags(color);

-- Create a unique index to ensure unique tags per household (case-insensitive name + color)
CREATE UNIQUE INDEX idx_tags_unique_per_household 
ON tags (household_id, LOWER(TRIM(name)), UPPER(color));

-- Step 3: Create trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_tags_updated_at ON tags;
CREATE TRIGGER update_tags_updated_at BEFORE UPDATE ON tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 4: Enable Row Level Security (RLS) for tags table (only if not already enabled)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'tags' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE tags ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Step 5: Create policies for tags table (drop existing ones first)
-- These policies match the working plants table logic with household membership checks
DROP POLICY IF EXISTS "Users can view tags" ON tags;
DROP POLICY IF EXISTS "Users can insert tags" ON tags;
DROP POLICY IF EXISTS "Users can update tags" ON tags;
DROP POLICY IF EXISTS "Users can delete tags" ON tags;
DROP POLICY IF EXISTS "Allow viewing tags with household check" ON tags;
DROP POLICY IF EXISTS "Allow inserting tags" ON tags;
DROP POLICY IF EXISTS "Allow updating tags with household check" ON tags;
DROP POLICY IF EXISTS "Allow deleting tags with household check" ON tags;
DROP POLICY IF EXISTS "Users can view tags in their household" ON tags;
DROP POLICY IF EXISTS "Users can insert tags in their household" ON tags;
DROP POLICY IF EXISTS "Users can update tags in their household" ON tags;
DROP POLICY IF EXISTS "Users can delete tags in their household" ON tags;

-- Tags SELECT policy (matches plants logic with household check and fallback)
CREATE POLICY "Allow viewing tags with household check" ON tags FOR SELECT 
USING (
    (household_id IN ( 
        SELECT household_members.household_id
        FROM household_members
        WHERE (household_members.user_id = auth.uid())
    )) 
    OR (auth.uid() IS NULL) 
    OR (NOT (EXISTS ( 
        SELECT 1
        FROM household_members
        WHERE (household_members.user_id = auth.uid())
    )))
);

-- Tags INSERT policy (similar to plants, but requires household_id)
CREATE POLICY "Allow inserting tags" ON tags FOR INSERT 
WITH CHECK (household_id IS NOT NULL);

-- Tags UPDATE policy (matches plants logic with household check and fallback)
CREATE POLICY "Allow updating tags with household check" ON tags FOR UPDATE 
USING (
    (household_id IN ( 
        SELECT household_members.household_id
        FROM household_members
        WHERE (household_members.user_id = auth.uid())
    )) 
    OR (auth.uid() IS NULL) 
    OR (NOT (EXISTS ( 
        SELECT 1
        FROM household_members
        WHERE (household_members.user_id = auth.uid())
    )))
);

-- Tags DELETE policy (matches plants logic with household check and fallback)
CREATE POLICY "Allow deleting tags with household check" ON tags FOR DELETE 
USING (
    (household_id IN ( 
        SELECT household_members.household_id
        FROM household_members
        WHERE (household_members.user_id = auth.uid())
    )) 
    OR (auth.uid() IS NULL) 
    OR (NOT (EXISTS ( 
        SELECT 1
        FROM household_members
        WHERE (household_members.user_id = auth.uid())
    )))
);

-- Step 6: Migrate existing data from plant_tags to tags table (only if old table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plant_tags' AND table_schema = 'public') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plant_tags_old' AND table_schema = 'public') THEN
        
        -- Extract unique tags and insert them into the new tags table
        INSERT INTO tags (name, color, household_id, created_at, updated_at)
        SELECT DISTINCT 
            TRIM(name) as name,
            UPPER(color) as color,
            household_id,
            MIN(created_at) as created_at,
            MIN(updated_at) as updated_at
        FROM plant_tags
        GROUP BY TRIM(name), UPPER(color), household_id
        ON CONFLICT DO NOTHING;
    END IF;
END $$;

-- Step 7: Rename the current plant_tags table to plant_tags_old for backup (only if not already renamed)
DO $$
BEGIN
    -- Only rename if we have the old structure (with name/color columns) and not the new junction structure
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plant_tags' AND table_schema = 'public') 
       AND NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plant_tags_old' AND table_schema = 'public')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plant_tags' AND column_name = 'name' AND table_schema = 'public')
       AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'plant_tags' AND column_name = 'color' AND table_schema = 'public') THEN
        ALTER TABLE plant_tags RENAME TO plant_tags_old;
    END IF;
END $$;

-- Step 8: Create the new plant_tags junction table
CREATE TABLE IF NOT EXISTS plant_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plant_id UUID NOT NULL,
    tag_id UUID NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints to plant_tags junction table only if they don't already exist
DO $$
BEGIN
    -- Add foreign key constraints if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'plant_tags_junction_plant_id_fkey' 
                   AND table_schema = 'public'
                   AND table_name = 'plant_tags') THEN
        ALTER TABLE plant_tags ADD CONSTRAINT plant_tags_junction_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'plant_tags_junction_tag_id_fkey' 
                   AND table_schema = 'public'
                   AND table_name = 'plant_tags') THEN
        ALTER TABLE plant_tags ADD CONSTRAINT plant_tags_junction_tag_id_fkey FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE;
    END IF;
    
    -- Add unique constraint if it doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'plant_tags_unique_assignment' 
                   AND table_schema = 'public'
                   AND table_name = 'plant_tags') THEN
        ALTER TABLE plant_tags ADD CONSTRAINT plant_tags_unique_assignment UNIQUE (plant_id, tag_id);
    END IF;
END $$;

-- Step 9: Create indexes for the junction table (drop first to avoid conflicts)
DROP INDEX IF EXISTS idx_plant_tags_plant_id;
DROP INDEX IF EXISTS idx_plant_tags_tag_id;

CREATE INDEX idx_plant_tags_plant_id ON plant_tags(plant_id);
CREATE INDEX idx_plant_tags_tag_id ON plant_tags(tag_id);

-- Step 10: Enable Row Level Security (RLS) for plant_tags junction table (only if not already enabled)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables 
        WHERE tablename = 'plant_tags' 
        AND rowsecurity = true
    ) THEN
        ALTER TABLE plant_tags ENABLE ROW LEVEL SECURITY;
    END IF;
END $$;

-- Step 11: Create policies for plant_tags junction table (drop existing ones first)
-- These policies check household access via the related plants and tags
DROP POLICY IF EXISTS "Users can view plant tags" ON plant_tags;
DROP POLICY IF EXISTS "Users can insert plant tags" ON plant_tags;
DROP POLICY IF EXISTS "Users can delete plant tags" ON plant_tags;
DROP POLICY IF EXISTS "Allow viewing plant tags with household check" ON plant_tags;
DROP POLICY IF EXISTS "Allow inserting plant tags with household check" ON plant_tags;
DROP POLICY IF EXISTS "Allow deleting plant tags with household check" ON plant_tags;

-- Plant_tags SELECT policy (check household via plant with fallback logic)
CREATE POLICY "Allow viewing plant tags with household check" ON plant_tags FOR SELECT 
USING (
    EXISTS (
        SELECT 1 FROM plants p 
        WHERE p.id = plant_tags.plant_id 
        AND (
            (p.household_id IN ( 
                SELECT household_members.household_id
                FROM household_members
                WHERE (household_members.user_id = auth.uid())
            )) 
            OR (auth.uid() IS NULL) 
            OR (NOT (EXISTS ( 
                SELECT 1
                FROM household_members
                WHERE (household_members.user_id = auth.uid())
            )))
        )
    )
);

-- Plant_tags INSERT policy (check both plant and tag household access)
CREATE POLICY "Allow inserting plant tags with household check" ON plant_tags FOR INSERT 
WITH CHECK (
    EXISTS (
        SELECT 1 FROM plants p 
        WHERE p.id = plant_tags.plant_id 
        AND (
            (p.household_id IN ( 
                SELECT household_members.household_id
                FROM household_members
                WHERE (household_members.user_id = auth.uid())
            )) 
            OR (auth.uid() IS NULL) 
            OR (NOT (EXISTS ( 
                SELECT 1
                FROM household_members
                WHERE (household_members.user_id = auth.uid())
            )))
        )
    )
    AND EXISTS (
        SELECT 1 FROM tags t 
        WHERE t.id = plant_tags.tag_id 
        AND (
            (t.household_id IN ( 
                SELECT household_members.household_id
                FROM household_members
                WHERE (household_members.user_id = auth.uid())
            )) 
            OR (auth.uid() IS NULL) 
            OR (NOT (EXISTS ( 
                SELECT 1
                FROM household_members
                WHERE (household_members.user_id = auth.uid())
            )))
        )
    )
);

-- Plant_tags DELETE policy (check household via plant with fallback logic)
CREATE POLICY "Allow deleting plant tags with household check" ON plant_tags FOR DELETE 
USING (
    EXISTS (
        SELECT 1 FROM plants p 
        WHERE p.id = plant_tags.plant_id 
        AND (
            (p.household_id IN ( 
                SELECT household_members.household_id
                FROM household_members
                WHERE (household_members.user_id = auth.uid())
            )) 
            OR (auth.uid() IS NULL) 
            OR (NOT (EXISTS ( 
                SELECT 1
                FROM household_members
                WHERE (household_members.user_id = auth.uid())
            )))
        )
    )
);

-- Step 12: Migrate the relationships from old plant_tags to new junction table (only if old table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plant_tags_old' AND table_schema = 'public') THEN
        INSERT INTO plant_tags (plant_id, tag_id, created_at)
        SELECT DISTINCT 
            pto.plant_id,
            t.id as tag_id,
            pto.created_at
        FROM plant_tags_old pto
        JOIN tags t ON (
            TRIM(pto.name) = t.name AND 
            UPPER(pto.color) = t.color AND 
            pto.household_id = t.household_id
        )
        ON CONFLICT (plant_id, tag_id) DO NOTHING;
    END IF;
END $$;

-- Step 13: Verify migration was successful by checking counts (only if old table exists)
DO $$
DECLARE 
    old_count INTEGER := 0;
    new_relationships_count INTEGER := 0;
    unique_tags_count INTEGER := 0;
BEGIN
    -- Count unique tags created
    SELECT COUNT(*) INTO unique_tags_count FROM tags;
    
    -- Count new relationships
    SELECT COUNT(*) INTO new_relationships_count FROM plant_tags;
    
    -- Only check old table if it exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plant_tags_old' AND table_schema = 'public') THEN
        SELECT COUNT(*) INTO old_count FROM plant_tags_old;
        
        -- Log the results
        RAISE NOTICE 'Migration Summary:';
        RAISE NOTICE '- Original plant_tags records: %', old_count;
        RAISE NOTICE '- New plant-tag relationships: %', new_relationships_count;
        RAISE NOTICE '- Unique tags created: %', unique_tags_count;
        
        -- Verify we didn't lose any relationships
        IF new_relationships_count < old_count THEN
            RAISE WARNING 'Some relationships may have been lost during migration. Please verify manually.';
        END IF;
    ELSE
        -- Fresh migration or already completed
        RAISE NOTICE 'Migration Summary:';
        RAISE NOTICE '- New plant-tag relationships: %', new_relationships_count;
        RAISE NOTICE '- Unique tags created: %', unique_tags_count;
        RAISE NOTICE '- No old table found - this may be a fresh migration or already completed';
    END IF;
END $$;

COMMIT;

-- Notes for verification:
-- 1. Check that all plants retained their tags:
--    SELECT p.id, p.name, COUNT(pt.tag_id) as tag_count 
--    FROM plants p 
--    LEFT JOIN plant_tags pt ON p.id = pt.plant_id 
--    GROUP BY p.id, p.name;
--
-- 2. Check that tags were created correctly:
--    SELECT t.name, t.color, COUNT(pt.plant_id) as plant_count 
--    FROM tags t 
--    LEFT JOIN plant_tags pt ON t.id = pt.tag_id 
--    GROUP BY t.id, t.name, t.color 
--    ORDER BY t.name;
--
-- 3. Once verified, you can drop the backup table:
--    DROP TABLE plant_tags_old;