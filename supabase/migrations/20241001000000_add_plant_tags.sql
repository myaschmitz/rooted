-- Migration to add plant tags functionality
-- Run this migration to create plant_tags table and related constraints

BEGIN;

-- Create plant_tags table (only if it doesn't exist)
CREATE TABLE IF NOT EXISTS plant_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plant_id UUID NOT NULL,
    name TEXT NOT NULL,
    color TEXT NOT NULL, -- Hex color code (e.g., '#FF5733')
    household_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add constraints only if they don't already exist
DO $$
BEGIN
    -- Add check constraints if they don't exist (using table_constraints for all)
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'check_tag_name_not_empty' 
                   AND table_schema = 'public' 
                   AND table_name = 'plant_tags') THEN
        ALTER TABLE plant_tags ADD CONSTRAINT check_tag_name_not_empty CHECK (LENGTH(TRIM(name)) > 0);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'check_tag_name_length' 
                   AND table_schema = 'public' 
                   AND table_name = 'plant_tags') THEN
        ALTER TABLE plant_tags ADD CONSTRAINT check_tag_name_length CHECK (LENGTH(TRIM(name)) <= 50);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'check_color_hex_format' 
                   AND table_schema = 'public' 
                   AND table_name = 'plant_tags') THEN
        ALTER TABLE plant_tags ADD CONSTRAINT check_color_hex_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$');
    END IF;
    
    -- Add foreign key constraints if they don't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'plant_tags_household_id_fkey' 
                   AND table_schema = 'public' 
                   AND table_name = 'plant_tags') THEN
        ALTER TABLE plant_tags ADD CONSTRAINT plant_tags_household_id_fkey FOREIGN KEY (household_id) REFERENCES households(id);
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints 
                   WHERE constraint_name = 'plant_tags_plant_id_fkey' 
                   AND table_schema = 'public' 
                   AND table_name = 'plant_tags') THEN
        ALTER TABLE plant_tags ADD CONSTRAINT plant_tags_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Create indexes for better query performance (drop first to avoid conflicts)
DROP INDEX IF EXISTS idx_plant_tags_plant_id;
DROP INDEX IF EXISTS idx_plant_tags_household_id;
DROP INDEX IF EXISTS idx_plant_tags_name;

CREATE INDEX idx_plant_tags_plant_id ON plant_tags(plant_id);
CREATE INDEX idx_plant_tags_household_id ON plant_tags(household_id);
CREATE INDEX idx_plant_tags_name ON plant_tags(name);

-- Create trigger to automatically update updated_at (drop first to avoid conflicts)
DROP TRIGGER IF EXISTS update_plant_tags_updated_at ON plant_tags;
CREATE TRIGGER update_plant_tags_updated_at BEFORE UPDATE ON plant_tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for plant_tags table (only if not already enabled)
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

-- Create policies for authenticated users (drop existing ones first)
DROP POLICY IF EXISTS "Users can view plant tags" ON plant_tags;
DROP POLICY IF EXISTS "Users can insert plant tags" ON plant_tags;
DROP POLICY IF EXISTS "Users can update plant tags" ON plant_tags;
DROP POLICY IF EXISTS "Users can delete plant tags" ON plant_tags;

CREATE POLICY "Users can view plant tags" ON plant_tags FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert plant tags" ON plant_tags FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update plant tags" ON plant_tags FOR UPDATE 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete plant tags" ON plant_tags FOR DELETE 
    USING (auth.role() = 'authenticated');

-- Create a unique index to prevent duplicate tag names for the same plant (case-insensitive)
DROP INDEX IF EXISTS idx_plant_tags_unique_name;
CREATE UNIQUE INDEX idx_plant_tags_unique_name 
ON plant_tags (plant_id, LOWER(TRIM(name)));

COMMIT;

-- Verification queries to check the migration results:
-- SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name = 'plant_tags';
-- SELECT * FROM plant_tags LIMIT 5;