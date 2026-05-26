-- Expand the allowed values for `events.event_type` so the application can
-- record observation events that exist in code (constants/careTypes.ts:
-- CARE_EVENT_TYPES) but were rejected by the original CHECK constraint:
--
--   * new_leaf
--   * relocation
--   * new_roots_spotted
--
-- The original constraint was created inline on `care_events` (see
-- supabase_schema.sql, line 18) and was later inherited as the table was
-- renamed to `events` in 20240904000000_event_name_change_update.sql.
-- Postgres does NOT rename CHECK constraints when a table is renamed, so the
-- existing constraint may be named either `care_events_event_type_check`
-- (legacy) or `events_event_type_check` (fresh installs). We drop whichever
-- exists, then add the new constraint with a stable, deterministic name.

DO $$
DECLARE
    constraint_record RECORD;
BEGIN
    -- Drop any existing CHECK constraint on events.event_type, regardless of
    -- its historical name.
    FOR constraint_record IN
        SELECT con.conname
        FROM pg_constraint con
        JOIN pg_class rel ON rel.oid = con.conrelid
        JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
        JOIN pg_attribute att
          ON att.attrelid = rel.oid
         AND att.attnum = ANY (con.conkey)
        WHERE nsp.nspname = 'public'
          AND rel.relname = 'events'
          AND att.attname = 'event_type'
          AND con.contype = 'c'
    LOOP
        EXECUTE format(
            'ALTER TABLE public.events DROP CONSTRAINT %I',
            constraint_record.conname
        );
    END LOOP;
END $$;

ALTER TABLE public.events
    ADD CONSTRAINT events_event_type_check
    CHECK (event_type IN (
        'water',
        'fertilize',
        'fertigate',
        'repot',
        'prune',
        'pest_spotted',
        'insecticide_spray',
        'new_leaf',
        'relocation',
        'new_roots_spotted',
        'other'
    ));

-- Verification (commented out; uncomment if running manually):
-- SELECT con.conname, pg_get_constraintdef(con.oid)
-- FROM pg_constraint con
-- JOIN pg_class rel ON rel.oid = con.conrelid
-- WHERE rel.relname = 'events' AND con.contype = 'c';
