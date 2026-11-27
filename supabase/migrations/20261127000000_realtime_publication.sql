-- Publish the tables the app listens to for live updates.
--
-- Supabase Realtime only delivers postgres_changes for tables in the
-- supabase_realtime publication. hooks/useRealtimeUpdates.ts subscribes to
-- plants, events, plant_photos, tags and plant_tags. This used to be a manual
-- dashboard step (see CACHING_SETUP.md), and the dev project had none of these
-- tables published, so changes from other household members never arrived
-- there. Safe to run where some or all of them are already published.

DO $$
DECLARE
    v_table TEXT;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
        CREATE PUBLICATION supabase_realtime;
    END IF;

    FOREACH v_table IN ARRAY ARRAY['plants', 'events', 'plant_photos', 'tags', 'plant_tags'] LOOP
        IF NOT EXISTS (
            SELECT 1
            FROM pg_publication_tables
            WHERE pubname = 'supabase_realtime'
              AND schemaname = 'public'
              AND tablename = v_table
        ) THEN
            EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', v_table);
        END IF;
    END LOOP;
END $$;
