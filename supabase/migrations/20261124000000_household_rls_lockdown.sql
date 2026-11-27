-- Restrict household data to the members of that household.
--
-- Before this migration the app used only the public anon key with no auth
-- session, and the policies let a request through when auth.uid() was NULL.
-- Anyone holding the anon key (it ships inside the app) could read, change or
-- delete every household's data; the app's own `.eq("household_id", …)`
-- filter was the only isolation.
--
-- From here on:
--   * Every app install signs in with supabase.auth.signInAnonymously(), so
--     each request carries an auth.uid().
--   * household_member_devices links that auth user to a household_members
--     row. A device gets linked by creating a household, joining one with its
--     code, or (for installs that predate this migration) claiming the member
--     it already had stored locally.
--   * Every table policy checks that link. The anon role gets nothing.
--   * Writes that need to happen before a device is a member (create, join,
--     claim, validate code, regenerate code) go through SECURITY DEFINER
--     functions below.
--
-- Requires anonymous sign-ins to be enabled for the project
-- (Dashboard → Authentication → Sign In / Providers → Anonymous sign-ins).
--
-- Rollout: app builds older than this change don't sign in, so they lose
-- access as soon as this runs. Push this migration and publish the app update
-- (EAS update + web deploy) together.

-- ---------------------------------------------------------------------------
-- Device ↔ member link
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.household_member_devices (
    auth_user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    member_id UUID NOT NULL REFERENCES public.household_members(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (auth_user_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_household_member_devices_member_id
    ON public.household_member_devices (member_id);

-- Membership lookups filter household_members by household and name.
CREATE INDEX IF NOT EXISTS idx_household_members_household_lower_name
    ON public.household_members (household_id, LOWER(user_name));

-- ---------------------------------------------------------------------------
-- Policy helpers
--
-- They live in a schema the API doesn't expose, and run as SECURITY DEFINER so
-- policies on household_members can call them without recursing into
-- themselves.
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated;

-- Households the signed-in device belongs to. Policies use it as
-- `household_id IN (SELECT private.my_household_ids())`, which Postgres runs
-- once per query rather than once per row.
CREATE OR REPLACE FUNCTION private.my_household_ids()
RETURNS SETOF TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT m.household_id
    FROM public.household_member_devices d
    JOIN public.household_members m ON m.id = d.member_id
    WHERE d.auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.my_member_ids()
RETURNS SETOF UUID
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT d.member_id
    FROM public.household_member_devices d
    WHERE d.auth_user_id = auth.uid();
$$;

CREATE OR REPLACE FUNCTION private.is_household_admin(p_household_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.household_member_devices d
        JOIN public.household_members m ON m.id = d.member_id
        WHERE d.auth_user_id = auth.uid()
          AND m.household_id = p_household_id
          AND m.role = 'admin'
    );
$$;

-- Links the signed-in device to a member. A device belongs to one household
-- at a time, so links to members of other households are dropped.
CREATE OR REPLACE FUNCTION private.link_device(p_member_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_uid UUID := auth.uid();
BEGIN
    IF v_uid IS NULL THEN
        RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
    END IF;

    DELETE FROM public.household_member_devices
    WHERE auth_user_id = v_uid
      AND member_id <> p_member_id;

    INSERT INTO public.household_member_devices (auth_user_id, member_id)
    VALUES (v_uid, p_member_id)
    ON CONFLICT DO NOTHING;
END;
$$;

-- Household codes are 'H' + 7 characters, without look-alikes (0/O, 1/I/L).
-- They act as the household's shared secret, so they come from
-- gen_random_uuid() (cryptographically random) rather than random().
CREATE OR REPLACE FUNCTION private.new_household_code()
RETURNS TEXT
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_alphabet CONSTANT TEXT := 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
    v_bytes BYTEA;
    v_code TEXT;
BEGIN
    LOOP
        v_bytes := uuid_send(gen_random_uuid());
        v_code := 'H';
        FOR i IN 0..6 LOOP
            v_code := v_code || substr(
                v_alphabet,
                (get_byte(v_bytes, i) % length(v_alphabet)) + 1,
                1
            );
        END LOOP;
        EXIT WHEN NOT EXISTS (SELECT 1 FROM public.households WHERE id = v_code);
    END LOOP;
    RETURN v_code;
END;
$$;

REVOKE ALL ON ALL FUNCTIONS IN SCHEMA private FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.my_household_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION private.my_member_ids() TO authenticated;
GRANT EXECUTE ON FUNCTION private.is_household_admin(TEXT) TO authenticated;

-- ---------------------------------------------------------------------------
-- Replace every existing policy
--
-- The live projects carry policies that were created outside this repo's
-- migrations, so drop whatever is there rather than naming them.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    v_policy RECORD;
    v_table TEXT;
BEGIN
    FOR v_policy IN
        SELECT schemaname, tablename, policyname
        FROM pg_policies
        WHERE schemaname = 'public'
          AND tablename = ANY (ARRAY[
              'households', 'household_members', 'household_member_devices',
              'household_users', 'activity_log', 'plants', 'events',
              'plant_photos', 'plant_notes', 'tags', 'plant_tags'
          ])
    LOOP
        EXECUTE format(
            'DROP POLICY %I ON %I.%I',
            v_policy.policyname, v_policy.schemaname, v_policy.tablename
        );
    END LOOP;

    -- Legacy table the app no longer reads. If it still exists, lock it.
    FOREACH v_table IN ARRAY ARRAY['household_users'] LOOP
        IF to_regclass(format('public.%I', v_table)) IS NOT NULL THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', v_table);
            EXECUTE format('REVOKE ALL ON public.%I FROM anon, authenticated', v_table);
        END IF;
    END LOOP;
END $$;

ALTER TABLE public.households ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.household_member_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plant_tags ENABLE ROW LEVEL SECURITY;

-- The anon role (no sign-in) gets no table access at all.
REVOKE ALL ON
    public.households, public.household_members, public.household_member_devices,
    public.activity_log, public.plants, public.events, public.plant_photos,
    public.plant_notes, public.tags, public.plant_tags
FROM anon;

-- Devices can't write their own links; only the functions below do.
REVOKE INSERT, UPDATE, DELETE ON public.household_member_devices FROM authenticated;
GRANT SELECT ON public.household_member_devices TO authenticated;

-- ---------------------------------------------------------------------------
-- Policies
-- ---------------------------------------------------------------------------

-- Household data: members can read and write their own household's rows.
CREATE POLICY "Members manage household plants" ON public.plants
    FOR ALL TO authenticated
    USING (household_id IN (SELECT private.my_household_ids()))
    WITH CHECK (household_id IN (SELECT private.my_household_ids()));

CREATE POLICY "Members manage household events" ON public.events
    FOR ALL TO authenticated
    USING (household_id IN (SELECT private.my_household_ids()))
    WITH CHECK (household_id IN (SELECT private.my_household_ids()));

CREATE POLICY "Members manage household photos" ON public.plant_photos
    FOR ALL TO authenticated
    USING (household_id IN (SELECT private.my_household_ids()))
    WITH CHECK (household_id IN (SELECT private.my_household_ids()));

CREATE POLICY "Members manage household notes" ON public.plant_notes
    FOR ALL TO authenticated
    USING (household_id IN (SELECT private.my_household_ids()))
    WITH CHECK (household_id IN (SELECT private.my_household_ids()));

CREATE POLICY "Members manage household tags" ON public.tags
    FOR ALL TO authenticated
    USING (household_id IN (SELECT private.my_household_ids()))
    WITH CHECK (household_id IN (SELECT private.my_household_ids()));

-- plant_tags has no household_id; it inherits the plant's household, and a
-- plant can only be tagged with a tag from that same household.
CREATE POLICY "Members manage household plant tags" ON public.plant_tags
    FOR ALL TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM public.plants p
            WHERE p.id = plant_tags.plant_id
              AND p.household_id IN (SELECT private.my_household_ids())
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1
            FROM public.plants p
            JOIN public.tags t ON t.household_id = p.household_id
            WHERE p.id = plant_tags.plant_id
              AND t.id = plant_tags.tag_id
              AND p.household_id IN (SELECT private.my_household_ids())
        )
    );

-- The activity log is append-only for members.
CREATE POLICY "Members read household activity" ON public.activity_log
    FOR SELECT TO authenticated
    USING (household_id IN (SELECT private.my_household_ids()));

CREATE POLICY "Members add household activity" ON public.activity_log
    FOR INSERT TO authenticated
    WITH CHECK (household_id IN (SELECT private.my_household_ids()));

-- Households: members read; admins rename or delete. Creating one goes
-- through create_household(), changing the code through
-- regenerate_household_code().
CREATE POLICY "Members read their household" ON public.households
    FOR SELECT TO authenticated
    USING (id IN (SELECT private.my_household_ids()));

CREATE POLICY "Admins update their household" ON public.households
    FOR UPDATE TO authenticated
    USING (private.is_household_admin(id))
    WITH CHECK (private.is_household_admin(id));

CREATE POLICY "Admins delete their household" ON public.households
    FOR DELETE TO authenticated
    USING (private.is_household_admin(id));

-- Members: everyone in the household sees the member list; admins change
-- roles or remove people; anyone can remove themselves (leave). New members
-- come in through create_household() / join_household().
CREATE POLICY "Members read household members" ON public.household_members
    FOR SELECT TO authenticated
    USING (household_id IN (SELECT private.my_household_ids()));

CREATE POLICY "Admins update household members" ON public.household_members
    FOR UPDATE TO authenticated
    USING (private.is_household_admin(household_id))
    WITH CHECK (private.is_household_admin(household_id));

CREATE POLICY "Admins remove members, members leave" ON public.household_members
    FOR DELETE TO authenticated
    USING (
        private.is_household_admin(household_id)
        OR id IN (SELECT private.my_member_ids())
    );

CREATE POLICY "Devices read their own links" ON public.household_member_devices
    FOR SELECT TO authenticated
    USING (auth_user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Household functions callable from the app
--
-- The live projects have older versions of create_household / join_household
-- whose argument types aren't recorded in this repo, so drop every overload
-- before recreating them.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
    v_fn RECORD;
BEGIN
    FOR v_fn IN
        SELECT p.oid::regprocedure AS signature
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
          AND p.proname IN (
              'create_household', 'join_household', 'claim_household_membership',
              'validate_household_code', 'regenerate_household_code'
          )
    LOOP
        EXECUTE format('DROP FUNCTION %s', v_fn.signature);
    END LOOP;
END $$;

-- Returns the household name when the code exists. Non-members can't select
-- from households, so the join screen calls this instead.
CREATE FUNCTION public.validate_household_code(p_code TEXT)
RETURNS TABLE (valid BOOLEAN, household_name TEXT)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_column
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
    END IF;

    RETURN QUERY
    SELECT TRUE, h.name
    FROM public.households h
    WHERE h.id = upper(trim(p_code));

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT;
    END IF;
END;
$$;

-- admin_user_id is accepted for compatibility with older app builds and
-- ignored: the device's auth user is what gets linked.
CREATE FUNCTION public.create_household(
    household_name TEXT,
    admin_user_name TEXT,
    admin_user_id TEXT DEFAULT NULL
)
RETURNS TABLE (household_id TEXT, household_code TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_variable
DECLARE
    v_code TEXT;
    v_member_id UUID;
    v_household_name TEXT := trim(household_name);
    v_user_name TEXT := trim(admin_user_name);
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
    END IF;
    IF v_household_name = '' OR v_user_name = '' THEN
        RAISE EXCEPTION 'Household name and your name are required' USING ERRCODE = '22023';
    END IF;

    v_code := private.new_household_code();

    INSERT INTO public.households (id, name)
    VALUES (v_code, v_household_name);

    INSERT INTO public.household_members (household_id, user_name, role)
    VALUES (v_code, v_user_name, 'admin')
    RETURNING id INTO v_member_id;

    PERFORM private.link_device(v_member_id);

    RETURN QUERY SELECT v_code, v_code;
END;
$$;

-- Joins a household by code. If a member with that name already exists
-- (case-insensitive) the device is linked to them, which is how someone
-- signs back in on a new device; otherwise a new member is added.
-- member_user_id is accepted for compatibility and ignored.
CREATE FUNCTION public.join_household(
    household_code TEXT,
    member_user_name TEXT,
    member_user_id TEXT DEFAULT NULL
)
RETURNS TABLE (
    success BOOLEAN,
    household_name TEXT,
    error_message TEXT,
    user_name TEXT,
    role TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_variable
DECLARE
    v_code TEXT := upper(trim(household_code));
    v_user_name TEXT := trim(member_user_name);
    v_household_name TEXT;
    v_member public.household_members%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
    END IF;
    IF v_user_name = '' THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, 'Please enter your name'::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    SELECT h.name INTO v_household_name
    FROM public.households h
    WHERE h.id = v_code;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, 'Household code not found'::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    SELECT * INTO v_member
    FROM public.household_members m
    WHERE m.household_id = v_code
      AND lower(m.user_name) = lower(v_user_name)
    ORDER BY m.joined_at
    LIMIT 1;

    IF NOT FOUND THEN
        INSERT INTO public.household_members (household_id, user_name, role)
        VALUES (v_code, v_user_name, 'member')
        RETURNING * INTO v_member;
    END IF;

    PERFORM private.link_device(v_member.id);

    RETURN QUERY SELECT TRUE, v_household_name, NULL::TEXT, v_member.user_name, v_member.role::TEXT;
END;
$$;

-- For installs that joined before devices were linked: links the device to
-- the member it already has stored locally. Unlike join_household it never
-- creates a member, so someone who was removed stays removed. Returns no row
-- when the household or member no longer exists.
CREATE FUNCTION public.claim_household_membership(
    p_household_id TEXT,
    p_user_name TEXT
)
RETURNS TABLE (user_name TEXT, role TEXT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_variable
DECLARE
    v_member public.household_members%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
    END IF;

    SELECT * INTO v_member
    FROM public.household_members m
    WHERE m.household_id = p_household_id
      AND lower(m.user_name) = lower(trim(p_user_name))
    ORDER BY m.joined_at
    LIMIT 1;

    IF NOT FOUND THEN
        RETURN;
    END IF;

    PERFORM private.link_device(v_member.id);

    RETURN QUERY SELECT v_member.user_name, v_member.role::TEXT;
END;
$$;

-- Gives the household a new code. households.id is the code, so this relies
-- on the foreign keys to households(id) cascading updates, as the app's
-- previous direct UPDATE did.
CREATE FUNCTION public.regenerate_household_code(p_household_id TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_code TEXT;
BEGIN
    IF NOT private.is_household_admin(p_household_id) THEN
        RAISE EXCEPTION 'Admin access required' USING ERRCODE = '42501';
    END IF;

    v_code := private.new_household_code();

    UPDATE public.households
    SET id = v_code
    WHERE id = p_household_id;

    RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_household_code(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_household(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_household(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.claim_household_membership(TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regenerate_household_code(TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.validate_household_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_household(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_household(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_household_membership(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_household_code(TEXT) TO authenticated;

-- The old client-side code path; nothing should call it directly any more.
DO $$
BEGIN
    IF to_regprocedure('public.generate_household_code()') IS NOT NULL THEN
        REVOKE ALL ON FUNCTION public.generate_household_code() FROM PUBLIC, anon, authenticated;
    END IF;
END $$;
