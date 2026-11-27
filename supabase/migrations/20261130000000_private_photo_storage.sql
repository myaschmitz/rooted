-- Make plant photos private to their household.
--
-- The plant-photos bucket was public, and its storage rules let the anon key
-- list files, so anyone holding the app's public key could list and download
-- every household's photos. From here on the bucket is private: the app asks
-- for short-lived signed links (services/PhotoUrlService.ts), and storage only
-- serves, accepts or deletes a file for a signed-in device whose household
-- owns it.
--
-- Every photo file is named after its plant: "<plant id>_<timestamp>.jpg",
-- "<plant id>_event_<event id>_<timestamp>.jpg", plus "_thumb" variants
-- (constants/domain.ts). So the owning household comes from the file name,
-- which covers existing files without moving them.
--
-- A plant's files can only be removed while the plant still exists, so the
-- app deletes them before deleting the plant (PlantService.deletePlant).
--
-- Rollout: app builds older than this change load photos from their old public
-- URLs, which stop working once the bucket is private. Push this migration and
-- publish the app update together.

-- Household that owns a photo file, from the plant id its name starts with.
-- NULL when the name doesn't start with a plant id or the plant no longer
-- exists. SECURITY DEFINER so the lookup isn't limited by the caller's own
-- access to plants.
CREATE OR REPLACE FUNCTION private.photo_object_household(p_name TEXT)
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT p.household_id
    FROM public.plants p
    WHERE p_name ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}_'
      AND p.id = left(p_name, 36)::UUID;
$$;

REVOKE ALL ON FUNCTION private.photo_object_household(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.photo_object_household(TEXT) TO authenticated;

-- Drop the existing rules for this bucket. They were created in the dashboard,
-- so their names aren't known here. Rules that don't mention any bucket also
-- apply to this one and are dropped too (logged so they can be recreated for
-- another bucket if one needed them).
DO $$
DECLARE
    v_policy RECORD;
BEGIN
    FOR v_policy IN
        SELECT policyname, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'storage'
          AND tablename = 'objects'
    LOOP
        IF coalesce(v_policy.qual, '') || coalesce(v_policy.with_check, '') LIKE '%plant-photos%'
           OR coalesce(v_policy.qual, '') || coalesce(v_policy.with_check, '') NOT LIKE '%bucket_id%'
        THEN
            RAISE NOTICE 'Dropping storage policy "%"', v_policy.policyname;
            EXECUTE format('DROP POLICY %I ON storage.objects', v_policy.policyname);
        END IF;
    END LOOP;
END $$;

CREATE POLICY "Members read household photos" ON storage.objects
    FOR SELECT TO authenticated
    USING (
        bucket_id = 'plant-photos'
        AND private.photo_object_household(name) IN (SELECT private.my_household_ids())
    );

CREATE POLICY "Members upload household photos" ON storage.objects
    FOR INSERT TO authenticated
    WITH CHECK (
        bucket_id = 'plant-photos'
        AND private.photo_object_household(name) IN (SELECT private.my_household_ids())
    );

CREATE POLICY "Members delete household photos" ON storage.objects
    FOR DELETE TO authenticated
    USING (
        bucket_id = 'plant-photos'
        AND private.photo_object_household(name) IN (SELECT private.my_household_ids())
    );

-- No UPDATE rule: the app never overwrites or moves a file.

UPDATE storage.buckets SET public = false WHERE id = 'plant-photos';
