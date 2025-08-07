-- Migration to update fertilizer concentration to preset strengths
-- Run this migration to update the database schema

BEGIN;

-- Step 1: Update existing fertilizer_concentration values to match new preset values
-- Map common existing values to preset strengths
UPDATE events 
SET fertilizer_concentration = CASE
    WHEN LOWER(fertilizer_concentration) LIKE '%quarter%' OR 
         LOWER(fertilizer_concentration) LIKE '%1/4%' OR 
         LOWER(fertilizer_concentration) LIKE '%0.25%' THEN '1/4'
    WHEN LOWER(fertilizer_concentration) LIKE '%half%' OR 
         LOWER(fertilizer_concentration) LIKE '%1/2%' OR 
         LOWER(fertilizer_concentration) LIKE '%0.5%' THEN '1/2'
    WHEN LOWER(fertilizer_concentration) LIKE '%full%' OR 
         LOWER(fertilizer_concentration) LIKE '%normal%' OR 
         LOWER(fertilizer_concentration) LIKE '%1x%' OR
         LOWER(fertilizer_concentration) LIKE '%regular%' THEN '1x'
    WHEN LOWER(fertilizer_concentration) LIKE '%1.5%' OR 
         LOWER(fertilizer_concentration) LIKE '%one and half%' THEN '1.5x'
    WHEN LOWER(fertilizer_concentration) LIKE '%double%' OR 
         LOWER(fertilizer_concentration) LIKE '%2x%' OR 
         LOWER(fertilizer_concentration) LIKE '%twice%' THEN '2x'
    ELSE '1x' -- Default fallback for any unrecognized values
END
WHERE event_type IN ('fertilize', 'fertigate') 
AND fertilizer_concentration IS NOT NULL;

-- Step 2: Remove the fertilizer_amount column
ALTER TABLE events DROP COLUMN IF EXISTS fertilizer_amount;

-- Step 3: Add constraint to ensure only preset strength values are allowed
ALTER TABLE events 
ADD CONSTRAINT check_fertilizer_concentration 
CHECK (fertilizer_concentration IS NULL OR fertilizer_concentration IN ('1/4', '1/2', '1x', '1.5x', '2x'));

COMMIT;

-- Verification queries to check the migration results:
-- SELECT DISTINCT fertilizer_concentration FROM events WHERE event_type IN ('fertilize', 'fertigate');
-- SELECT COUNT(*) FROM events WHERE event_type IN ('fertilize', 'fertigate') AND fertilizer_concentration IS NOT NULL;