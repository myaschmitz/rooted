-- Add archive functionality to plants table
ALTER TABLE plants ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE plants ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

-- Index for efficiently querying archived/non-archived plants
CREATE INDEX IF NOT EXISTS idx_plants_archived ON plants (household_id, archived);
