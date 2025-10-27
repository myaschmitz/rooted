-- Drop redundant plant policies that are too permissive
-- Keep the more secure "Users can..." policies that require authentication

-- Drop the "Allow..." policies (less secure)
DROP POLICY IF EXISTS "Allow deleting plants with household check" ON plants;
DROP POLICY IF EXISTS "Allow inserting plants" ON plants;
DROP POLICY IF EXISTS "Allow updating plants with household check" ON plants;
DROP POLICY IF EXISTS "Allow viewing plants with household check" ON plants;

-- The "Users can..." policies remain active and provide proper security:
-- - Users can delete household plants
-- - Users can insert household plants
-- - Users can update household plants
-- - Users can view household plants