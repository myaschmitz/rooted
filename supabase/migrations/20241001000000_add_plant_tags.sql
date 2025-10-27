-- Migration to add plant tags functionality
-- Run this migration to create plant_tags table and related constraints

BEGIN;

-- Create plant_tags table
CREATE TABLE plant_tags (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    color TEXT NOT NULL, -- Hex color code (e.g., '#FF5733')
    household_id TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- Ensure tag names are not empty and color is a valid hex format
    CONSTRAINT check_tag_name_not_empty CHECK (LENGTH(TRIM(name)) > 0),
    CONSTRAINT check_tag_name_length CHECK (LENGTH(TRIM(name)) <= 50),
    CONSTRAINT check_color_hex_format CHECK (color ~ '^#[0-9A-Fa-f]{6}$'),
    CONSTRAINT plant_tags_household_id_fkey FOREIGN KEY (household_id) REFERENCES households(id),
    CONSTRAINT plant_tags_plant_id_fkey FOREIGN KEY (plant_id) REFERENCES plants(id) ON DELETE CASCADE
);

-- Create indexes for better query performance
CREATE INDEX idx_plant_tags_plant_id ON plant_tags(plant_id);
CREATE INDEX idx_plant_tags_household_id ON plant_tags(household_id);
CREATE INDEX idx_plant_tags_name ON plant_tags(name);

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_plant_tags_updated_at BEFORE UPDATE ON plant_tags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for plant_tags table
ALTER TABLE plant_tags ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users
CREATE POLICY "Users can view plant tags" ON plant_tags FOR SELECT 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can insert plant tags" ON plant_tags FOR INSERT 
    WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Users can update plant tags" ON plant_tags FOR UPDATE 
    USING (auth.role() = 'authenticated');

CREATE POLICY "Users can delete plant tags" ON plant_tags FOR DELETE 
    USING (auth.role() = 'authenticated');

-- Create a unique index to prevent duplicate tag names for the same plant (case-insensitive)
CREATE UNIQUE INDEX idx_plant_tags_unique_name 
ON plant_tags (plant_id, LOWER(TRIM(name)));

COMMIT;

-- Verification queries to check the migration results:
-- SELECT table_name, column_name, data_type FROM information_schema.columns WHERE table_name = 'plant_tags';
-- SELECT * FROM plant_tags LIMIT 5;