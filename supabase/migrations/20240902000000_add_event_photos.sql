-- Migration: Add event photo linking support
-- This enables linking photos directly to care events

-- Add event_id column to plant_photos table to link photos to events
-- This is optional (nullable) since photos can exist without being linked to events
ALTER TABLE plant_photos 
ADD COLUMN event_id UUID REFERENCES events(id) ON DELETE SET NULL;

-- Create index for better query performance when fetching photos for events
CREATE INDEX idx_plant_photos_event_id ON plant_photos(event_id);

-- Update the existing trigger to handle the new column
-- (The existing update trigger should automatically handle the new column)

-- Add helpful comments
COMMENT ON COLUMN plant_photos.event_id IS 'Optional reference to the care event this photo was taken for';
COMMENT ON INDEX idx_plant_photos_event_id IS 'Index for querying photos by event ID';