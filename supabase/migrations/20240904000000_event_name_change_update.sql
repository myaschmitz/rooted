-- Step 1: Drop existing RLS policies (required before renaming table)
DROP POLICY IF EXISTS "Users can view all events" ON care_events;
DROP POLICY IF EXISTS "Users can insert events" ON care_events;
DROP POLICY IF EXISTS "Users can update events" ON care_events;
DROP POLICY IF EXISTS "Users can delete events" ON care_events;

-- Step 2: Rename the table from care_events to events
ALTER TABLE care_events RENAME TO events;

-- Step 3: Rename the indexes to match new table name
ALTER INDEX idx_care_events_plant_id RENAME TO idx_events_plant_id;
ALTER INDEX idx_care_events_date RENAME TO idx_events_date;

-- Step 4: Rename the trigger to match new table name
DROP TRIGGER IF EXISTS update_care_events_updated_at ON events;
CREATE TRIGGER update_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Step 5: Recreate RLS policies with updated names on the new table
CREATE POLICY "Users can view all events" ON events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert events" ON events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update events" ON events FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete events" ON events FOR DELETE USING (auth.role() = 'authenticated');

-- Step 6: Verify the changes
SELECT tablename FROM pg_tables WHERE schemaname = 'public' AND tablename = 'events';
