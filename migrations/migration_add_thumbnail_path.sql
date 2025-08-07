-- Migration: Add thumbnail_path column to plant_photos table
-- Run this on existing databases to add the new thumbnail_path field

-- Add the thumbnail_path column to the plant_photos table
ALTER TABLE plant_photos ADD COLUMN thumbnail_path TEXT;

-- The column is nullable to support backward compatibility
-- Existing photos will have thumbnail_path = NULL
-- New photos will have both file_path (full-size) and thumbnail_path (thumbnail)