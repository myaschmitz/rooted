-- Propagation lineage.
--
-- Plants form a forest: a cutting/division points at the plant it came from via
-- `plants.parent_plant_id`, and those children can themselves be propagated, so
-- the structure is an arbitrary-depth tree stored as an adjacency list.
--
-- There is deliberately no denormalized `root_plant_id`. Households hold tens
-- to low hundreds of plants, so the app assembles the tree in memory from a
-- single lightweight household-scoped query (see services/PropagationService.ts).
-- That avoids the three triggers a cached root column would need to stay
-- correct, and avoids the "tuple to be deleted was already modified by an
-- operation triggered by the current command" failure that row triggers
-- touching sibling rows hit during multi-row deletes.
--
-- Deleting a mid-tree plant reparents its children onto their grandparent, so a
-- lineage survives losing a cutting. That is done in application code
-- (PropagationService.reparentChildren, called by PlantService.deletePlant) for
-- the same multi-row-delete reason; the FK below is the integrity backstop that
-- turns any orphaned child into a new root rather than a dangling reference.

BEGIN;

-- ---------------------------------------------------------------------------
-- plants: lineage columns
-- ---------------------------------------------------------------------------

ALTER TABLE public.plants
    ADD COLUMN IF NOT EXISTS parent_plant_id UUID,
    ADD COLUMN IF NOT EXISTS propagated_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS propagation_method TEXT;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'plants_parent_plant_id_fkey'
          AND conrelid = 'public.plants'::regclass
    ) THEN
        ALTER TABLE public.plants
            ADD CONSTRAINT plants_parent_plant_id_fkey
            FOREIGN KEY (parent_plant_id)
            REFERENCES public.plants(id)
            ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'plants_parent_not_self_check'
          AND conrelid = 'public.plants'::regclass
    ) THEN
        ALTER TABLE public.plants
            ADD CONSTRAINT plants_parent_not_self_check
            CHECK (parent_plant_id IS NULL OR parent_plant_id <> id);
    END IF;

    -- Keep in sync with PROPAGATION_METHODS in constants/propagation.ts.
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'plants_propagation_method_check'
          AND conrelid = 'public.plants'::regclass
    ) THEN
        ALTER TABLE public.plants
            ADD CONSTRAINT plants_propagation_method_check
            CHECK (propagation_method IS NULL OR propagation_method IN (
                'cutting',
                'division',
                'offset',
                'leaf',
                'seed',
                'air_layer',
                'other'
            ));
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_plants_parent
    ON public.plants (household_id, parent_plant_id);

-- ---------------------------------------------------------------------------
-- Cycle guard
-- ---------------------------------------------------------------------------

-- Rejects a parent assignment that would make a plant its own ancestor, and
-- rejects parents from another household. Runs BEFORE INSERT/UPDATE so a bad
-- write never lands. The recursive walk is bounded so it terminates even if a
-- cycle somehow already exists in the data.
CREATE OR REPLACE FUNCTION public.plants_guard_lineage()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    IF NEW.parent_plant_id IS NULL THEN
        RETURN NEW;
    END IF;

    IF NEW.parent_plant_id = NEW.id THEN
        RAISE EXCEPTION 'A plant cannot be its own parent (plant %)', NEW.id;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.plants p WHERE p.id = NEW.parent_plant_id
    ) THEN
        RAISE EXCEPTION 'Parent plant % does not exist', NEW.parent_plant_id;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM public.plants p
        WHERE p.id = NEW.parent_plant_id
          AND p.household_id IS NOT DISTINCT FROM NEW.household_id
    ) THEN
        RAISE EXCEPTION 'Parent plant % belongs to a different household',
            NEW.parent_plant_id;
    END IF;

    IF EXISTS (
        WITH RECURSIVE ancestors AS (
            SELECT p.id, p.parent_plant_id, 0 AS lvl
            FROM public.plants p
            WHERE p.id = NEW.parent_plant_id

            UNION ALL

            SELECT p.id, p.parent_plant_id, a.lvl + 1
            FROM public.plants p
            JOIN ancestors a ON p.id = a.parent_plant_id
            WHERE a.lvl < 100
        )
        SELECT 1 FROM ancestors WHERE id = NEW.id
    ) THEN
        RAISE EXCEPTION
            'Assigning plant % as a child of % would create a propagation cycle',
            NEW.id, NEW.parent_plant_id;
    END IF;

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS plants_guard_lineage_trigger ON public.plants;
CREATE TRIGGER plants_guard_lineage_trigger
    BEFORE INSERT OR UPDATE OF parent_plant_id, household_id ON public.plants
    FOR EACH ROW
    EXECUTE FUNCTION public.plants_guard_lineage();

-- ---------------------------------------------------------------------------
-- events: link a `propagate` event to the plant it produced
-- ---------------------------------------------------------------------------

ALTER TABLE public.events
    ADD COLUMN IF NOT EXISTS child_plant_id UUID;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'events_child_plant_id_fkey'
          AND conrelid = 'public.events'::regclass
    ) THEN
        ALTER TABLE public.events
            ADD CONSTRAINT events_child_plant_id_fkey
            FOREIGN KEY (child_plant_id)
            REFERENCES public.plants(id)
            ON DELETE SET NULL;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_events_child_plant
    ON public.events (child_plant_id)
    WHERE child_plant_id IS NOT NULL;

-- Add `propagate` to the allowed event types. The constraint name varies by
-- install history, so drop whichever CHECK currently guards event_type before
-- recreating it (same approach as 20260525000000_expand_event_type_constraint).
DO $$
DECLARE
    constraint_record RECORD;
BEGIN
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
        'propagate',
        'other'
    ));

COMMIT;
