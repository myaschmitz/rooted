-- Replace insecure plant_tags policies with household-aware secure policies
-- Follow the same security model as the plants table

BEGIN;

-- Drop all existing policies to ensure clean state
DROP POLICY IF EXISTS "Users can view plant tags" ON plant_tags;
DROP POLICY IF EXISTS "Users can insert plant tags" ON plant_tags;
DROP POLICY IF EXISTS "Users can update plant tags" ON plant_tags;
DROP POLICY IF EXISTS "Users can delete plant tags" ON plant_tags;
DROP POLICY IF EXISTS "Users can view household plant tags" ON plant_tags;
DROP POLICY IF EXISTS "Users can insert household plant tags" ON plant_tags;
DROP POLICY IF EXISTS "Users can update household plant tags" ON plant_tags;
DROP POLICY IF EXISTS "Users can delete household plant tags" ON plant_tags;

-- Create secure policies that check household membership (only if table exists)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'plant_tags' AND table_schema = 'public') THEN
        -- SELECT: Users can view plant tags only for their household plants
        EXECUTE 'CREATE POLICY "Users can view household plant tags" ON plant_tags FOR SELECT
            USING (
                auth.role() = ''authenticated''::text 
                AND household_id IN (
                    SELECT household_members.household_id
                    FROM household_members
                    WHERE (household_members.user_id = auth.uid()) 
                       OR (household_members.user_name = auth.email())
                )
            )';

        -- INSERT: Users can add tags only to plants in their households
        EXECUTE 'CREATE POLICY "Users can insert household plant tags" ON plant_tags FOR INSERT
            WITH CHECK (
                auth.role() = ''authenticated''::text 
                AND household_id IN (
                    SELECT household_members.household_id
                    FROM household_members
                    WHERE (household_members.user_id = auth.uid()) 
                       OR (household_members.user_name = auth.email())
                )
            )';

        -- UPDATE: Users can update tags only for plants in their households
        EXECUTE 'CREATE POLICY "Users can update household plant tags" ON plant_tags FOR UPDATE
            USING (
                auth.role() = ''authenticated''::text 
                AND household_id IN (
                    SELECT household_members.household_id
                    FROM household_members
                    WHERE (household_members.user_id = auth.uid()) 
                       OR (household_members.user_name = auth.email())
                )
            )';

        -- DELETE: Users can delete tags only for plants in their households
        EXECUTE 'CREATE POLICY "Users can delete household plant tags" ON plant_tags FOR DELETE
            USING (
                auth.role() = ''authenticated''::text 
                AND household_id IN (
                    SELECT household_members.household_id
                    FROM household_members
                    WHERE (household_members.user_id = auth.uid()) 
                       OR (household_members.user_name = auth.email())
                )
            )';
    END IF;
END $$;

COMMIT;