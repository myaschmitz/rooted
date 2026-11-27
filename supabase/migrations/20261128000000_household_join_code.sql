-- Give households a join code separate from their id.
--
-- The household id doubled as the code people type to join, so "Generate new
-- invite code" had to change households.id. Every table that stores
-- household_id then had to follow along through its foreign key. On dev those
-- foreign keys don't cascade updates, so regenerating failed for any household
-- with plants or activity. If some tables cascaded and others had no foreign
-- key at all, part of the data would move to the new id and part would be
-- left behind.
--
-- Now households.join_code is the code people share and type, and
-- households.id never changes. Existing households keep their current code:
-- join_code starts out equal to id.

ALTER TABLE public.households ADD COLUMN IF NOT EXISTS join_code TEXT;

UPDATE public.households SET join_code = id WHERE join_code IS NULL;

ALTER TABLE public.households ALTER COLUMN join_code SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS households_join_code_key
    ON public.households (join_code);

-- The app only renames households. Admins can't set the id or the join code
-- directly; a new code comes from regenerate_household_code(), so it is
-- always random.
REVOKE UPDATE ON public.households FROM authenticated;
GRANT UPDATE (name) ON public.households TO authenticated;

-- New codes must not collide with an existing code or with an id that is
-- still someone's original code.
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
        EXIT WHEN NOT EXISTS (
            SELECT 1 FROM public.households
            WHERE id = v_code OR join_code = v_code
        );
    END LOOP;
    RETURN v_code;
END;
$$;

-- Same signatures as before except where noted, so drop and recreate.
DROP FUNCTION IF EXISTS public.validate_household_code(TEXT);
DROP FUNCTION IF EXISTS public.create_household(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.join_household(TEXT, TEXT, TEXT);
DROP FUNCTION IF EXISTS public.regenerate_household_code(TEXT);

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
    WHERE h.join_code = upper(trim(p_code));

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT;
    END IF;
END;
$$;

-- New households get an id and a join code that start out the same, matching
-- existing households. Only the join code ever changes after that.
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

    INSERT INTO public.households (id, name, join_code)
    VALUES (v_code, v_household_name, v_code);

    INSERT INTO public.household_members (household_id, user_name, role)
    VALUES (v_code, v_user_name, 'admin')
    RETURNING id INTO v_member_id;

    PERFORM private.link_device(v_member_id);

    RETURN QUERY SELECT v_code, v_code;
END;
$$;

-- Looks the household up by its join code and now also returns the
-- household's id, which is what the app stores and every table uses.
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
    role TEXT,
    household_id TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
#variable_conflict use_variable
DECLARE
    v_code TEXT := upper(trim(household_code));
    v_user_name TEXT := trim(member_user_name);
    v_household public.households%ROWTYPE;
    v_member public.household_members%ROWTYPE;
BEGIN
    IF auth.uid() IS NULL THEN
        RAISE EXCEPTION 'Not signed in' USING ERRCODE = '28000';
    END IF;
    IF v_user_name = '' THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, 'Please enter your name'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    SELECT * INTO v_household
    FROM public.households h
    WHERE h.join_code = v_code;

    IF NOT FOUND THEN
        RETURN QUERY SELECT FALSE, NULL::TEXT, 'Household code not found'::TEXT, NULL::TEXT, NULL::TEXT, NULL::TEXT;
        RETURN;
    END IF;

    SELECT * INTO v_member
    FROM public.household_members m
    WHERE m.household_id = v_household.id
      AND lower(m.user_name) = lower(v_user_name)
    ORDER BY m.joined_at
    LIMIT 1;

    IF NOT FOUND THEN
        INSERT INTO public.household_members (household_id, user_name, role)
        VALUES (v_household.id, v_user_name, 'member')
        RETURNING * INTO v_member;
    END IF;

    PERFORM private.link_device(v_member.id);

    RETURN QUERY SELECT TRUE, v_household.name, NULL::TEXT, v_member.user_name, v_member.role::TEXT, v_household.id;
END;
$$;

-- Replaces the join code only; the household id and all data stay put.
-- Returns the new code.
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
    SET join_code = v_code
    WHERE id = p_household_id;

    RETURN v_code;
END;
$$;

REVOKE ALL ON FUNCTION public.validate_household_code(TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.create_household(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.join_household(TEXT, TEXT, TEXT) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.regenerate_household_code(TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.validate_household_code(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_household(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.join_household(TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.regenerate_household_code(TEXT) TO authenticated;
