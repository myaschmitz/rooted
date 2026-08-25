-- Propagation events, seen from the cutting's side.
--
-- 20260824000000 added `events.child_plant_id` so the parent's history could
-- record what came off it. The cutting's own history stayed empty, which is the
-- first place you look to answer "where did this plant come from?".
--
-- That needs its own column rather than reusing `child_plant_id`, whose meaning
-- is directional: on the parent's event it points down to the plant produced, so
-- pointing it up at the parent on the cutting's event would invert it. The two
-- columns are mirror images and exactly one is set on any given event.

BEGIN;

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS parent_plant_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'events_parent_plant_id_fkey'
          AND conrelid = 'public.events'::regclass
    ) THEN
        ALTER TABLE public.events
            ADD CONSTRAINT events_parent_plant_id_fkey
            FOREIGN KEY (parent_plant_id)
            REFERENCES public.plants(id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_events_parent_plant
    ON public.events (parent_plant_id)
    WHERE parent_plant_id IS NOT NULL;

COMMIT;
