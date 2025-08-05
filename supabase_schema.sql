-- Create plants table
CREATE TABLE plants (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    name TEXT,
    type TEXT NOT NULL,
    location TEXT,
    health_status TEXT CHECK (health_status IN ('excellent', 'good', 'okay', 'poor', 'concerning', 'critical')),
    notes TEXT,
    thumbnail_photo_id UUID,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create care_events table
CREATE TABLE care_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('water', 'fertilize', 'fertigate', 'repot', 'prune', 'pest_spotted', 'insecticide_spray', 'other')),
    date TIMESTAMPTZ NOT NULL,
    notes TEXT,
    fertilizer_concentration TEXT,
    fertilizer_amount TEXT,
    pest_severity INTEGER CHECK (pest_severity >= 1 AND pest_severity <= 10),
    health_status TEXT CHECK (health_status IN ('excellent', 'good', 'okay', 'poor', 'concerning', 'critical')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create plant_photos table
CREATE TABLE plant_photos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    file_path TEXT NOT NULL,
    thumbnail_path TEXT,
    caption TEXT,
    taken_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create plant_notes table
CREATE TABLE plant_notes (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plant_id UUID NOT NULL REFERENCES plants(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX idx_care_events_plant_id ON care_events(plant_id);
CREATE INDEX idx_care_events_date ON care_events(date);
CREATE INDEX idx_plant_photos_plant_id ON plant_photos(plant_id);
CREATE INDEX idx_plant_notes_plant_id ON plant_notes(plant_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update updated_at
CREATE TRIGGER update_plants_updated_at BEFORE UPDATE ON plants
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_care_events_updated_at BEFORE UPDATE ON care_events
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plant_photos_updated_at BEFORE UPDATE ON plant_photos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_plant_notes_updated_at BEFORE UPDATE ON plant_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE plants ENABLE ROW LEVEL SECURITY;
ALTER TABLE care_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_photos ENABLE ROW LEVEL SECURITY;
ALTER TABLE plant_notes ENABLE ROW LEVEL SECURITY;

-- Create policies for authenticated users (you can modify these based on your auth requirements)
-- For now, allowing all authenticated users to access all data
CREATE POLICY "Users can view all plants" ON plants FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert plants" ON plants FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update plants" ON plants FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete plants" ON plants FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view all care events" ON care_events FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert care events" ON care_events FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update care events" ON care_events FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete care events" ON care_events FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view all plant photos" ON plant_photos FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert plant photos" ON plant_photos FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update plant photos" ON plant_photos FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete plant photos" ON plant_photos FOR DELETE USING (auth.role() = 'authenticated');

CREATE POLICY "Users can view all plant notes" ON plant_notes FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "Users can insert plant notes" ON plant_notes FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "Users can update plant notes" ON plant_notes FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "Users can delete plant notes" ON plant_notes FOR DELETE USING (auth.role() = 'authenticated');